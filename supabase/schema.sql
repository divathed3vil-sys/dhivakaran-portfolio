-- ============================================================================
-- DHIVAKARAN PORTFOLIO — Supabase schema + RLS + storage policies
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Idempotent — safe to re-run.
-- ============================================================================

-- ---------- CATEGORIES (Selected Work groupings) ----------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  type text not null check (type in ('book','poster','thumbnail')),
  blurb text,
  priority int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- IMAGES (Selected Work + Visual Lab) ----------
create table if not exists public.images (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  storage_path text,
  public_url text not null,
  label text,
  description text,
  tools text,
  year int,
  client text,
  priority int not null default 0,        -- higher = shown first in Lab + within category
  published boolean not null default false,
  in_lab boolean not null default true,   -- show in the Visual Lab?
  created_at timestamptz not null default now()
);
create index if not exists images_category_id_idx on public.images(category_id);
create index if not exists images_priority_idx on public.images(priority desc);
create index if not exists images_published_idx on public.images(published);
create index if not exists images_in_lab_idx on public.images(in_lab) where in_lab = true;

-- ---------- VIDEOS ----------
create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  url text not null,                       -- embed URL or video id
  platform text not null check (platform in ('youtube','vimeo')),
  label text,
  description text,
  priority int not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists videos_priority_idx on public.videos(priority desc);
create index if not exists videos_published_idx on public.videos(published);

-- ---------- SITE SETTINGS (singleton — one row, id=1) ----------
create table if not exists public.site_settings (
  id int primary key default 1,
  name text not null default 'Dhivakaran M',
  tagline text not null default 'Brands, products & the art in between.',
  about text,
  whatsapp text,
  email text,
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id = 1)
);
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

-- ---------- STORAGE BUCKET ----------
insert into storage.buckets (id, name, public) values ('portfolio', 'portfolio', true)
  on conflict (id) do nothing;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.categories enable row level security;
alter table public.images enable row level security;
alter table public.videos enable row level security;
alter table public.site_settings enable row level security;

-- ---- CATEGORIES: public read; authed full CRUD ----
drop policy if exists "Public read categories" on public.categories;
create policy "Public read categories" on public.categories for select using (true);

drop policy if exists "Authed insert categories" on public.categories;
create policy "Authed insert categories" on public.categories for insert to authenticated with check (true);

drop policy if exists "Authed update categories" on public.categories;
create policy "Authed update categories" on public.categories for update to authenticated using (true);

drop policy if exists "Authed delete categories" on public.categories;
create policy "Authed delete categories" on public.categories for delete to authenticated using (true);

-- ---- IMAGES: public reads only published; authed full CRUD ----
drop policy if exists "Public read published images" on public.images;
create policy "Public read published images" on public.images for select using (published = true);

drop policy if exists "Authed insert images" on public.images;
create policy "Authed insert images" on public.images for insert to authenticated with check (true);

drop policy if exists "Authed update images" on public.images;
create policy "Authed update images" on public.images for update to authenticated using (true);

drop policy if exists "Authed delete images" on public.images;
create policy "Authed delete images" on public.images for delete to authenticated using (true);

-- ---- VIDEOS: public reads only published; authed full CRUD ----
drop policy if exists "Public read published videos" on public.videos;
create policy "Public read published videos" on public.videos for select using (published = true);

drop policy if exists "Authed insert videos" on public.videos;
create policy "Authed insert videos" on public.videos for insert to authenticated with check (true);

drop policy if exists "Authed update videos" on public.videos;
create policy "Authed update videos" on public.videos for update to authenticated using (true);

drop policy if exists "Authed delete videos" on public.videos;
create policy "Authed delete videos" on public.videos for delete to authenticated using (true);

-- ---- SITE SETTINGS: public read; authed update ----
drop policy if exists "Public read settings" on public.site_settings;
create policy "Public read settings" on public.site_settings for select using (true);

drop policy if exists "Authed update settings" on public.site_settings;
create policy "Authed update settings" on public.site_settings for update to authenticated using (true);

-- ---- STORAGE: public read; authed write (portfolio bucket) ----
drop policy if exists "Public read portfolio bucket" on storage.objects;
create policy "Public read portfolio bucket" on storage.objects for select using (bucket_id = 'portfolio');

drop policy if exists "Authed insert portfolio bucket" on storage.objects;
create policy "Authed insert portfolio bucket" on storage.objects for insert to authenticated with check (bucket_id = 'portfolio');

drop policy if exists "Authed update portfolio bucket" on storage.objects;
create policy "Authed update portfolio bucket" on storage.objects for update to authenticated using (bucket_id = 'portfolio');

drop policy if exists "Authed delete portfolio bucket" on storage.objects;
create policy "Authed delete portfolio bucket" on storage.objects for delete to authenticated using (bucket_id = 'portfolio');

-- ============================================================================
-- SEED — default Selected Work categories
-- ============================================================================
insert into public.categories (name, slug, type, blurb, priority) values
  ('Book Covers', 'book-covers', 'book', 'Cover designs and key art for printed and digital books.', 1),
  ('Posters', 'posters', 'poster', 'Poster designs - print, key art, and promotional.', 2),
  ('Thumbnails', 'thumbnails', 'thumbnail', 'Youtube thumbnails - click-through composition.', 3)
  on conflict (slug) do nothing;
