-- One Source Peptides — Research Storefront
-- Migration 0001: schema, RLS, and the server-side pricing gate
--
-- Paste into Supabase → SQL Editor → New query → Run.
-- Safe to run once on a fresh project. Idempotent guards included where cheap.
--
-- Implements: architecture doc §2 (schema) and §3 (pricing gate).

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  organization text,
  researcher_type text not null default 'other'
    check (researcher_type in ('researcher','clinic','university','distributor','other')),
  wholesale_status text not null default 'none'
    check (wholesale_status in ('none','pending','approved','rejected')),
  tos_accepted_at timestamptz,
  age_confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  visible boolean not null default true,   -- false = shell exists, hidden from nav
  sort_order int not null default 0
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  code text not null,
  name text not null,
  category_id uuid references categories(id) on delete set null,
  description text,          -- passive-register copy, per compliance-pack template
  research_summary text,
  price_cents int check (price_cents is null or price_cents >= 0),
  purchasable boolean not null default false,   -- unverified SKUs stay false
  purity_pct numeric(5,2) check (purity_pct is null or (purity_pct > 0 and purity_pct <= 100)),
  image_path text,           -- Supabase Storage path, never base64
  created_at timestamptz not null default now()
);

create table if not exists coa_records (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  batch_lot text not null,
  test_date date,
  purity_pct numeric(5,2),
  test_method text,
  pdf_path text not null,
  is_public boolean not null default true
);

create table if not exists kits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text,
  created_at timestamptz not null default now()
);

create table if not exists kit_items (
  kit_id uuid references kits(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  qty int not null default 1 check (qty > 0),
  primary key (kit_id, product_id)
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending','paid','shipped','cancelled','refunded')),
  is_wholesale boolean not null default false,
  -- non-negotiable: the checkout RUO certification is recorded, never nullable
  ruo_certified_at timestamptz not null,
  total_cents int not null default 0 check (total_cents >= 0),
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id) on delete restrict,
  qty int not null check (qty > 0),
  unit_price_cents int not null,   -- price snapshot; never a live join to products
  primary key (order_id, product_id)
);

create table if not exists wholesale_bulk_skus (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  pack_size int not null check (pack_size > 0),
  wholesale_price_cents int not null check (wholesale_price_cents >= 0)
);

create table if not exists wholesale_applications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  business_name text not null,
  license_number text,
  tax_doc_path text,
  applicant_type text not null
    check (applicant_type in ('clinic','practitioner','distributor','institution')),
  contact_email text not null,
  contact_phone text,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_notes text
);

create index if not exists products_category_idx on products(category_id);
create index if not exists coa_product_idx      on coa_records(product_id);
create index if not exists orders_owner_idx     on orders(owner_id);
create index if not exists kits_owner_idx       on kits(owner_id);

-- ---------------------------------------------------------------------------
-- 2. Auto-create a profile row on signup
--    researcher_type / names come from signup metadata; falls back to 'other'
--    so a malformed signup can never block account creation.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, organization, researcher_type,
                               tos_accepted_at, age_confirmed_at)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'organization',
    coalesce(
      case
        when new.raw_user_meta_data ->> 'researcher_type'
             in ('researcher','clinic','university','distributor','other')
        then new.raw_user_meta_data ->> 'researcher_type'
      end,
      'other'
    ),
    -- compared as text, not cast: a junk metadata value must never break signup
    case when lower(coalesce(new.raw_user_meta_data ->> 'tos_accepted', ''))
              in ('true','t','1','yes') then now() end,
    case when lower(coalesce(new.raw_user_meta_data ->> 'age_confirmed', ''))
              in ('true','t','1','yes') then now() end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 3. Row-Level Security
-- ---------------------------------------------------------------------------

alter table profiles              enable row level security;
alter table categories            enable row level security;
alter table products              enable row level security;
alter table coa_records           enable row level security;
alter table kits                  enable row level security;
alter table kit_items             enable row level security;
alter table orders                enable row level security;
alter table order_items           enable row level security;
alter table wholesale_bulk_skus   enable row level security;
alter table wholesale_applications enable row level security;

