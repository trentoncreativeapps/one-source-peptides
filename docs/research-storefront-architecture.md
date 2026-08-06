# One Source Peptides — Research Storefront: Technical Architecture
### Handoff blueprint for Claude Code. Pairs with `research-storefront-spec.md` (page-by-page content spec).

---

## 1. Stack decision

Recommending this combination — it's well-supported in Claude Code, keeps you on
Vercel (already your deploy target), and Supabase gives you auth + database + file
storage in one service instead of three separate accounts to manage from an iPhone:

- **Next.js (App Router)** — hosted on Vercel, replaces the static HTML files
- **Supabase** — Postgres database, built-in Auth, Storage (for COA PDFs and product
  images instead of base64-embedding them into HTML)
- **Resend** — unchanged, still handles transactional/order emails
- **Stripe** — recommended for checkout once the high-risk merchant account question
  is resolved; if a specialty high-risk processor is required instead, it slots into
  the same checkout flow described below

This is a full rebuild, not an incremental patch on the existing static
`research.html`. The static file's content (copy, compliance language, product
descriptions) all carries over — the delivery mechanism doesn't.

---

## 2. Database schema (Supabase / Postgres)

```sql
-- Extends Supabase's built-in auth.users with research-specific profile data
create table profiles (
  id uuid references auth.users primary key,
  full_name text,
  organization text,
  researcher_type text check (researcher_type in
    ('researcher','clinic','university','distributor','other')) not null,
  wholesale_status text check (wholesale_status in
    ('none','pending','approved','rejected')) default 'none',
  tos_accepted_at timestamptz,
  age_confirmed_at timestamptz,
  created_at timestamptz default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,       -- 'vials' | 'blends' | 'capsules-sprays' | 'bioregulators'
  name text not null,
  visible boolean default true      -- hide empty categories from nav without deleting the shell
);

create table products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  code text not null,               -- e.g. 'BPC-157'
  name text not null,
  category_id uuid references categories(id),
  description text,                 -- passive-register copy, from compliance-pack template
  research_summary text,            -- the plain-language paragraph
  price_cents int,                  -- null/hidden until purchasable (e.g. FLGR242)
  purchasable boolean default false,
  purity_pct numeric,
  image_path text,                  -- Supabase Storage path, not base64
  created_at timestamptz default now()
);

create table coa_records (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id),
  batch_lot text not null,
  test_date date,
  purity_pct numeric,
  test_method text,                 -- e.g. 'HPLC + MS'
  pdf_path text not null,           -- Supabase Storage path
  public boolean default true       -- COA Library is public per the spec
);

create table kits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id),
  name text,
  created_at timestamptz default now()
);

create table kit_items (
  kit_id uuid references kits(id),
  product_id uuid references products(id),
  qty int default 1,
  primary key (kit_id, product_id)
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id),
  status text default 'pending',
  is_wholesale boolean default false,
  ruo_certified_at timestamptz not null,  -- checkout checkbox timestamp, never null
  total_cents int,
  created_at timestamptz default now()
);

create table order_items (
  order_id uuid references orders(id),
  product_id uuid references products(id),
  qty int,
  unit_price_cents int,             -- snapshot at time of order, not a live join to products
  primary key (order_id, product_id)
);

create table wholesale_bulk_skus (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id),
  pack_size int not null,           -- e.g. 10
  wholesale_price_cents int not null
);
```

**Row-Level Security (RLS) — the actual gating mechanism:**
- `products`: public read for name/photo/category/purity; `price_cents` only returned
  to authenticated requests (handled in the query layer, not by hiding a column in
  the UI — see Section 3)
- `orders`, `order_items`, `kits`, `kit_items`: owner-only read/write (`owner_id = auth.uid()`)
- `coa_records`: public read where `public = true` (matches the spec's decision to
  keep the COA Library open)
- `wholesale_bulk_skus`: read restricted to profiles where `wholesale_status = 'approved'`

---

## 3. How the pricing gate actually works

This is the part that's easy to get wrong. The spec calls out that hiding a price
with CSS doesn't count as gating — here's the correct pattern:

- Product listing queries run as **Next.js Server Components**, using the visitor's
  session (or lack of one) to decide what to select. Logged out → query excludes
  `price_cents` and `purchasable` entirely; the value never reaches the client, so
  there's nothing to find in page source or dev tools.
