# One Source Peptides — Research Storefront Rebuild

## What this is
A ground-up rebuild of the research-catalog storefront, splitting it out of the
former dual-storefront site into its own standalone project. This is a new Next.js +
Supabase + Vercel build — not a patch on the old static `research.html`.

## Read these two files first, in order
1. **`docs/research-storefront-spec.md`** — the page-by-page content spec: every page,
   what's on it, the entry gate, category structure, FAQ content, wholesale flow.
2. **`docs/research-storefront-architecture.md`** — the technical blueprint: database
   schema, RLS/pricing-gate pattern, route structure, environment variables, and
   the recommended build sequence (Section 6 — follow this order, it avoids rework).

## Non-negotiables carried over from the original project
- **RUO disclaimer** on every product page, checkout flow, and footer — not
  optional, not a summary, the full language from the compliance pack.
- **Pricing must be gated server-side**, not hidden with CSS. See architecture doc
  Section 3 before building any product listing page.
- **Checkout RUO certification checkbox** must never be pre-checked, and the order
  button stays disabled until it's checked.
- **GLP-3 and FLGR242** are not yet verified — do not set `purchasable = true` for
  either until told otherwise.
- Two categories (Capsules & Sprays, Bioregulators) currently have zero SKUs — build
  the category shell but keep them out of primary nav until populated.

## Current product catalog (14 SKUs, migrate into the `products` table)
BPC-157, TB-500, GHK-Cu, Thymosin Alpha, ARA-290, CJC-1295/Ipamorelin, GLP-2, GLP-3,
MOTS-C, SS-31, PT-141, Melanotan 2, Kisspeptin, FLGR242 — category assignments are
in the architecture doc Section 2 seed notes and the spec's Section 10 table.

## Working style for this project
- The person (Trenton) works primarily from an iPhone — keep setup steps minimal,
  favor services with good web dashboards over local-only tooling.
- Flag any new compliance, legal, or regulatory question instead of resolving it
  silently — surface it and wait for a decision, same as the rest of this project.
- Regulatory environment is active — don't assume static requirements.

## Known open items (do not silently resolve — flag and ask)
- Wholesale application review: no owner/SLA defined yet.
- COA PDFs: no real source lined up yet — the COA Library will launch empty without
  this being sequenced first.
- Payment processor: high-risk merchant account not yet secured. Build checkout
  against a test Stripe key; go-live is blocked on this separately.
- Attorney review of Terms of Service Section 4 — still pending, independent of
  this rebuild.
