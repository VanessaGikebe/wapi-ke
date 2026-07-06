"""Public business-claim API (spec: Claim an Existing Business).

Flow: search the catalog → select a listing → submit a claim → upload proof of
ownership. No auth account is created; approval (in the admin portal) is what
creates the Business Account and assigns ownership.
"""

from __future__ import annotations

import secrets
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.config import get_settings
from app.db import get_db
from app.models import (
    BusinessClaim,
    BusinessDocument,
    ClaimStatus,
    DocumentType,
    Experience,
    ListingStatus,
)
from app.schemas.business import (
    RecordDocumentRequest,
    SignedUploadRequest,
    SignedUploadResponse,
    DocumentOut,
)
from app.schemas.claim import (
    BusinessSearchItem,
    ClaimCreate,
    ClaimStatusOut,
    ClaimSubmitResponse,
)
from app.services import supabase_admin

settings = get_settings()

router = APIRouter(prefix="/claims", tags=["claims"])

# Claim documents (ID, ownership proof) are always sensitive → private bucket.
_PUBLIC_DOC_TYPES = {DocumentType.business_logo, DocumentType.cover_image}


def _bucket_for(doc_type: DocumentType) -> tuple[str, bool]:
    if doc_type in _PUBLIC_DOC_TYPES:
        return settings.business_media_bucket, False
    return settings.business_docs_bucket, True


@router.get("/search", response_model=list[BusinessSearchItem])
def search_catalog(
    q: str = Query(min_length=2),
    limit: int = Query(10, ge=1, le=25),
    db: Session = Depends(get_db),
) -> list[BusinessSearchItem]:
    """Search approved catalog listings a claimant can select."""

    rows = db.scalars(
        select(Experience)
        .options(joinedload(Experience.category))
        .where(
            Experience.status == ListingStatus.approved,
            Experience.title.ilike(f"%{q.strip()}%"),
        )
        .order_by(Experience.title)
        .limit(limit)
    ).all()
    return [
        BusinessSearchItem(
            id=e.id,
            title=e.title,
            location=e.location,
            category_slug=e.category.slug,
            image_url=(e.images or [None])[0],
        )
        for e in rows
    ]


@router.post("", response_model=ClaimSubmitResponse, status_code=status.HTTP_201_CREATED)
def submit_claim(
    payload: ClaimCreate,
    db: Session = Depends(get_db),
) -> ClaimSubmitResponse:
    experience = db.get(Experience, payload.experience_id)
    if experience is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Listing not found")

    # Guard against a duplicate pending claim on the same listing by the same
    # person.
    existing = db.scalar(
        select(BusinessClaim).where(
            BusinessClaim.experience_id == payload.experience_id,
            BusinessClaim.claimant_email == payload.claimant_email.lower(),
            BusinessClaim.status == ClaimStatus.pending,
        )
    )
    if existing is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "You already have a pending claim on this listing.",
        )

    claim = BusinessClaim(
        experience_id=payload.experience_id,
        claimant_name=payload.claimant_name,
        claimant_email=payload.claimant_email.lower(),
        claimant_phone=payload.claimant_phone,
        claimant_national_id=payload.claimant_national_id,
        message=payload.message,
        status=ClaimStatus.pending,
    )
    db.add(claim)
    db.commit()
    db.refresh(claim)

    return ClaimSubmitResponse(
        id=claim.id,
        status=claim.status,
        message=(
            "Claim submitted. Upload your proof of ownership, then our team will "
            "review it."
        ),
    )


def _get_open_claim(db: Session, claim_id: UUID) -> BusinessClaim:
    claim = db.get(BusinessClaim, claim_id)
    if claim is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Claim not found")
    if claim.status in (ClaimStatus.approved, ClaimStatus.rejected):
        raise HTTPException(
            status.HTTP_409_CONFLICT, "This claim has already been decided."
        )
    return claim


@router.post("/{claim_id}/documents/sign", response_model=SignedUploadResponse)
def sign_claim_upload(
    claim_id: UUID,
    payload: SignedUploadRequest,
    db: Session = Depends(get_db),
) -> SignedUploadResponse:
    _get_open_claim(db, claim_id)
    if not supabase_admin.is_configured():
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Document uploads are not configured on the server.",
        )
    bucket, is_private = _bucket_for(payload.doc_type)
    ext = (payload.filename.rsplit(".", 1)[-1] or "bin").lower()[:8]
    path = f"{claim_id}/{payload.doc_type.value}-{secrets.token_hex(6)}.{ext}"
    try:
        signed = supabase_admin.create_signed_upload_url(bucket, path)
    except supabase_admin.SupabaseAdminError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc))
    return SignedUploadResponse(
        bucket=bucket, path=signed["path"], token=signed["token"], is_private=is_private
    )


@router.post(
    "/{claim_id}/documents",
    response_model=DocumentOut,
    status_code=status.HTTP_201_CREATED,
)
def record_claim_document(
    claim_id: UUID,
    payload: RecordDocumentRequest,
    db: Session = Depends(get_db),
) -> DocumentOut:
    _get_open_claim(db, claim_id)
    if not payload.storage_path.startswith(f"{claim_id}/"):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Document path does not match claim."
        )
    doc = BusinessDocument(
        claim_id=claim_id,
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


@router.get("/{claim_id}", response_model=ClaimStatusOut)
def claim_status(
    claim_id: UUID,
    db: Session = Depends(get_db),
) -> ClaimStatusOut:
    claim = db.get(BusinessClaim, claim_id)
    if claim is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Claim not found")
    listing = (
        db.get(Experience, claim.experience_id) if claim.experience_id else None
    )
    return ClaimStatusOut(
        id=claim.id,
        listing_title=listing.title if listing else None,
        status=claim.status,
        review_notes=claim.review_notes,
        created_at=claim.created_at,
    )
