-- =====================================================================
-- WapiKe — business onboarding storage (run in the Supabase SQL editor)
--
-- Two buckets:
--   * business-documents  PRIVATE. Verification docs (ID, registration
--     certificate, permits). Uploaded by *pre-account* applicants via
--     backend-minted signed upload URLs (service role), and read only by
--     admins via backend-minted signed download URLs. No anon/authenticated
--     RLS policy is granted — the service role bypasses RLS to mint tokens,
--     so the browser never needs a session or the secret key.
--   * business-media      PUBLIC. Business logos & cover images (safe to
--     serve publicly). Also written via signed upload URLs during the
--     application, then owner-folder writes once the account is live.
-- =====================================================================

-- --- Private documents bucket ---------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-documents', 'business-documents', false, 10485760,
  array['image/png','image/jpeg','image/webp','application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/png','image/jpeg','image/webp','application/pdf'];

-- Deliberately NO public/anon/authenticated policies on this bucket:
-- all reads and writes are brokered by the backend service role. Remove any
-- stale permissive policies from earlier experiments.
drop policy if exists "business docs public read" on storage.objects;
drop policy if exists "business docs insert" on storage.objects;

-- --- Public media bucket (logos / covers) ---------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-media', 'business-media', true, 5242880,
  array['image/png','image/jpeg','image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/png','image/jpeg','image/webp'];

-- Public read for media.
drop policy if exists "business media public read" on storage.objects;
create policy "business media public read" on storage.objects
  for select using (bucket_id = 'business-media');

-- Once a business account is live, its owner may manage media inside a folder
-- named after their user id (pre-account uploads use signed URLs / service role).
drop policy if exists "business media insert own" on storage.objects;
create policy "business media insert own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'business-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "business media update own" on storage.objects;
create policy "business media update own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'business-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "business media delete own" on storage.objects;
create policy "business media delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'business-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
