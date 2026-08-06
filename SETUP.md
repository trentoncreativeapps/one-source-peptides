# Setup

Three things to connect, in this order. Everything is done from a browser —
no local tooling required.

---

## 1. Database (done once)

Supabase → your project → **SQL Editor** → **New query** → paste all of
`supabase/migrations/RUN-THIS-IN-SUPABASE.sql` → **Run**.

It finishes by printing what it created. Expected:

| category | visible | products | variants |
|---|---|---|---|
| Vials | true | 57 | 125 |
| Blends | true | 14 | 14 |
| Capsules & Sprays | false | 0 | 0 |
| Bioregulators | true | 3 | 6 |

Safe to re-run — every step guards against already existing.

---

## 2. Environment variables

From Supabase → **Project Settings → API**. Paste these into Vercel, not
into this repo.

| Supabase field | Variable name | Public? |
|---|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` | yes |
| `anon` / `public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes |
| `service_role` key | `SUPABASE_SERVICE_ROLE_KEY` | **no — secret** |

If the dashboard says "publishable" and "secret" instead, that's the newer
naming: publishable → anon slot, secret → service_role slot.

**The `anon` key is safe to expose.** It reaches the browser by design, and
row-level security is what limits it. **The `service_role` key bypasses every
policy in the database.** It goes only in Vercel's environment variables —
never committed, never prefixed `NEXT_PUBLIC_`.

Not needed yet, add when the relevant work starts: `RESEND_API_KEY`,
`NOTIFY_EMAIL`, `FROM_EMAIL` (email), `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET` (checkout — test keys only until the high-risk
merchant account is resolved).

---

## 3. Deploy

Vercel → **Add New → Project → Import** this repo. Vercel detects Next.js on
its own; no build settings to change.

Paste the three variables into the **Environment Variables** box shown during
import — adding them afterwards means another build.

Then **Deploy**.

---

## Checking the pricing gate actually works

The gate is enforced by Postgres, not by application code. Two ways to confirm:

**In Supabase SQL Editor:**

```sql
set role anon;
select * from products limit 1;   -- must fail: permission denied
reset role;
```

**On the deployed site:** open `/shop` in a private window. Every card should
read "Log in to view pricing" and no price should appear anywhere in
View Source. Create an account, and prices appear — still absent from the
page source for anyone logged out.

If a price is ever visible to a logged-out visitor, something is wrong;
say so rather than working around it.

---

## Local development (optional)

```
cp .env.local.example .env.local     # fill in the same three values
npm install
npm run dev
```

`npm run typecheck` runs `tsc --noEmit`.

---

## Where things are

```
app/                    routes (App Router)
  auth/actions.ts       signUp / signIn / signOut server actions
  login/page.tsx        account access
  shop/page.tsx         catalogue — reads public views or base tables by session
components/
  EntryGate.tsx         site-wide gate: tabs, 21+, ToS, researcher type
lib/supabase/
  server.ts             runs as the visitor; RLS applies
  admin.ts              service role; RLS bypassed — server-side only
middleware.ts           refreshes the auth session on every request
supabase/migrations/    schema, RLS, catalogue seed
docs/                   spec, architecture blueprint, compliance pack
```

---

## Still outstanding

Carried from `docs/` — none of these are code problems:

- **Product copy** — `research_summary` is empty for all 74 products. Needs the
  passive-register paragraph per product, written against
  `docs/compliance-pack/product-description-template.md`. The banned-vocabulary
  list in that file applies.
- **Purity figures** — `purity_pct` is null everywhere. Never publish a number
  that isn't confirmed by a COA.
- **Product photography** — `image_path` is null; images belong in Supabase
  Storage, not embedded in the page.
- **Retail pricing** — every variant is `purchasable = false` with no price.
  Supplier cost data was deliberately excluded.
- **COA PDFs** — no source lined up. The COA Library launches empty without it.
- **Payment processor** — high-risk merchant account not secured. Build against
  a test Stripe key; go-live is blocked separately.
- **Wholesale review owner** — nobody assigned, and no SLA.
- **Attorney review** of Terms of Service Section 4.