-- profiles: owner only. Note wholesale_status is deliberately NOT self-writable
-- (see the column grant in §5) so nobody can approve their own wholesale tier.
drop policy if exists profiles_select_own on profiles;
create policy profiles_select_own on profiles
  for select using (id = auth.uid());

drop policy if exists profiles_update_own on profiles;
create policy profiles_update_own on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- categories: public read
drop policy if exists categories_public_read on categories;
create policy categories_public_read on categories
  for select using (true);

-- products: base table readable only by signed-in users.
-- Logged-out visitors go through products_public (§4), which has no price column.
drop policy if exists products_auth_read on products;
create policy products_auth_read on products
  for select to authenticated using (true);

-- COA library is public per spec §6
drop policy if exists coa_public_read on coa_records;
create policy coa_public_read on coa_records
  for select using (is_public = true);

-- kits / orders: owner only
drop policy if exists kits_owner_all on kits;
create policy kits_owner_all on kits
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists kit_items_owner_all on kit_items;
create policy kit_items_owner_all on kit_items
  for all
  using (exists (select 1 from kits k where k.id = kit_id and k.owner_id = auth.uid()))
  with check (exists (select 1 from kits k where k.id = kit_id and k.owner_id = auth.uid()));

drop policy if exists orders_owner_read on orders;
create policy orders_owner_read on orders
  for select using (owner_id = auth.uid());

-- Orders are created by a server action using the service-role key, so there is
-- deliberately no client-side INSERT policy: a browser can never write a price.

drop policy if exists order_items_owner_read on order_items;
create policy order_items_owner_read on order_items
  for select
  using (exists (select 1 from orders o where o.id = order_id and o.owner_id = auth.uid()));

-- wholesale bulk pricing: approved wholesale accounts only
drop policy if exists wholesale_skus_approved_read on wholesale_bulk_skus;
create policy wholesale_skus_approved_read on wholesale_bulk_skus
  for select to authenticated
  using (exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.wholesale_status = 'approved'
  ));

-- wholesale applications: applicant can read + submit their own; review is server-side
drop policy if exists wholesale_apps_owner_read on wholesale_applications;
create policy wholesale_apps_owner_read on wholesale_applications
  for select using (owner_id = auth.uid());

drop policy if exists wholesale_apps_owner_insert on wholesale_applications;
create policy wholesale_apps_owner_insert on wholesale_applications
  for insert with check (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. The pricing gate (architecture doc §3)
--
-- Enforced by Postgres, not by application code. products_public omits
-- price_cents and purchasable entirely; it runs with the view owner's rights,
-- so anon can read it without any grant on the products table itself.
-- A logged-out request therefore has no SQL path to a price at all.
-- ---------------------------------------------------------------------------

create or replace view products_public
with (security_invoker = false) as
  select p.id, p.slug, p.code, p.name, p.category_id,
         p.description, p.research_summary, p.purity_pct,
         p.image_path, p.created_at,
         c.slug as category_slug, c.name as category_name
  from products p
  left join categories c on c.id = p.category_id;

revoke all on products from anon;
grant select on products_public to anon, authenticated;
grant select on products to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Column-level hardening
--    Stops a signed-in user from promoting themselves to approved wholesale.
-- ---------------------------------------------------------------------------

revoke update on profiles from authenticated;
grant update (full_name, organization, researcher_type,
              tos_accepted_at, age_confirmed_at) on profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Seed categories — all four shells; the empty two stay hidden from nav
--    (spec §10). Flip `visible` to true once real inventory exists.
-- ---------------------------------------------------------------------------

insert into categories (slug, name, visible, sort_order) values
  ('vials',           'Vials',              true,  1),
  ('blends',          'Blends',             true,  2),
  ('capsules-sprays', 'Capsules & Sprays',  false, 3),
  ('bioregulators',   'Bioregulators',      false, 4)
on conflict (slug) do nothing;
