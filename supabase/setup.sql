-- ============================================================
-- WapiKe — full Supabase setup (paste ALL of this into the
-- Supabase SQL Editor and click RUN). Safe to re-run.
-- ============================================================

-- =====================================================================
-- WapiKe — core schema (run 1st, in the Supabase SQL editor)
-- Normalized, UUID PKs, FKs, indexes, timestamps. Idempotent-ish (IF NOT
-- EXISTS where practical) so it is safe to re-run during setup.
-- =====================================================================

create extension if not exists pgcrypto;      -- gen_random_uuid()

-- Shared updated_at trigger ------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Enums --------------------------------------------------------------------
do $$ begin
  create type public.event_status as enum ('upcoming','ongoing','ended','archived');
exception when duplicate_object then null; end $$;

-- =====================================================================
-- Identity / profile
-- =====================================================================
create table if not exists public.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  full_name            text,
  username             text unique,
  avatar_url           text,
  email                text,
  onboarding_completed boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  favorite_categories text[] not null default '{}',
  home_county         text,
  email_notifications boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- =====================================================================
-- Geography
-- =====================================================================
create table if not exists public.counties (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  code       text,
  created_at timestamptz not null default now()
);

create table if not exists public.cities (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  county_id  uuid references public.counties(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (name, county_id)
);
create index if not exists ix_cities_county on public.cities(county_id);

-- =====================================================================
-- Taxonomy
-- =====================================================================
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  icon        text,
  description text,
  hero_image  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.tags (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- Businesses + places (restaurants, experiences, picnics, nightlife,
-- activities, travel destinations — all live in `places`, typed by category)
-- =====================================================================
create table if not exists public.businesses (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  website    text,
  phone      text,
  email      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.places (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  description   text,
  category_id   uuid references public.categories(id) on delete set null,
  business_id   uuid references public.businesses(id) on delete set null,
  city_id       uuid references public.cities(id) on delete set null,
  county_id     uuid references public.counties(id) on delete set null,
  address       text,
  neighborhood  text,
  latitude      double precision,
  longitude     double precision,
  phone         text,
  website       text,
  price_tier    smallint,
  price_label   text,
  rating        numeric(2,1),
  reviews_count integer not null default 0,
  image_url     text,
  attributes    jsonb not null default '{}'::jsonb,
  status        text not null default 'active',
  source        text,
  source_uid    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (source, source_uid)
);
create index if not exists ix_places_category on public.places(category_id);
create index if not exists ix_places_county   on public.places(county_id);
create index if not exists ix_places_city     on public.places(city_id);
create index if not exists ix_places_rating    on public.places(rating);
create index if not exists ix_places_status    on public.places(status);
create index if not exists ix_places_attributes on public.places using gin (attributes);

create table if not exists public.place_images (
  id         uuid primary key default gen_random_uuid(),
  place_id   uuid not null references public.places(id) on delete cascade,
  url        text not null,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists ix_place_images_place on public.place_images(place_id);

create table if not exists public.place_tags (
  place_id uuid not null references public.places(id) on delete cascade,
  tag_id   uuid not null references public.tags(id) on delete cascade,
  primary key (place_id, tag_id)
);
create index if not exists ix_place_tags_tag on public.place_tags(tag_id);

-- =====================================================================
-- Events
-- =====================================================================
create table if not exists public.events (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  title          text not null,
  description    text,
  category       text,
  venue          text,
  county_id      uuid references public.counties(id) on delete set null,
  city_id        uuid references public.cities(id) on delete set null,
  county         text,
  city           text,
  address        text,
  latitude       double precision,
  longitude      double precision,
  image_url      text,
  organizer      text,
  contact        text,
  ticket_url     text,
  ticket_price   numeric(10,2),
  currency       text not null default 'KES',
  start_datetime timestamptz not null,
  end_datetime   timestamptz,
  featured       boolean not null default false,
  status         public.event_status not null default 'upcoming',
  source         text,
  source_uid     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (source, source_uid)
);
create index if not exists ix_events_start    on public.events(start_datetime);
create index if not exists ix_events_status   on public.events(status);
create index if not exists ix_events_featured on public.events(featured);
create index if not exists ix_events_county   on public.events(county);

-- =====================================================================
-- User activity: favorites, saved events, reviews, recently viewed
-- =====================================================================
create table if not exists public.favorites (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  place_id   uuid not null references public.places(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, place_id)
);
create index if not exists ix_favorites_user on public.favorites(user_id);

create table if not exists public.saved_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  event_id   uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, event_id)
);
create index if not exists ix_saved_events_user on public.saved_events(user_id);

create table if not exists public.reviews (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  place_id   uuid not null references public.places(id) on delete cascade,
  rating     smallint not null check (rating between 1 and 5),
  body       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, place_id)
);
create index if not exists ix_reviews_place on public.reviews(place_id);
create index if not exists ix_reviews_user  on public.reviews(user_id);

create table if not exists public.recently_viewed (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  place_id  uuid references public.places(id) on delete cascade,
  event_id  uuid references public.events(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  check (place_id is not null or event_id is not null)
);
create index if not exists ix_recently_viewed_user on public.recently_viewed(user_id, viewed_at desc);

-- =====================================================================
-- updated_at triggers
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','user_preferences','categories','businesses',
    'places','events','reviews'
  ] loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I; '
      'create trigger set_updated_at before update on public.%I '
      'for each row execute function public.set_updated_at();', t, t);
  end loop;
