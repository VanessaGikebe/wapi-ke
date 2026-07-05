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