- Logged in → server component includes price, add-to-cart becomes a real form
  action instead of a disabled button.
- Cart/checkout server actions re-verify session + RLS on every write — never trust
  a price submitted from the client.

---

## 4. Route structure (maps to the sitemap in the page spec)

```
/app
  /page.tsx                        Homepage
  /login/page.tsx                  Login / Create Account (tabs), entry gate modal
  /shop/page.tsx                   Catalog
  /shop/[category]/page.tsx        Category pages (vials, blends, etc.)
  /product/[slug]/page.tsx         Product detail
  /coa-library/page.tsx            COA Library (public)
  /build-a-kit/page.tsx            Kit bundler
  /cart/page.tsx
  /checkout/page.tsx
  /wholesale/page.tsx              Info + application
  /wholesale/login/page.tsx        Separate login
  /wholesale/store/page.tsx        Bulk SKUs, gated on wholesale_status='approved'
  /faq/page.tsx
  /terms/page.tsx
  /privacy/page.tsx
  /refund-policy/page.tsx
  /contact/page.tsx
  /api/checkout/route.ts           Server action / API route for order creation
  /api/wholesale-apply/route.ts    Wholesale application submission
  /api/send-email/route.ts         Reuse existing Resend logic, ported from api/send-email.js
```

---

## 5. Environment variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY        # server-only, never exposed to client
RESEND_API_KEY
NOTIFY_EMAIL
FROM_EMAIL
STRIPE_SECRET_KEY                # once payment processor is resolved
STRIPE_WEBHOOK_SECRET
```

---

## 6. Build sequence (recommended order for Claude Code)

Building this in the wrong order tends to produce a lot of rework. Suggested path:

1. **Supabase project + schema** — run the SQL above, set up RLS policies, seed
   `categories` (all four, per the spec's "build the shell, hide if empty" approach)
2. **Auth** — Supabase Auth wired into Next.js, entry-gate modal (login/create
   account tabs, 21+ and ToS checkboxes, researcher-type dropdown), profile row
   creation on signup
3. **Product catalog, read-only** — migrate the 14 existing SKUs into `products`,
   migrate images from base64 into Supabase Storage, build category + product-detail
   pages with the server-side pricing gate from Section 3
4. **COA Library** — seed `coa_records` (flagged as an open item in the page spec:
   you need actual COA PDFs before this can launch with real data), build the
   public indexed page
5. **Cart, kits, checkout** — kit bundler, cart, checkout flow with the RUO
   certification checkbox, order creation
6. **Wholesale** — separate login, application form + review queue, bulk SKUs,
   gated store
7. **Trust strip, carousels, FAQ, legal pages** — mostly presentational once the
   data layer above is in place

Steps 1–3 are the load-bearing work. Everything after that is largely building UI
against a data model that's already solid.

---

## 7. What carries over from the existing build vs. what doesn't

**Carries over as-is (content, not code):**
- Compliance pack language (ToS draft, refund policy, banned-vocabulary rules,
  product description template) — still needs the attorney review flagged earlier,
  independent of this rebuild
- Product research-summary paragraphs (the plain-language descriptions)
- RUO disclaimer text, entry-gate wording

**Does not carry over (architecture-specific to the old static build):**
- Base64-embedded images — migrate to Supabase Storage
- Inline `<script>` cart logic in `research.html` — replaced by server
  components/actions
- The compliance gate's client-side-only checkbox logic — replaced by the
  session-backed pattern in Section 3

**Net-new:**
- Everything in Section 2 (accounts, orders, COA records, wholesale) had no
  equivalent in the static site at all

---

## 8. Open items this build surfaces (in addition to the ones already tracked)

- Who owns reviewing wholesale applications, and what's the SLA? Needs an answer
  before `/wholesale/login` can gate on `approved` meaningfully.
- COA PDFs need a real source before `coa_records` has anything to show —
  sequence this before storefront launch, not after (same flag as the page spec).
- GLP-3 / FLGR242 verification — unchanged, still blocking those two SKUs from
  `purchasable = true`.
- Payment processor — checkout (Section 6, step 5) can be built against a test
  Stripe key regardless, but go-live still needs the high-risk merchant account
  question resolved.
