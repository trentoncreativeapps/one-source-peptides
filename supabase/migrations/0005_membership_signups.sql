-- One Source Peptides — Research Storefront
-- Migration 0005: membership sign-up requests
--
-- Run AFTER 0004. Paste into Supabase → SQL Editor → Run. Safe to re-run.
--
-- Why a separate table rather than letting the member set their own status:
-- profiles.membership_status grants the 25% discount, so it is not writable by
-- the account holder (0003). A request table is the writable half — the
-- researcher records that they want to enrol, and only billing (service role)
-- promotes them to active. Same shape as wholesale_applications.

create table if not exists membership_signups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  plan_id uuid references membership_plans(id),
  status text not null default 'requested'
    check (status in ('requested','awaiting_payment','active','declined','withdrawn')),
  -- what the member was shown at the time, so a later price change cannot
  -- retroactively alter what they agreed to
  quoted_price_cents int not null,
  quoted_discount_bp int not null,
  quoted_interval text not null,
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  notes text,
  -- one open request per account; resolved ones don't block a new attempt
  unique (owner_id, status) deferrable initially immediate
);

create index if not exists membership_signups_owner_idx on membership_signups(owner_id);
create index if not exists membership_signups_status_idx on membership_signups(status);

alter table membership_signups enable row level security;

-- the researcher can see and create their own request
drop policy if exists membership_signups_owner_read on membership_signups;
create policy membership_signups_owner_read on membership_signups
  for select using (owner_id = auth.uid());

drop policy if exists membership_signups_owner_insert on membership_signups;
create policy membership_signups_owner_insert on membership_signups
  for insert with check (owner_id = auth.uid());

-- withdrawing is allowed; approving is not (that would grant the discount)
drop policy if exists membership_signups_owner_withdraw on membership_signups;
create policy membership_signups_owner_withdraw on membership_signups
  for update using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and status = 'withdrawn');

grant select, insert on membership_signups to authenticated;
revoke update on membership_signups from authenticated;
grant update (status) on membership_signups to authenticated;

-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------

select
  (select count(*) from membership_plans where active) as active_plans,
  (select count(*) from membership_signups)            as signup_requests;

-- Expected: 1 active plan, 0 requests on a fresh run
