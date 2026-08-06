-- One Source Peptides — Research Storefront
-- Migration 0002: dose variants + full supplier catalogue
--
-- Run AFTER 0001_init.sql. Paste into Supabase → SQL Editor → Run.
--
-- WHY THIS ADDS A TABLE:
--   architecture §2 models one product = one price. The real line is
--   74 products across 145 dose sizes (Tirzepatide alone has 10),
--   so size has to be its own row or the catalogue can't be represented and
--   an order can't record which size was bought. Done now, before any data
--   exists, this is free; after launch it is a migration with live orders.
--
-- Prices are intentionally NOT loaded. The supplier sheet's retail/wholesale
-- columns are cost data, deliberately excluded. purchasable stays false until
-- One Source sets its own prices.

-- ---------------------------------------------------------------------------
-- 1. Dose variants
-- ---------------------------------------------------------------------------

create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  size_label text not null,                 -- '5mg', '600mg / 10ml', '3000iu'
  price_cents int check (price_cents is null or price_cents >= 0),
  purchasable boolean not null default false,
  pack_size int not null default 10,        -- vials per box, per supplier sheet
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (product_id, size_label)
);

create index if not exists variants_product_idx on product_variants(product_id);

-- price_cents on products is now redundant: pricing lives per size.
-- Kept nullable rather than dropped so nothing referencing it breaks.
comment on column products.price_cents is
  'DEPRECATED — pricing is per size in product_variants.price_cents';
comment on column products.purchasable is
  'DEPRECATED — purchasability is per size in product_variants.purchasable';

-- ---------------------------------------------------------------------------
-- 2. Repoint carts/orders at variants
--    You buy "Tirzepatide 30mg", not "Tirzepatide". Both tables are empty at
--    this point, so this is a clean swap.
-- ---------------------------------------------------------------------------

alter table kit_items  drop constraint if exists kit_items_pkey;
alter table kit_items  drop column if exists product_id;
alter table kit_items  add column if not exists variant_id uuid references product_variants(id) on delete cascade;
alter table kit_items  add primary key (kit_id, variant_id);

alter table order_items drop constraint if exists order_items_pkey;
alter table order_items drop column if exists product_id;
alter table order_items add column if not exists variant_id uuid references product_variants(id) on delete restrict;
alter table order_items add primary key (order_id, variant_id);

alter table wholesale_bulk_skus drop column if exists product_id;
alter table wholesale_bulk_skus add column if not exists variant_id uuid references product_variants(id) on delete cascade;

-- ---------------------------------------------------------------------------
-- 3. Extend the pricing gate to variants
--    Same rule as products: anon gets a view with no price column at all.
-- ---------------------------------------------------------------------------

alter table product_variants enable row level security;

drop policy if exists variants_auth_read on product_variants;
create policy variants_auth_read on product_variants
  for select to authenticated using (true);

create or replace view product_variants_public
with (security_invoker = false) as
  select v.id, v.product_id, v.size_label, v.pack_size, v.sort_order
  from product_variants v;

revoke all on product_variants from anon;
grant select on product_variants_public to anon, authenticated;
grant select on product_variants to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Seed: 74 products
--    research_summary, purity_pct and image_path are left NULL on purpose —
--    see the notes at the foot of this file.
-- ---------------------------------------------------------------------------

