/**
 * Business onboarding document uploads.
 *
 * A pre-account applicant has no Supabase session, so uploads go through a
 * backend-minted **signed upload URL**: the backend (service role) creates the
 * token, the browser uploads straight to Storage via ``uploadToSignedUrl``, and
 * the backend records the document row. Sensitive docs land in a private bucket.
 */

import { createClient } from "@/lib/supabase/client";
import {
  recordDocument,
  requestUploadUrl,
  type DocumentOut,
  type DocumentType,
} from "@/lib/api/applications";
import {
  recordClaimDocument,
  requestClaimUploadUrl,
} from "@/lib/api/claims";

export const MAX_DOC_BYTES = 10 * 1024 * 1024; // 10 MB
export const ACCEPTED_DOC_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
];
export const DOC_ACCEPT_ATTR = ACCEPTED_DOC_TYPES.join(",");

export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const IMAGE_ACCEPT_ATTR = ACCEPTED_IMAGE_TYPES.join(",");

export function validateDocFile(file: File, imagesOnly = false): string | null {
  const allowed = imagesOnly ? ACCEPTED_IMAGE_TYPES : ACCEPTED_DOC_TYPES;
  if (!allowed.includes(file.type)) {
    return imagesOnly
      ? "Please choose a PNG, JPG, or WebP image."
      : "Please choose a PNG, JPG, WebP, or PDF file.";
  }
  if (file.size > MAX_DOC_BYTES) {
    return "File must be 10 MB or smaller.";
  }
  return null;
}

/**
 * Upload one document for an application and record it. Returns the recorded
 * document row.
 */
export async function uploadBusinessDocument(
  applicationId: string,
  docType: DocumentType,
  file: File,
): Promise<DocumentOut> {
  const signed = await requestUploadUrl(applicationId, {
    doc_type: docType,
    filename: file.name,
    content_type: file.type,
  });

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, file, {
      contentType: file.type,
    });
  if (error) throw new Error(error.message);

  return recordDocument(applicationId, {
    doc_type: docType,
    bucket: signed.bucket,
    storage_path: signed.path,
    original_filename: file.name,
    content_type: file.type,
  });
}

/** Upload one proof-of-ownership document for a business claim. */
export async function uploadClaimDocument(
  claimId: string,
  docType: DocumentType,
  file: File,
): Promise<DocumentOut> {
  const signed = await requestClaimUploadUrl(claimId, {
    doc_type: docType,
    filename: file.name,
    content_type: file.type,
  });

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, file, {
      contentType: file.type,
    });
  if (error) throw new Error(error.message);

  return recordClaimDocument(claimId, {
    doc_type: docType,
    bucket: signed.bucket,
    storage_path: signed.path,
    original_filename: file.name,
    content_type: file.type,
  });
}