end $$;

-- =====================================================================
-- WapiKe — Row Level Security (run 2nd)
--
-- Content tables (places, events, categories, …): PUBLIC read, no public
-- writes (writes happen via the service-role key, which bypasses RLS).
-- User-owned tables: users see/modify only their own rows. Reviews & profiles
-- are publicly readable so authors can be shown.
-- =====================================================================

-- ---- Public-read content tables -----------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'counties','cities','categories','tags','businesses',
    'places','place_images','place_tags','events'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "public read" on public.%I;', t);
    execute format('create policy "public read" on public.%I for select using (true);', t);
  end loop;
end $$;

-- ---- profiles: public read, owner write ---------------------------------
alter table public.profiles enable row level security;
drop policy if exists "profiles are public"        on public.profiles;
drop policy if exists "insert own profile"         on public.profiles;
drop policy if exists "update own profile"         on public.profiles;
create policy "profiles are public" on public.profiles for select using (true);
create policy "insert own profile"  on public.profiles for insert with check (auth.uid() = id);
create policy "update own profile"  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---- user_preferences: owner only ---------------------------------------
alter table public.user_preferences enable row level security;
drop policy if exists "own preferences" on public.user_preferences;
create policy "own preferences" on public.user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- favorites: owner only ----------------------------------------------
alter table public.favorites enable row level security;
drop policy if exists "own favorites" on public.favorites;
create policy "own favorites" on public.favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- saved_events: owner only -------------------------------------------
alter table public.saved_events enable row level security;
drop policy if exists "own saved events" on public.saved_events;
create policy "own saved events" on public.saved_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- recently_viewed: owner only ----------------------------------------
alter table public.recently_viewed enable row level security;
drop policy if exists "own recently viewed" on public.recently_viewed;
create policy "own recently viewed" on public.recently_viewed
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- reviews: public read, owner insert/update/delete -------------------
alter table public.reviews enable row level security;
drop policy if exists "reviews are public"  on public.reviews;
drop policy if exists "insert own review"   on public.reviews;
drop policy if exists "update own review"   on public.reviews;
drop policy if exists "delete own review"   on public.reviews;
create policy "reviews are public" on public.reviews for select using (true);
create policy "insert own review"  on public.reviews for insert with check (auth.uid() = user_id);
create policy "update own review"  on public.reviews for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own review"  on public.reviews for delete using (auth.uid() = user_id);

-- =====================================================================
-- WapiKe — automatic profile creation (run 3rd)
--
-- On every new auth.users row (email signup OR Google OAuth), create a
-- matching public.profiles row + a user_preferences row. SECURITY DEFINER so
-- it runs with owner privileges (bypasses RLS). full_name / avatar come from
-- the OAuth/email metadata when present.
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    )
  )
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any users that already exist (safe to re-run).
insert into public.profiles (id, email, full_name, avatar_url)
select u.id, u.email,
       coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
       coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')
from auth.users u
on conflict (id) do nothing;

insert into public.user_preferences (user_id)
select id from auth.users
on conflict (user_id) do nothing;