with incoming (slug, code, name, cat_slug, description, sort_order) as (
  values
  ('tirzepatide', 'TIRZEPATIDE', 'Tirzepatide', 'vials', 'Dual GIP / GLP-1 receptor agonist peptide. Lyophilised powder for in-vitro receptor and metabolic pathway studies.', 1),
  ('semaglutide', 'SEMAGLUTIDE', 'Semaglutide', 'vials', 'GLP-1 receptor agonist peptide supplied as lyophilised powder for laboratory receptor-binding research.', 2),
  ('retatrutide', 'RETATRUTIDE', 'Retatrutide', 'vials', 'Triple GIP / GLP-1 / glucagon receptor agonist peptide for in-vitro metabolic signalling research.', 3),
  ('survodutide', 'SURVODUTIDE', 'Survodutide', 'vials', 'Dual glucagon / GLP-1 receptor agonist peptide for laboratory receptor characterisation studies.', 4),
  ('mazdutide', 'MAZDUTIDE', 'Mazdutide', 'vials', 'Dual GLP-1 / glucagon receptor agonist peptide supplied as lyophilised powder for research use.', 5),
  ('cagrilintide', 'CAGRILINTIDE', 'Cagrilintide', 'vials', 'Long-acting amylin analogue peptide for in-vitro amylin receptor research.', 6),
  ('cagrilintide-5mg-plus-semaglutide-5mg', 'CAGRI+SEMA', 'Cagrilintide 5mg + Semaglutide 5mg', 'blends', 'Co-formulated amylin analogue and GLP-1 receptor agonist blend for comparative in-vitro study.', 7),
  ('retatrutide-20mg-plus-tirzepatide-40mg', 'RETA+TIRZ', 'Retatrutide 20mg + Tirzepatide 40mg', 'blends', 'Co-formulated multi-receptor agonist blend supplied for laboratory research applications.', 8),
  ('adipotide', 'ADIPOTIDE', 'Adipotide', 'vials', 'Proapoptotic peptidomimetic studied in vascular and adipose tissue research models.', 9),
  ('aod-9604', 'AOD-9604', 'AOD-9604', 'vials', 'Modified fragment of the human growth hormone C-terminus, used in metabolic research.', 10),
  ('5-amino-1mq', '5-AMINO-1MQ', '5-Amino-1MQ', 'vials', 'Small-molecule NNMT inhibitor supplied for in-vitro enzymatic and metabolic research.', 11),
  ('aicar', 'AICAR', 'AICAR', 'vials', 'AMP-activated protein kinase activator used in cellular energy-metabolism research.', 12),
  ('cjc-1295-with-dac', 'CJC-1295-DAC', 'CJC-1295 with DAC', 'vials', 'GHRH analogue with drug affinity complex, supplied for in-vitro endocrine research.', 13),
  ('cjc-1295-without-dac', 'CJC-1295', 'CJC-1295 without DAC', 'vials', 'Modified GRF (1-29) GHRH analogue for laboratory receptor-signalling studies.', 14),
  ('cjc-1295-no-dac-5mg-plus-ipamorelin-5mg', 'CP10', 'CJC-1295 no DAC 5mg + Ipamorelin 5mg', 'blends', 'Co-formulated GHRH analogue and ghrelin receptor agonist blend for comparative research.', 15),
  ('ipamorelin', 'IPAMORELIN', 'Ipamorelin', 'vials', 'Selective ghrelin receptor (GHS-R1a) agonist pentapeptide for in-vitro research.', 16),
  ('sermorelin-acetate', 'SERMORELIN-ACETATE', 'Sermorelin Acetate', 'vials', 'GHRH (1-29) analogue supplied as lyophilised powder for endocrine research.', 17),
  ('tesamorelin', 'TESAMORELIN', 'Tesamorelin', 'vials', 'Stabilised GHRH analogue for laboratory receptor and signalling studies.', 18),
  ('ghrp-2-acetate', 'GHRP-2-ACETATE', 'GHRP-2 Acetate', 'vials', 'Growth hormone releasing peptide-2, a synthetic ghrelin receptor agonist for research.', 19),
  ('ghrp-6-acetate', 'GHRP-6-ACETATE', 'GHRP-6 Acetate', 'vials', 'Growth hormone releasing peptide-6 supplied for in-vitro receptor research.', 20),
  ('mgf', 'MGF', 'MGF', 'vials', 'Mechano growth factor, an IGF-1 splice variant peptide, for cell-culture research.', 21),
  ('peg-mgf', 'PEG-MGF', 'PEG-MGF', 'vials', 'PEGylated mechano growth factor analogue for extended in-vitro stability studies.', 22),
  ('igf-1-lr3', 'IGF-1-LR3', 'IGF-1 LR3', 'vials', 'Long R3 insulin-like growth factor-1 analogue widely used as a cell-culture supplement.', 23),
  ('ace-031', 'ACE-031', 'ACE-031', 'vials', 'Soluble activin receptor type IIB fusion protein for myostatin-pathway research.', 24),
  ('hmg', 'HMG', 'HMG', 'vials', 'Human menopausal gonadotropin reference material for laboratory endocrine research.', 25),
  ('epo', 'EPO', 'EPO', 'vials', 'Erythropoietin reference material supplied strictly for in-vitro laboratory research.', 26),
  ('gonadorelin-acetate', 'GONADORELIN-ACETATE', 'Gonadorelin Acetate', 'vials', 'GnRH decapeptide supplied as lyophilised powder for receptor research.', 27),
  ('kisspeptin-10', 'KISSPEPTIN-10', 'Kisspeptin-10', 'vials', 'KISS1-derived decapeptide, a GPR54 receptor ligand, for neuroendocrine research.', 28),
  ('adamax', 'ADAMAX', 'Adamax', 'vials', 'Research peptide analogue supplied as lyophilised powder for laboratory evaluation.', 29),
  ('bpc-157', 'BPC-157', 'BPC-157', 'vials', 'Synthetic pentadecapeptide derived from a gastric protein sequence, for tissue-model research.', 30),
  ('tb-500', 'TB-500', 'TB-500', 'vials', 'Synthetic fragment of thymosin beta-4, used in cytoskeletal and cell-migration research.', 31),
  ('bpc-157-5mg-plus-tb-500-5mg-bb10', 'BB10', 'BPC-157 5mg + TB-500 5mg (BB10)', 'blends', 'Co-formulated peptide blend supplied for comparative in-vitro tissue research.', 32),
  ('bpc-157-10mg-plus-tb-500-10mg-bb20', 'BB20', 'BPC-157 10mg + TB-500 10mg (BB20)', 'blends', 'Higher-load co-formulated peptide blend for laboratory research applications.', 33),
  ('thymosin-alpha-1', 'THYMOSIN-ALPHA-1', 'Thymosin Alpha-1', 'vials', '28-amino-acid thymic peptide used in immunological cell-culture research.', 34),
  ('thymalin', 'THYMALIN', 'Thymalin', 'bioregulators', 'Thymus-derived peptide preparation supplied for in-vitro immunology research.', 35),
  ('kpv', 'KPV', 'KPV', 'vials', 'Tripeptide C-terminal fragment of alpha-MSH for inflammation-pathway research.', 36),
  ('ll-37', 'LL-37', 'LL-37', 'vials', 'Human cathelicidin antimicrobial peptide for microbiological and immunology research.', 37),
  ('ara-290', 'ARA-290', 'ARA-290', 'vials', 'Erythropoietin-derived 11-amino-acid peptide for innate repair receptor research.', 38),
  ('pnc-27', 'PNC-27', 'PNC-27', 'vials', 'p53-derived peptide studied in cancer cell-line membrane research.', 39),
  ('foxo4-dri', 'FOXO4-DRI', 'FOXO4-DRI', 'vials', 'Retro-inverso FOXO4 peptide used in cellular senescence research.', 40),
  ('epithalon', 'EPITHALON', 'Epithalon', 'bioregulators', 'Synthetic tetrapeptide (Ala-Glu-Asp-Gly) used in telomerase and ageing research.', 41),
  ('mots-c', 'MOTS-C', 'MOTS-c', 'vials', 'Mitochondrial-derived 16-amino-acid peptide for metabolic and mitochondrial research.', 42),
  ('ss-31', 'SS-31', 'SS-31', 'vials', 'Mitochondria-targeted tetrapeptide (elamipretide) for cardiolipin-interaction research.', 43),
  ('nad-plus', 'NAD+', 'NAD+', 'vials', 'Nicotinamide adenine dinucleotide, a coenzyme reference material for redox research.', 44),
  ('pinealon', 'PINEALON', 'Pinealon', 'bioregulators', 'Short peptide bioregulator supplied for neurological cell-culture research.', 45),
  ('selank', 'SELANK', 'Selank', 'vials', 'Synthetic heptapeptide derived from tuftsin, for neuropeptide research.', 46),
  ('semax', 'SEMAX', 'Semax', 'vials', 'Synthetic ACTH (4-10) analogue peptide for neurochemical research.', 47),
  ('dsip', 'DSIP', 'DSIP', 'vials', 'Delta sleep-inducing peptide, a nonapeptide used in neuroendocrine research.', 48),
  ('p21-p021', 'P21', 'P21 (P021)', 'vials', 'CNTF-derived peptidomimetic compound for neurogenesis research models.', 49),
  ('pe-22-28', 'PE-22-28', 'PE-22-28', 'vials', 'Spadin analogue peptide, a TREK-1 channel blocker, for neuroscience research.', 50),
  ('vip', 'VIP', 'VIP', 'vials', 'Vasoactive intestinal peptide, a 28-amino-acid neuropeptide, for receptor research.', 51),
  ('melatonin', 'MELATONIN', 'Melatonin', 'vials', 'Indoleamine reference material supplied for circadian-rhythm laboratory research.', 52),
  ('oxytocin-acetate', 'OXYTOCIN-ACETATE', 'Oxytocin Acetate', 'vials', 'Nonapeptide hormone reference material for receptor-binding research.', 53),
  ('melanotan-1-mt-1', 'MT-1', 'Melanotan-1 (MT-1)', 'vials', 'Afamelanotide, an alpha-MSH analogue, for melanocortin receptor research.', 54),
  ('melanotan-2-mt-2', 'MT-2', 'Melanotan-2 (MT-2)', 'vials', 'Cyclic alpha-MSH analogue peptide for in-vitro melanocortin receptor studies.', 55),
  ('pt-141', 'PT-141', 'PT-141', 'vials', 'Bremelanotide, a melanocortin receptor agonist peptide, for laboratory research.', 56),
  ('ghk-cu', 'GHK-CU', 'GHK-Cu', 'vials', 'Copper tripeptide-1 complex widely used in dermatological and cell-culture research.', 57),
  ('ahk-cu', 'AHK-CU', 'AHK-Cu', 'vials', 'Copper tripeptide complex supplied as lyophilised powder for skin-model research.', 58),
  ('snap-8', 'SNAP-8', 'SNAP-8', 'vials', 'Acetyl octapeptide-3, a SNARE-complex research peptide for dermatological study.', 59),
  ('matrixyl', 'MATRIXYL', 'Matrixyl', 'vials', 'Palmitoyl pentapeptide-4 supplied for extracellular-matrix research.', 60),
  ('glow', 'GLOW', 'GLOW', 'blends', 'Co-formulated peptide blend supplied for laboratory dermatological research.', 61),
  ('klow', 'KLOW', 'Klow', 'blends', 'Co-formulated multi-peptide research blend supplied as lyophilised powder.', 62),
  ('bac-water', 'BAC-WATER', 'BAC Water', 'vials', 'Bacteriostatic water, a laboratory diluent for reconstituting lyophilised research powders.', 63),
  ('wa-water', 'WA-WATER', 'WA Water', 'vials', 'Sterile water for laboratory reconstitution of lyophilised research materials.', 64),
  ('glutathione', 'GLUTATHIONE', 'Glutathione', 'vials', 'Tripeptide antioxidant reference material for redox and oxidative-stress research.', 65),
  ('l-carnitine', 'L-CARNITINE', 'L-Carnitine', 'vials', 'Quaternary ammonium compound reference material for fatty-acid transport research.', 66),
  ('lipo-c', 'LIPO-C', 'Lipo-C', 'blends', 'Lipotropic compound blend supplied as a laboratory reference preparation.', 67),
  ('mic-lipo-c-with-b12', 'MIC', 'MIC (Lipo-C with B12)', 'blends', 'Methionine / inositol / choline blend with cyanocobalamin, for laboratory reference use.', 68),
  ('b12', 'B12', 'B12', 'vials', 'Cyanocobalamin reference material supplied for laboratory research applications.', 69),
  ('fat-blaster', 'FAT-BLASTER', 'Fat Blaster', 'blends', 'Co-formulated lipotropic research blend supplied in solution.', 70),
  ('lemon-bottle', 'LEMON-BOTTLE', 'Lemon Bottle', 'blends', 'Co-formulated lipolytic research solution supplied for laboratory evaluation.', 71),
  ('hair-skin-nails-blend', 'HAIR-SKIN-NAILS', 'Hair, Skin & Nails Blend', 'blends', 'Co-formulated peptide and vitamin research blend supplied in solution.', 72),
  ('super-human-blend', 'SUPER-HUMAN-BLEND', 'Super Human Blend', 'blends', 'Co-formulated multi-component research blend supplied in solution.', 73),
  ('relaxation-pm', 'RELAXATION-PM', 'Relaxation PM', 'blends', 'Co-formulated research blend supplied in solution for laboratory evaluation.', 74)
)
insert into products (slug, code, name, category_id, description, purchasable, price_cents)
select i.slug, i.code, i.name, c.id, i.description, false, null
from incoming i
join categories c on c.slug = i.cat_slug
on conflict (slug) do update
  set code        = excluded.code,
      name        = excluded.name,
      category_id = excluded.category_id,
      description = excluded.description;

