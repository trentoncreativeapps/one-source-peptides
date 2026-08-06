# One Source Peptides — Research Storefront Spec
### Standalone site, split from the dual-storefront build

Reference sites: biolongevitylabs.com, goalphalabs.com (both reviewed for structure as of Aug 2026)

---

## 0. Scope & a technical flag before anything else

Splitting the research catalog into its own site is straightforward. What changes the
project underneath it is **account-gated pricing and a wholesale tier** — both reference
sites require a logged-in account before catalog pricing or add-to-cart appears at all.

That means this can no longer ship as a static HTML site with no backend. You need,
at minimum:
- User accounts (email/password or magic-link), with session handling
- A database for accounts, researcher-type/wholesale status, orders, and COA records
- Server-side gating so pricing/cart data never reaches the page for a logged-out visitor
  (hiding it with CSS/JS isn't real gating — it's still sitting in the page source)
- An approval workflow for wholesale applications (someone on your team reviews and
  flips a flag on the account)

Realistic paths: a headless commerce platform with accounts built in (Shopify with
gated pricing apps, Webflow + Memberstack, etc.), or a custom build on Vercel with a
database (Supabase/Postgres) and an auth library (Clerk, Auth.js). This spec is written
platform-agnostic so it works either way, but the build plan changes materially
depending on which you pick — worth deciding before wireframing starts.

Everything else below (page structure, content, compliance language) carries over
regardless of platform choice.

---

## 1. Sitemap

```
/                          Homepage
/login                     Login / Create Account (tabbed)
/shop                      Catalog (account-gated pricing)
/shop/vials                Category: Vials
/shop/blends               Category: Blends
/shop/capsules-sprays      Category: Capsules & Sprays (reserved, currently empty)
/shop/bioregulators        Category: Bioregulators (reserved, currently empty)
/product/[slug]            Product detail page
/coa-library                COA Library (standalone, indexed)
/build-a-kit               Kit bundler
/cart
/checkout
/wholesale                 Wholesale info + application
/wholesale/login           Wholesale account login (separate from retail login)
/wholesale/store           Wholesale catalog (bulk-pack SKUs, tiered pricing)
/faq
/terms
/privacy
/refund-policy
/contact
```

---

## 2. Entry Gate (site-wide modal, first visit)

Fires on first page load, before any content is interactable. Session-persisted
(don't re-show every page load — cookie/localStorage flag, re-confirm every 30 days
or on new session per your compliance preference).

**Modal contents:**
- Headline: restricted access / RUO notice (reuse existing compliance-pack language)
- Bullet summary: not for human/animal use, research/lab use only, 21+ only
- **Tabs: "Log In" / "Create Account"**
  - Log In tab: email + password, "forgot password" link
  - Create Account tab:
    - Name, email, password
    - **Researcher type dropdown** (required): Researcher / Clinic / University /
      Distributor / Other
    - Organization/institution name (optional unless type = Clinic/University/Distributor)
- **21+ confirmation checkbox** (unchecked by default, required)
- **ToS agreement checkbox** (unchecked by default, required, links to /terms)
- Both checkboxes must be checked before the primary button activates — same
  pattern as the existing compliance gate, don't relax it here
- **Intro discount hook**: "Create an account — 20% off your first order" banner
  above the Create Account tab (adjust % to whatever you land on)
- Secondary action: "Continue browsing without an account" — allowed, but see
  Section 3, this only grants access to browse, not to see pricing or buy

**Do not put:** age slider, "I am not affiliated with law enforcement" language
(common on gray-market sites, actively looks bad), anything implying anonymity.

---

## 3. Homepage

- Hero: research-catalog framing, RUO banner (reuse from current research.html)
- **Trust strip** (see Section 11) — directly under hero
- Featured category tiles: Vials / Blends / Capsules & Sprays / Bioregulators
  (grey out or hide the two empty categories until populated — don't advertise an
  empty shelf)
