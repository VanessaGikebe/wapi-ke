"""Public business-application API (spec: List a New Business).

Unauthenticated: submitting a form creates a ``BusinessApplication`` — it does
**not** create a Supabase Auth account (that happens only on admin approval).
Documents are uploaded straight to Supabase Storage via backend-minted signed
URLs, so a pre-account applicant can attach files without a session.
"""

from __future__ import annotations

import secrets
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.models import (
    ApplicationStatus,
    BusinessApplication,
    BusinessDocument,
    BusinessVerification,
    Category,
    DocumentType,
)
from app.schemas.business import (
    ApplicationCreate,
    ApplicationStatusOut,
    ApplicationSubmitResponse,
    DocumentOut,
    RecordDocumentRequest,
    SignedUploadRequest,
    SignedUploadResponse,
)
from app.services import supabase_admin
from app.services.verification import (
    VerificationRequest,
    get_verification_provider,
)

settings = get_settings()

router = APIRouter(prefix="/applications", tags=["applications"])

# Sensitive documents go to the PRIVATE bucket (admin-only, signed reads).
# Branding images go to the PUBLIC bucket.
_PUBLIC_DOC_TYPES = {DocumentType.business_logo, DocumentType.cover_image}


def _bucket_for(doc_type: DocumentType) -> tuple[str, bool]:
    if doc_type in _PUBLIC_DOC_TYPES:
        return settings.business_media_bucket, False
    return settings.business_docs_bucket, True


def _resolve_category(db: Session, slug: str | None) -> UUID | None:
    if not slug:
        return None
    cat = db.scalar(select(Category).where(Category.slug == slug))
    return cat.id if cat else None


@router.post(
    "",
    response_model=ApplicationSubmitResponse,
    status_code=status.HTTP_201_CREATED,
)
def submit_application(
    payload: ApplicationCreate,
    db: Session = Depends(get_db),
) -> ApplicationSubmitResponse:
    """Submit a new-business application. Stored as pending verification; NO
    auth account is created."""

    application = BusinessApplication(
        business_email=payload.business_email.lower(),
        business_name=payload.business_name,
        business_type=payload.business_type,
        registration_number=payload.registration_number,
        kra_pin=payload.kra_pin,
        year_established=payload.year_established,
        owner_full_name=payload.owner_full_name,
        owner_national_id=payload.owner_national_id,
        owner_phone=payload.owner_phone,
        owner_email=payload.owner_email.lower(),
        county=payload.county,
        town=payload.town,
        physical_address=payload.physical_address,
        lat=payload.lat,
        lng=payload.lng,
        primary_category_id=_resolve_category(db, payload.primary_category_slug),
        secondary_category_id=_resolve_category(
            db, payload.secondary_category_slug
        ),
        status=ApplicationStatus.pending_verification,
    )
    db.add(application)
    db.flush()  # assign id before creating the verification row

    # Run the configured verification provider (manual today). It never raises;
    # a manual provider simply marks the application for human review.
    provider = get_verification_provider()
    result = provider.verify(
        VerificationRequest(
            business_name=payload.business_name,
            business_type=payload.business_type.value,
            registration_number=payload.registration_number,
            kra_pin=payload.kra_pin,
            owner_national_id=payload.owner_national_id,
        )
    )
    db.add(
        BusinessVerification(
            application_id=application.id,
            provider=result.provider,
            status=result.status,
            verified_registration_number=result.verified_registration_number,
            verified_business_name=result.verified_business_name,
            registration_status=result.registration_status,
            verified_business_type=result.verified_business_type,
            registration_date=result.registration_date,
            director_info=result.director_info,
            raw_response=result.raw_response,
            notes=result.notes,
        )
    )
    db.commit()
    db.refresh(application)

    return ApplicationSubmitResponse(
        id=application.id,
        status=application.status,
        message=(
            "Application received. Upload your supporting documents, then our "
            "team will review and verify your business."
        ),
    )


def _get_open_application(db: Session, application_id: UUID) -> BusinessApplication:
    app_row = db.get(BusinessApplication, application_id)
    if app_row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")
    if app_row.status in (
        ApplicationStatus.approved,
        ApplicationStatus.rejected,
    ):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "This application has already been decided.",
        )
    return app_row


@router.post(
    "/{application_id}/documents/sign",
    response_model=SignedUploadResponse,
)
def sign_document_upload(
    application_id: UUID,
    payload: SignedUploadRequest,
    db: Session = Depends(get_db),
) -> SignedUploadResponse:
    """Mint a signed upload URL so the browser can upload one document directly
    to Supabase Storage (private bucket for sensitive docs)."""

    _get_open_application(db, application_id)
    if not supabase_admin.is_configured():
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Document uploads are not configured on the server.",
        )

    bucket, is_private = _bucket_for(payload.doc_type)
    ext = (payload.filename.rsplit(".", 1)[-1] or "bin").lower()[:8]
    path = f"{application_id}/{payload.doc_type.value}-{secrets.token_hex(6)}.{ext}"
    try:
        signed = supabase_admin.create_signed_upload_url(bucket, path)
    except supabase_admin.SupabaseAdminError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc))

    return SignedUploadResponse(
        bucket=bucket,
        path=signed["path"],
        token=signed["token"],
        is_private=is_private,
    )


@router.post(
    "/{application_id}/documents",
    response_model=DocumentOut,
    status_code=status.HTTP_201_CREATED,
)
def record_document(
    application_id: UUID,
    payload: RecordDocumentRequest,
    db: Session = Depends(get_db),
) -> DocumentOut:
    """Record a document row after the browser finished uploading it."""

    _get_open_application(db, application_id)
    # Only accept paths namespaced under this application (defends against a
    # client recording an arbitrary storage path).
    if not payload.storage_path.startswith(f"{application_id}/"):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Document path does not match application."
        )

    doc = BusinessDocument(
        application_id=application_id,
        doc_type=payload.doc_type,
        bucket=payload.bucket,
        storage_path=payload.storage_path,
        original_filename=payload.original_filename,
        content_type=payload.content_type,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return DocumentOut.model_validate(doc)


@router.get("/{application_id}", response_model=ApplicationStatusOut)
def application_status(
    application_id: UUID,
    db: Session = Depends(get_db),
) -> ApplicationStatusOut:
    """Public status echo for the "application received / track status" screen."""

    app_row = db.get(BusinessApplication, application_id)
    if app_row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")
    return ApplicationStatusOut(
        id=app_row.id,
        business_name=app_row.business_name,
        status=app_row.status,
        review_notes=app_row.review_notes,
        created_at=app_row.created_at,
    )