-- ---------------------------------------------------------------------------
-- 5. Seed: 145 dose variants
-- ---------------------------------------------------------------------------

with incoming (product_slug, size_label, sort_order) as (
  values
  ('tirzepatide', '5mg', 1),
  ('tirzepatide', '10mg', 2),
  ('tirzepatide', '15mg', 3),
  ('tirzepatide', '20mg', 4),
  ('tirzepatide', '30mg', 5),
  ('tirzepatide', '40mg', 6),
  ('tirzepatide', '50mg', 7),
  ('tirzepatide', '60mg', 8),
  ('tirzepatide', '100mg', 9),
  ('tirzepatide', '120mg', 10),
  ('semaglutide', '2mg', 1),
  ('semaglutide', '5mg', 2),
  ('semaglutide', '10mg', 3),
  ('semaglutide', '15mg', 4),
  ('semaglutide', '20mg', 5),
  ('semaglutide', '30mg', 6),
  ('retatrutide', '5mg', 1),
  ('retatrutide', '10mg', 2),
  ('retatrutide', '15mg', 3),
  ('retatrutide', '20mg', 4),
  ('retatrutide', '30mg', 5),
  ('retatrutide', '40mg', 6),
  ('retatrutide', '50mg', 7),
  ('retatrutide', '60mg', 8),
  ('survodutide', '5mg', 1),
  ('survodutide', '10mg', 2),
  ('mazdutide', '5mg', 1),
  ('mazdutide', '10mg', 2),
  ('cagrilintide', '2mg', 1),
  ('cagrilintide', '5mg', 2),
  ('cagrilintide', '10mg', 3),
  ('cagrilintide-5mg-plus-semaglutide-5mg', '10mg', 1),
  ('retatrutide-20mg-plus-tirzepatide-40mg', '60mg', 1),
  ('adipotide', '2mg', 1),
  ('adipotide', '5mg', 2),
  ('aod-9604', '5mg', 1),
  ('aod-9604', '10mg', 2),
  ('5-amino-1mq', '5mg', 1),
  ('5-amino-1mq', '10mg', 2),
  ('5-amino-1mq', '50mg', 3),
  ('aicar', '50mg', 1),
  ('cjc-1295-with-dac', '2mg', 1),
  ('cjc-1295-with-dac', '5mg', 2),
  ('cjc-1295-with-dac', '10mg', 3),
  ('cjc-1295-without-dac', '2mg', 1),
  ('cjc-1295-without-dac', '5mg', 2),
  ('cjc-1295-without-dac', '10mg', 3),
  ('cjc-1295-no-dac-5mg-plus-ipamorelin-5mg', '10mg', 1),
  ('ipamorelin', '2mg', 1),
  ('ipamorelin', '5mg', 2),
  ('ipamorelin', '10mg', 3),
  ('sermorelin-acetate', '2mg', 1),
  ('sermorelin-acetate', '5mg', 2),
  ('sermorelin-acetate', '10mg', 3),
  ('tesamorelin', '2mg', 1),
  ('tesamorelin', '5mg', 2),
  ('tesamorelin', '10mg', 3),
  ('tesamorelin', '20mg', 4),
  ('ghrp-2-acetate', '5mg', 1),
  ('ghrp-2-acetate', '10mg', 2),
  ('ghrp-6-acetate', '5mg', 1),
  ('ghrp-6-acetate', '10mg', 2),
  ('mgf', '2mg', 1),
  ('peg-mgf', '2mg', 1),
  ('igf-1-lr3', '0.1mg', 1),
  ('igf-1-lr3', '1mg', 2),
  ('ace-031', '1mg', 1),
  ('hmg', '75iu', 1),
  ('epo', '3000iu', 1),
  ('gonadorelin-acetate', '2mg', 1),
  ('kisspeptin-10', '5mg', 1),
  ('kisspeptin-10', '10mg', 2),
  ('adamax', '5mg', 1),
  ('bpc-157', '2mg', 1),
  ('bpc-157', '5mg', 2),
  ('bpc-157', '10mg', 3),
  ('tb-500', '2mg', 1),
  ('tb-500', '5mg', 2),
  ('tb-500', '10mg', 3),
  ('bpc-157-5mg-plus-tb-500-5mg-bb10', '10mg', 1),
  ('bpc-157-10mg-plus-tb-500-10mg-bb20', '20mg', 1),
  ('thymosin-alpha-1', '5mg', 1),
  ('thymosin-alpha-1', '10mg', 2),
  ('thymalin', '10mg', 1),
  ('kpv', '5mg', 1),
  ('kpv', '10mg', 2),
  ('ll-37', '5mg', 1),
  ('ara-290', '10mg', 1),
  ('pnc-27', '5mg', 1),
  ('pnc-27', '10mg', 2),
  ('foxo4-dri', '10mg', 1),
  ('epithalon', '10mg', 1),
  ('epithalon', '50mg', 2),
  ('mots-c', '10mg', 1),
  ('mots-c', '20mg', 2),
  ('mots-c', '40mg', 3),
  ('ss-31', '10mg', 1),
  ('ss-31', '50mg', 2),
  ('nad-plus', '100mg', 1),
  ('nad-plus', '500mg', 2),
  ('nad-plus', '1000mg', 3),
  ('pinealon', '5mg', 1),
  ('pinealon', '10mg', 2),
  ('pinealon', '20mg', 3),
  ('selank', '5mg', 1),
  ('selank', '10mg', 2),
  ('semax', '5mg', 1),
  ('semax', '10mg', 2),
  ('dsip', '2mg', 1),
  ('dsip', '5mg', 2),
  ('dsip', '10mg', 3),
  ('p21-p021', '5mg', 1),
  ('pe-22-28', '10mg', 1),
  ('vip', '5mg', 1),
  ('vip', '10mg', 2),
  ('melatonin', '10mg', 1),
  ('oxytocin-acetate', '2mg', 1),
  ('oxytocin-acetate', '5mg', 2),
  ('oxytocin-acetate', '10mg', 3),
  ('melanotan-1-mt-1', '10mg', 1),
  ('melanotan-2-mt-2', '10mg', 1),
  ('pt-141', '10mg', 1),
  ('ghk-cu', '50mg', 1),
  ('ghk-cu', '100mg', 2),
  ('ahk-cu', '100mg', 1),
  ('snap-8', '10mg', 1),
  ('matrixyl', '10mg', 1),
  ('glow', '70mg', 1),
  ('klow', '80mg', 1),
  ('bac-water', '3ml', 1),
  ('bac-water', '10ml', 2),
  ('wa-water', '3ml', 1),
  ('wa-water', '10ml', 2),
  ('glutathione', '600mg', 1),
  ('glutathione', '1500mg', 2),
  ('l-carnitine', '600mg / 10ml', 1),
  ('l-carnitine', '1200mg / 10ml', 2),
  ('lipo-c', '10mg', 1),
  ('mic-lipo-c-with-b12', '10mg', 1),
  ('b12', '10mg', 1),
  ('fat-blaster', '10ml', 1),
  ('lemon-bottle', '10ml', 1),
  ('hair-skin-nails-blend', '10ml', 1),
  ('super-human-blend', '10ml', 1),
  ('relaxation-pm', '10ml', 1)
)
insert into product_variants (product_id, size_label, sort_order, pack_size, purchasable, price_cents)
select p.id, i.size_label, i.sort_order, 10, false, null
from incoming i
join products p on p.slug = i.product_slug
on conflict (product_id, size_label) do update
  set sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- 6. Bioregulators is no longer an empty shell
--    spec §10 hid it based on the old 14-SKU list. The full line populates it
--    (Epithalon, Pinealon, Thymalin), so it can go into nav.
--    Capsules & Sprays genuinely has no SKUs and stays hidden.
-- ---------------------------------------------------------------------------

update categories set visible = true  where slug = 'bioregulators';
update categories set visible = false where slug = 'capsules-sprays';

-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------

select c.name as category, c.visible,
       count(distinct p.id) as products,
       count(v.id)          as variants
from categories c
left join products p on p.category_id = c.id
left join product_variants v on v.product_id = p.id
group by c.name, c.visible, c.sort_order
order by c.sort_order;

-- Expected: Vials 57 / Blends 14 /
--           Capsules & Sprays 0 / Bioregulators 3
--           145 variants total.

-- ---------------------------------------------------------------------------
-- Deliberately left empty, needs real data before launch:
--   · research_summary — the passive-register paragraph per product, written
--     against docs/compliance-pack/product-description-template.md
--   · purity_pct       — never state a figure not confirmed by a COA
--   · image_path       — per-product photography into Supabase Storage
--   · price_cents      — One Source retail pricing, then purchasable = true
-- ---------------------------------------------------------------------------
