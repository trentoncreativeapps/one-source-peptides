-- One Source Peptides — Research Storefront
-- Migration 0004: withdraw BAC Water and WA Water from sale
--
-- Run AFTER 0003. Paste into Supabase → SQL Editor → Run. Safe to re-run.
--
-- Soft-unlisted rather than deleted: the rows and the reason stay on record,
-- it is reversible with one UPDATE, and nothing referencing them (variants,
-- and later order history) is destroyed. Deleting a product that has ever
-- been ordered would tear a hole in the order record.

-- ---------------------------------------------------------------------------
-- 1. Listing flag
-- ---------------------------------------------------------------------------

alter table products
  add column if not exists listed boolean not null default true,
  add column if not exists unlisted_reason text;

create index if not exists products_listed_idx on products(listed);

comment on column products.listed is
  'false = withdrawn from sale. Excluded from the public views and from every '
  'catalogue query; product pages 404.';

-- ---------------------------------------------------------------------------
-- 2. Withdraw the two water products
-- ---------------------------------------------------------------------------

update products
set listed = false,
    purchasable = false,
    unlisted_reason = 'Withdrawn from sale: bacteriostatic and sterile water are '
                      'regulated separately from research reference materials.'
where slug in ('bac-water', 'wa-water');

-- variants of an unlisted product must not be purchasable either
update product_variants v
set purchasable = false
where exists (
  select 1 from products p where p.id = v.product_id and p.listed = false
);

-- ---------------------------------------------------------------------------
-- 3. Public views exclude unlisted products
--
--    `listed` is exposed on the view (always true there) so the application can
--    use the same .eq('listed', true) filter against either the view or the
--    base table, rather than branching per role and risking one path missing it.
-- ---------------------------------------------------------------------------

create or replace view products_public
with (security_invoker = false) as
  select p.id, p.slug, p.code, p.name, p.category_id,
         p.description, p.research_summary, p.purity_pct,
         p.image_path, p.created_at, p.listed,
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
       count(v.id) as variants,
       count(v.id) filter (where v.purchasable) as purchasable_variants
from products p
left join product_variants v on v.product_id = p.id
where p.slug in ('bac-water', 'wa-water')
group by p.name, p.slug, p.listed, p.purchasable;

-- Expected: both rows listed = f, purchasable = f, purchasable_variants = 0

select
  (select count(*) from products)          as products_total,
  (select count(*) from products_public)   as products_listed,
  (select count(*) from product_variants)          as variants_total,
  (select count(*) from product_variants_public)   as variants_listed;

-- Expected: 74 total / 72 listed, 145 total / 141 listed
