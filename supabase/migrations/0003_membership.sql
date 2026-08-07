-- One Source Peptides — Research Storefront
-- Migration 0003: monthly membership ($49.99/mo, 25% off all products)
--
-- Run AFTER 0002. Paste into Supabase → SQL Editor → Run. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Plan configuration lives in the database, not in code, so the fee or the
--    discount can change without a redeploy — and so historic orders can be
--    reconciled against the plan that was actually in force.
-- ---------------------------------------------------------------------------

create table if not exists membership_plans (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  price_cents int not null check (price_cents >= 0),
  interval text not null default 'month' check (interval in ('month','year')),
  discount_bp int not null check (discount_bp between 0 and 10000), -- basis points
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2500 basis points = 25%. Stored in bp rather than a float so the arithmetic
-- is exact integer maths all the way to the cent.
--
-- The plan is billed ANNUALLY: $599.88 taken at sign-up, which is exactly
-- 12 x $49.99. price_cents is therefore the amount actually charged, and the
-- "$49.99/month" figure is derived for display only (price_cents / 12).
-- Storing the monthly figure here instead would mean the database disagreed
-- with the card statement.
insert into membership_plans (code, name, price_cents, interval, discount_bp, active)
values ('annual-prepaid', 'Research Membership', 59988, 'year', 2500, true)
on conflict (code) do update
  set name = excluded.name,
      price_cents = excluded.price_cents,
      interval = excluded.interval,
      discount_bp = excluded.discount_bp,
      active = excluded.active;

-- Retire the monthly plan if an earlier run of this migration created it.
update membership_plans set active = false where code = 'monthly-standard';

-- ---------------------------------------------------------------------------
-- 2. Membership state on the profile
-- ---------------------------------------------------------------------------

alter table profiles
  add column if not exists membership_status text not null default 'none'
    check (membership_status in ('none','active','past_due','cancelled')),
  add column if not exists membership_plan_id uuid references membership_plans(id),
  add column if not exists membership_started_at timestamptz,
  add column if not exists membership_renews_at timestamptz,
  add column if not exists membership_cancelled_at timestamptz,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

create index if not exists profiles_membership_idx on profiles(membership_status);

-- ---------------------------------------------------------------------------
-- 3. Membership must NOT be self-writable
--
--    This is the whole ballgame. If a signed-in user could PATCH their own
--    membership_status to 'active' they would grant themselves 25% off
--    everything without paying. Same reasoning as wholesale_status in 0001:
--    re-grant UPDATE column by column and leave the money columns out.
--    Only the service role (Stripe webhook) may set them.
-- ---------------------------------------------------------------------------

revoke update on profiles from authenticated;
grant update (full_name, organization, researcher_type,
              tos_accepted_at, age_confirmed_at) on profiles to authenticated;

-- plans are public read so pricing pages can render without a session
alter table membership_plans enable row level security;

drop policy if exists plans_public_read on membership_plans;
create policy plans_public_read on membership_plans
  for select using (active = true);

grant select on membership_plans to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Record what a member actually paid, and what discount applied
--    Snapshotted per order so a later plan change can't rewrite history.
-- ---------------------------------------------------------------------------

alter table orders
  add column if not exists member_discount_bp int not null default 0
    check (member_discount_bp between 0 and 10000),
  add column if not exists discount_cents int not null default 0
    check (discount_cents >= 0);

alter table order_items
  add column if not exists unit_list_price_cents int;  -- pre-discount, for the receipt

comment on column orders.member_discount_bp is
  'Discount rate in basis points applied at time of order; snapshot, not a live join';
comment on column order_items.unit_list_price_cents is
  'List price before member discount, so a receipt can show the saving';

-- ---------------------------------------------------------------------------
-- 5. Subscription billing events, for reconciliation against Stripe
-- ---------------------------------------------------------------------------

create table if not exists membership_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  plan_id uuid references membership_plans(id),
  event text not null
    check (event in ('started','renewed','payment_failed','cancelled','reactivated')),
  amount_cents int,
  stripe_event_id text unique,   -- unique: makes webhook replay idempotent
  occurred_at timestamptz not null default now()
);

create index if not exists membership_events_owner_idx on membership_events(owner_id);

alter table membership_events enable row level security;

drop policy if exists membership_events_owner_read on membership_events;
create policy membership_events_owner_read on membership_events
  for select using (owner_id = auth.uid());

-- No client INSERT policy: only the Stripe webhook (service role) writes these.

-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------

select code, name,
       price_cents,
       (price_cents / 100.0)      as charged_dollars,
       (price_cents / 12 / 100.0) as monthly_equivalent,
       (discount_bp / 100.0)      as discount_percent,
       interval, active
from membership_plans
order by active desc, code;

-- Expected: annual-prepaid | Research Membership | 59988 | 599.88 | 49.99 | 25.0 | year | t