- **Product carousel: "Best Sellers"** — view collection link → /shop?sort=bestsellers
- **Trust strip repeated** (mid-page, per your reference sites' pattern)
- **Product carousel: "Recently Added"** — view collection link → /shop?sort=new
- Wholesale callout band: short pitch + link to /wholesale
- Condensed FAQ preview (3 of the 6 questions, "see all" → /faq)
- Footer (Section 13)

If logged out: carousels show product cards with name/photo/category but **no price
and no add-to-cart** — button reads "Log in to view pricing" and opens the entry
gate's login tab.

---

## 4. Catalog (/shop and category pages)

- Left rail or top filter bar: category, in-stock only, sort (best sellers, new,
  price if logged in, A–Z)
- Grid of product cards. Logged out: photo, name, short eyebrow, "Log in to view
  pricing." Logged in: photo, name, purity badge, price, qty selector, add-to-cart.
- Category pages inherit all of the above, pre-filtered.
- **Capsules & Sprays and Bioregulators categories are currently empty** — see
  Section 15, open items. Don't build product cards for these until there's real
  inventory; build the category page shell so it's ready.

---

## 5. Product Detail Page

- Photo, name, code/SKU, category
- Purity % (from COA), batch/lot number if tracked at SKU level
- **RUO disclaimer block** — same language as the compliance-pack footer disclaimer,
  repeated on every product page, not just the footer
- Chemical Profile + Research Data sections (reuse the structure from
  `compliance-pack/product-description-template.md` — passive academic register,
  banned-vocabulary rules still apply here, nothing changes about that just because
  the site moved)
- **Linked COA** — direct link to that specific batch's certificate in the COA
  Library, not just a link to the library's homepage
- Price + add-to-cart (gated per Section 3)
- "Add to Kit" button alongside add-to-cart (feeds the Build-a-Kit bundler)
- Related products carousel (same category)

---

## 6. COA Library (standalone, indexed page)

- Searchable/filterable table: Product name, batch/lot #, date tested, purity %,
  testing method (HPLC/MS), download link (PDF)
- Search by product name or lot number
- Every row's download link should be a direct, stable URL so product pages can
  deep-link into it (see Section 5)
- This page needs to be indexed by search engines (not blocked by the compliance
  gate) — COA transparency is a trust signal reference sites lead with; don't bury
  it behind login
- Consider: does every COA need to be public, or only accessible post-login? Both
  reference sites keep this public. Recommend matching that — it's a credibility
  signal for prospective buyers deciding whether to create an account at all.

---

## 7. Build-a-Kit Bundler

- Entry points: homepage callout, nav link, "Add to Kit" button on product pages
- UI: pick a kit size (e.g. 3-vial / 5-vial / 10-vial) or freeform, select products
  up to that count, running subtotal, small bundle discount vs. buying separately
  (e.g. 10% off)
- Save/name the kit (useful for repeat researchers reordering the same combination)
- Add completed kit to cart as a single line item, itemized at checkout
- Gated the same as catalog pricing — logged out, this page can still let someone
  build a kit conceptually but should prompt login before showing the discounted
  total or allowing checkout

---

## 8. Cart / Checkout

- Standard cart: line items, qty adjust, remove, subtotal
- **Checkout-flow RUO certification checkbox** — same non-negotiable pattern as the
  current build: unchecked by default, order button disabled until checked, text
  reaffirms research-use-only / not for human or animal use
- Payment: flagged as pending in the existing launch guide (high-risk merchant
  account not yet secured) — checkout should still be built and wired, just pointed
  at a placeholder/test processor until that's resolved
- Order confirmation should reference the buyer's researcher type and reiterate the
  RUO terms in the confirmation email

---

## 9. Wholesale

**`/wholesale`** — info page: eligibility (clinic/practitioner/institution + business
license or equivalent where applicable), pricing tier structure (e.g. 20–50% off
retail by volume, matching the reference-site pattern), no minimum order size,
link to apply.

**`/wholesale/login`** — separate login, separate from retail account login. Someone
who only has a retail account shouldn't land in the wholesale store.

**Wholesale application form:** business name, license/registration number field,
tax exemption doc upload, contact info, researcher-type-equivalent (Clinic /
Practitioner / Distributor / Institution). Submits to a review queue — approval is
manual, not automatic (matches reference-site pattern).

**`/wholesale/store`** — bulk-pack SKUs (e.g. 10-vial packs of top sellers),
wholesale-tier pricing, separate from the retail catalog's pricing. Same product
photography/COA links as retail, different pack sizes and price break structure.

---

## 10. Category Structure — adapted to your actual catalog

The reference sites' Vials / Blends / Capsules & Sprays / Bioregulators structure
doesn't map cleanly onto your current 14 SKUs yet:

| Category | Current SKUs |
|---|---|
| **Vials** | BPC-157, TB-500, GHK-Cu, Thymosin Alpha, ARA-290, MOTS-C, SS-31, PT-141, Melanotan 2, Kisspeptin, GLP-2, GLP-3, FLGR242 |
| **Blends** | CJC-1295 / Ipamorelin |
| **Capsules & Sprays** | *(none currently)* |
| **Bioregulators** | *(none currently)* |

Two of the four reference categories are empty. Recommend building all four category
shells now (matches the reference sites' nav pattern and reads as a fuller catalog)
but hiding the empty two from primary nav until there's real inventory — an empty
shelf undercuts the "150+ peptides" trust-building tone these reference sites go for.
This is also a good forcing function to revisit GLP-3 and FLGR242 — both still need
supplier verification before they're live in any category (per the existing open
items list).

---

## 11. Trust Strip (component, repeated top + mid-page per Section 3)

Icons + short label, e.g.:
- Purity % (≥99%, or your actual verified figure — don't state a number you haven't
  independently confirmed via COA)
- Third-party tested (link to COA Library)
- Made in USA (only include if accurate to your actual manufacturing/sourcing)
- Fast shipping (same-day cutoff time, if you can commit to one)

Keep claims tied to something checkable (a COA, a shipping cutoff you actually hit) —
this component is exactly the kind of thing that gets picked apart if a claim doesn't
hold up.

---

## 12. Product Carousels

- **Recently Added** — homepage + shop page, sorted by SKU creation date
- **Best Sellers** — homepage, sorted by order volume (needs order data — until you
  have enough, this can default to a manually curated list)
- **Popular** — optional third carousel if Best Sellers and Recently Added don't
  cover enough ground yet; skip it at launch if the catalog's too small to support
  three overlapping carousels meaningfully
- Every carousel: "View Collection" link to the relevant filtered /shop view

---

## 13. Footer (site-wide)

- **RUO disclaimer, full text** — reuse verbatim from the current research.html
  footer disclaimer / compliance pack. This is separate from and in addition to the
  product-page and checkout-flow disclaimers, not a replacement for them.
- Nav: Shop, COA Library, Build a Kit, Wholesale, FAQ
- Legal: Terms, Privacy, Refund Policy
- Contact
- Newsletter signup (optional)

---

## 14. FAQ (condensed, 4–6 questions)

Recommend these six, matching what both reference sites lead with:
1. Is every batch third-party tested? (yes/no, testing method, COA link)
2. What does "Research Use Only" mean? (plain-language RUO explanation)
3. Who can order from this site? (researcher-type eligibility, echoes entry gate)
4. How fast is shipping, and what does it cost? (cutoff time, fees, free-shipping
   threshold if applicable)
5. What's your purity standard? (number + how it's verified)
6. How do I get a wholesale account? (link to /wholesale)

Keep answers short — this is a trust-building skim page, not a support-ticket
deflection page. Link out to fuller policies (Refund Policy, Terms) rather than
answering everything inline.

---

## 15. Open items carried over / new

- **GLP-3 and FLGR242** — still need supplier verification (unchanged from before).
  Both currently sit in "Vials," which is fine structurally, but shouldn't go live
  with a price until resolved.
- **Backend/auth platform decision** — see Section 0. This is the biggest net-new
  decision this spec introduces.
- **Wholesale approval workflow owner** — who on your side reviews and approves
  applications? Needs an answer before /wholesale/login can go live.
- **High-risk merchant account** — still unresolved from the original launch guide,
  now also blocking wholesale checkout, not just retail.
- **COA data source** — where do actual COA PDFs come from per batch? If you don't
  have a COA on file for every current SKU yet, the COA Library launches with gaps,
  which undercuts the whole trust-strip pitch. Worth sequencing: COA collection
  before storefront launch, not after.
- **Domain/deployment** — confirm the split means a genuinely separate domain (not
  a subdomain of the skincare site), since reference sites don't share any brand
  surface with a cosmetics storefront, and you'll want the same separation.
