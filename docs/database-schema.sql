-- =============================================================================
-- CONTENT ORGANISER - SUPABASE DATABASE SCHEMA (INTERNAL ONLY)
-- =============================================================================
-- Run in Supabase SQL Editor
-- =============================================================================

-- ---------- Extensions ----------
create extension if not exists pgcrypto; -- gen_random_uuid()

-- =============================================================================
-- 1) ENUM TYPES
-- =============================================================================
do $$ begin
  create type public.content_stage as enum (
    'idea',
    'script',
    'shooting',
    'editing',
    'scheduled',
    'posted'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.content_platform as enum (
    'instagram',
    'youtube',
    'youtube_shorts',
    'tiktok',
    'podcast',
    'twitter',
    'linkedin',
    'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.asset_type as enum (
    'raw_files',
    'inspiration',
    'final_post'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.user_role as enum (
    'admin',
    'editor',
    'viewer'
  );
exception when duplicate_object then null; end $$;

-- =============================================================================
-- 2) PROFILES TABLE (extends Supabase Auth)
-- =============================================================================
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text null,
  role public.user_role not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.email),
    'viewer'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- 3) CATEGORIES TABLE (user-defined, like Jira epics)
-- =============================================================================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#6366f1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  name_ci text generated always as (lower(trim(name))) stored,
  unique (name_ci)
);

-- =============================================================================
-- 4) CONTENT_ITEMS TABLE (core object)
-- =============================================================================
create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),

  title text not null,
  description text null,

  platform public.content_platform not null default 'other',
  category_id uuid null references public.categories(id) on delete set null,
  stage public.content_stage not null default 'idea',

  -- NULL = backlog
  scheduled_date date null,

  -- days needed before scheduled_date to show timeline bar
  timeline_days integer not null default 7 check (timeline_days >= 0 and timeline_days <= 365),

  created_by uuid null references auth.users(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_content_items_scheduled_date on public.content_items (scheduled_date);
create index if not exists idx_content_items_stage on public.content_items (stage);
create index if not exists idx_content_items_platform on public.content_items (platform);
create index if not exists idx_content_items_category on public.content_items (category_id);
create index if not exists idx_content_items_created_at on public.content_items (created_at);

-- =============================================================================
-- 5) ASSETS TABLE (Google Drive links only)
-- =============================================================================
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items(id) on delete cascade,

  type public.asset_type not null,
  url text not null,
  label text null,
  drive_file_id text null, -- optional extracted ID for convenience

  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_assets_content_item on public.assets (content_item_id);
create index if not exists idx_assets_type on public.assets (type);

-- At most 1 final_post per content item
do $$ begin
  create unique index assets_one_final_per_item
  on public.assets (content_item_id)
  where type = 'final_post';
exception when duplicate_object then null; end $$;

-- =============================================================================
-- 6) COMMENTS TABLE (linear)
-- =============================================================================
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items(id) on delete cascade,

  author_id uuid not null references auth.users(id) on delete set null,
  body text not null check (char_length(body) <= 5000),

  created_at timestamptz not null default now()
);

create index if not exists idx_comments_content_item_created on public.comments (content_item_id, created_at);

-- =============================================================================
-- 7) updated_at TRIGGER
-- =============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

drop trigger if exists trg_content_items_updated_at on public.content_items;
create trigger trg_content_items_updated_at
  before update on public.content_items
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 8) RLS + ROLE HELPERS
-- =============================================================================
revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon;

-- Helper: current user's role
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where user_id = auth.uid()
$$;

-- Hard guard: only admins can change roles
create or replace function public.prevent_non_admin_role_change()
returns trigger
language plpgsql
as $$
begin
  if new.role <> old.role and public.current_user_role() <> 'admin' then
    raise exception 'Only admins can change roles';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_role_change on public.profiles;
create trigger trg_prevent_role_change
  before update on public.profiles
  for each row execute function public.prevent_non_admin_role_change();

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.content_items enable row level security;
alter table public.assets enable row level security;
alter table public.comments enable row level security;

