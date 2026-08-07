-- One Source Peptides — Research Storefront
-- Migration 0004: withdraw BAC Water and WA Water from sale
--
-- Run AFTER 0003. Paste into Supabase → SQL Editor → Run. Safe to re-run.
--
-- Soft-unlisted rather than deleted: the rows and the reason stay on record,
-- it is reversible with one UPDATE, and nothing referencing them (variants,
-- and later order history) is destroyed. Deleting a product that has ever
-- been ordered would tear a hole in the order record.
--
-- Enforcement is entirely in the database — RLS for signed-in users, and the
-- public views for anonymous ones. No application filter is involved, so a
-- caller cannot forget it, and the site behaves correctly both before and
-- after this migration is applied.

-- ---------------------------------------------------------------------------
-- 1. Listing flag
-- ---------------------------------------------------------------------------

alter table products
  add column if not exists listed boolean not null default true,
  add column if not exists unlisted_reason text;

create index if not exists products_listed_idx on products(listed);

comment on column products.listed is
  'false = withdrawn from sale. Hidden by RLS from authenticated reads and '
  'excluded from the public views, so product pages 404 and it cannot be ordered.';

-- ---------------------------------------------------------------------------
-- 2. Withdraw the two water products
-- ---------------------------------------------------------------------------

update products
set listed = false,
    purchasable = false,
    unlisted_reason = 'Withdrawn from sale: bacteriostatic and sterile water are '
                      'regulated separately from research reference materials.'
where slug in ('bac-water', 'wa-water');

-- variants of an unlisted product must not be purchasable either, so a stale
-- variant id submitted to a future checkout still cannot be bought
update product_variants v
set purchasable = false
where exists (
  select 1 from products p where p.id = v.product_id and p.listed = false
);

-- ---------------------------------------------------------------------------
-- 3. Hide withdrawn products from signed-in users via RLS
--
--    0001 granted authenticated a blanket `using (true)` on products. Narrowing
--    it to listed rows means a withdrawn product is invisible to the API for
--    every role, without any query in the application needing to know.
-- ---------------------------------------------------------------------------

drop policy if exists products_auth_read on products;
create policy products_auth_read on products
  for select to authenticated using (listed = true);

drop policy if exists variants_auth_read on product_variants;
create policy variants_auth_read on product_variants
  for select to authenticated using (
    exists (select 1 from products p where p.id = product_id and p.listed = true)
  );

-- ---------------------------------------------------------------------------
-- 4. Public views exclude unlisted products too
-- ---------------------------------------------------------------------------

create or replace view products_public
with (security_invoker = false) as
  select p.id, p.slug, p.code, p.name, p.category_id,
         p.description, p.research_summary, p.purity_pct,
         p.image_path, p.created_at,
         c.slug as category_slug, c.name as category_name
  from products p
  left join categories c on c.id = p.category_id
  where p.listed = true;

create or replace view product_variants_public
with (security_invoker = false) as
  select v.id, v.product_id, v.size_label, v.pack_size, v.sort_order
  from product_variants v
  join products p on p.id = v.product_id
  where p.listed = true;

revoke all on products from anon;
revoke all on product_variants from anon;
grant select on products_public to anon, authenticated;
grant select on product_variants_public to anon, authenticated;
grant select on products to authenticated;
grant select on product_variants to authenticated;

-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------

select p.name, p.slug, p.listed, p.purchasable,
       count(v.id) filter (where v.purchasable) as purchasable_variants
from products p
left join product_variants v on v.product_id = p.id
where p.slug in ('bac-water', 'wa-water')
group by p.name, p.slug, p.listed, p.purchasable;

-- Expected: both rows listed = f, purchasable = f, purchasable_variants = 0

select
  (select count(*) from products)                as products_total,
  (select count(*) from products_public)         as products_listed,
  (select count(*) from product_variants)        as variants_total,
  (select count(*) from product_variants_public) as variants_listed;

-- Expected: 74 total / 72 listed, 145 total / 141 listed
