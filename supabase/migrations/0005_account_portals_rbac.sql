-- WapiKe account portals and RBAC.
-- Additive schema for separate regular, business, and administrator accounts.

create extension if not exists pgcrypto;

do $$ begin create type public.account_type as enum ('regular','business','admin');
exception when duplicate_object then null; end $$;
do $$ begin create type public.account_role as enum ('regular_user','business_account','moderator','administrator','super_admin');
exception when duplicate_object then null; end $$;
do $$ begin create type public.account_status as enum ('active','pending_onboarding','suspended','disabled');
exception when duplicate_object then null; end $$;
do $$ begin create type public.business_review_status as enum ('pending_verification','approved','rejected','more_info_requested');
exception when duplicate_object then null; end $$;
do $$ begin create type public.business_claim_status as enum ('pending_verification','approved','rejected','more_info_requested');
exception when duplicate_object then null; end $$;
do $$ begin create type public.business_status as enum ('pending_activation','active','suspended','closed');
exception when duplicate_object then null; end $$;
do $$ begin create type public.verification_document_type as enum ('registration','ownership','identity','other');
exception when duplicate_object then null; end $$;
do $$ begin create type public.admin_invitation_status as enum ('pending','accepted','revoked','expired');
exception when duplicate_object then null; end $$;

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null,
  account_type public.account_type not null,
  role public.account_role not null,
  status public.account_status not null default 'pending_onboarding',
  onboarding_completed boolean not null default false,
  mfa_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ix_accounts_auth_user_id on public.accounts(auth_user_id);

create table if not exists public.business_accounts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid unique references public.accounts(id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  category text not null,
  county text not null,
  city text,
  address text,
  status public.business_status not null default 'pending_activation',
  verification_provider text not null default 'manual',
  verification_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ix_business_accounts_status on public.business_accounts(status);

create table if not exists public.business_applications (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  business_email text not null,
  business_phone text,
  category text not null,
  county text not null,
  city text,
  address text,
  owner_name text not null,
  owner_email text not null,
  owner_phone text,
  notes text,
  status public.business_review_status not null default 'pending_verification',
  reviewed_by_account_id uuid references public.accounts(id) on delete set null,
  reviewed_at timestamptz,
  review_message text,
  created_business_id uuid references public.business_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ix_business_applications_status on public.business_applications(status);

create table if not exists public.business_claims (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_accounts(id) on delete cascade,
  claimant_name text not null,
  claimant_email text not null,
  claimant_phone text,
  message text,
  status public.business_claim_status not null default 'pending_verification',
  reviewed_by_account_id uuid references public.accounts(id) on delete set null,
  reviewed_at timestamptz,
  review_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ix_business_claims_status on public.business_claims(status);

create table if not exists public.verification_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.business_applications(id) on delete cascade,
  claim_id uuid references public.business_claims(id) on delete cascade,
  business_id uuid references public.business_accounts(id) on delete cascade,
  document_type public.verification_document_type not null,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  metadata_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.business_ownership_history (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_accounts(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  action text not null,
  performed_by_account_id uuid references public.accounts(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_invitations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete set null,
  email text not null,
  role text not null,
  status public.admin_invitation_status not null default 'pending',
  invited_by_account_id uuid references public.accounts(id) on delete set null,
  activation_link text,
  expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists ix_admin_invitations_email on public.admin_invitations(email);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_account_id uuid references public.accounts(id) on delete set null,
  action text not null,
  subject_type text not null,
  subject_id uuid,
  metadata_json jsonb,
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array[
    'accounts','business_accounts','business_applications','business_claims'
  ] loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I; '
      'create trigger set_updated_at before update on public.%I '
      'for each row execute function public.set_updated_at();', t, t);
  end loop;
end $$;

-- RLS: public can submit applications/claims. Portal/admin reads and writes
-- should go through trusted server APIs using the service role.
alter table public.accounts enable row level security;
alter table public.business_accounts enable row level security;
alter table public.business_applications enable row level security;
alter table public.business_claims enable row level security;
alter table public.verification_documents enable row level security;
alter table public.business_ownership_history enable row level security;
alter table public.admin_invitations enable row level security;
alter table public.admin_audit_logs enable row level security;

drop policy if exists "own account read" on public.accounts;
create policy "own account read" on public.accounts
  for select using (auth.uid() = auth_user_id);

drop policy if exists "public business read" on public.business_accounts;
create policy "public business read" on public.business_accounts
  for select using (status in ('active','pending_activation'));

drop policy if exists "submit business applications" on public.business_applications;
create policy "submit business applications" on public.business_applications
  for insert with check (true);

drop policy if exists "submit business claims" on public.business_claims;
create policy "submit business claims" on public.business_claims
  for insert with check (true);
