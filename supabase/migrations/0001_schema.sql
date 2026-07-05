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