-- =============================================================================
-- PROFILES POLICIES
-- =============================================================================
drop policy if exists profiles_select on public.profiles;
create policy profiles_select
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
  on public.profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists profiles_admin_update_all on public.profiles;
create policy profiles_admin_update_all
  on public.profiles for update
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- =============================================================================
-- CATEGORIES POLICIES (admin/editor can write; viewers read-only)
-- =============================================================================
drop policy if exists categories_select on public.categories;
create policy categories_select
  on public.categories for select
  to authenticated
  using (true);

drop policy if exists categories_insert on public.categories;
create policy categories_insert
  on public.categories for insert
  to authenticated
  with check (public.current_user_role() in ('admin','editor'));

drop policy if exists categories_update on public.categories;
create policy categories_update
  on public.categories for update
  to authenticated
  using (public.current_user_role() in ('admin','editor'))
  with check (public.current_user_role() in ('admin','editor'));

drop policy if exists categories_delete on public.categories;
create policy categories_delete
  on public.categories for delete
  to authenticated
  using (public.current_user_role() = 'admin');

-- =============================================================================
-- CONTENT ITEMS POLICIES
-- =============================================================================
drop policy if exists content_items_select on public.content_items;
create policy content_items_select
  on public.content_items for select
  to authenticated
  using (true);

drop policy if exists content_items_insert on public.content_items;
create policy content_items_insert
  on public.content_items for insert
  to authenticated
  with check (public.current_user_role() in ('admin','editor'));

drop policy if exists content_items_update on public.content_items;
create policy content_items_update
  on public.content_items for update
  to authenticated
  using (public.current_user_role() in ('admin','editor'))
  with check (public.current_user_role() in ('admin','editor'));

drop policy if exists content_items_delete on public.content_items;
create policy content_items_delete
  on public.content_items for delete
  to authenticated
  using (public.current_user_role() = 'admin');

-- =============================================================================
-- ASSETS POLICIES
-- =============================================================================
drop policy if exists assets_select on public.assets;
create policy assets_select
  on public.assets for select
  to authenticated
  using (true);

drop policy if exists assets_insert on public.assets;
create policy assets_insert
  on public.assets for insert
  to authenticated
  with check (public.current_user_role() in ('admin','editor'));

drop policy if exists assets_update on public.assets;
create policy assets_update
  on public.assets for update
  to authenticated
  using (public.current_user_role() in ('admin','editor'))
  with check (public.current_user_role() in ('admin','editor'));

drop policy if exists assets_delete on public.assets;
create policy assets_delete
  on public.assets for delete
  to authenticated
  using (public.current_user_role() = 'admin');

-- =============================================================================
-- COMMENTS POLICIES (linear; editors create; optional: only admins delete)
-- =============================================================================
drop policy if exists comments_select on public.comments;
create policy comments_select
  on public.comments for select
  to authenticated
  using (true);

drop policy if exists comments_insert on public.comments;
create policy comments_insert
  on public.comments for insert
  to authenticated
  with check (public.current_user_role() in ('admin','editor'));

drop policy if exists comments_delete on public.comments;
create policy comments_delete
  on public.comments for delete
  to authenticated
  using (public.current_user_role() = 'admin');

-- =============================================================================
-- 9) CLEANUP (SUPABASE-ONLY) - ADMIN-TRIGGERED RPC
-- =============================================================================
create or replace function public.cleanup_old_content(keep_days int default 120)
returns table(deleted_count int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted int := 0;
begin
  if public.current_user_role() <> 'admin' then
    raise exception 'Only admins can run cleanup';
  end if;

  with doomed as (
    select id
    from public.content_items
    where (
      case
        when scheduled_date is not null then scheduled_date::timestamptz
        else created_at
      end
    ) < (now() - make_interval(days => keep_days))
  )
  delete from public.content_items ci
  using doomed d
  where ci.id = d.id;

  get diagnostics v_deleted = row_count;
  return query select v_deleted;
end;
$$;

-- =============================================================================
-- 10) OPTIONAL VIEW
-- =============================================================================
create or replace view public.content_items_view as
select
  ci.*,
  c.name as category_name,
  c.color as category_color
from public.content_items ci
left join public.categories c on ci.category_id = c.id;