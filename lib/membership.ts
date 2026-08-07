import { createClient } from '@/lib/supabase/server';

export type MembershipPlan = {
  id: string;
  code: string;
  name: string;
  price_cents: number;
  interval: string;
  discount_bp: number;
};

export type MembershipState = {
  plan: MembershipPlan | null;
  isMember: boolean;
  status: string;
  /** Discount actually applicable to this visitor, in basis points. */
  discountBp: number;
};

/**
 * Integer maths in basis points, rounded once at the end. Using a float
 * percentage here would put fractions of a cent into order totals.
 */
export function applyDiscount(listCents: number, discountBp: number): number {
  if (discountBp <= 0) return listCents;
  return Math.round(listCents * (10000 - discountBp) / 10000);
}

export function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatPercent(discountBp: number): string {
  const pct = discountBp / 100;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(1)}%`;
}

/**
 * Monthly-equivalent figure for an annually billed plan — display only.
 *
 * The amount actually charged is `price_cents`. Anywhere this number is shown,
 * the real charge and its frequency must be shown with it: US law (ROSCA and
 * the FTC's negative-option rule) requires the total amount and billing
 * interval to be clear and conspicuous before billing details are collected.
 * "$49.99/month" on its own, when the card is debited $599.88 once, is the
 * exact pattern those rules target.
 */
export function monthlyEquivalent(plan: MembershipPlan): number | null {
  if (plan.interval !== 'year') return null;
  return Math.round(plan.price_cents / 12);
}

/**
 * Resolves the active plan and whether the current visitor is a paying member.
 *
 * Membership is read from the database under the visitor's own session, never
 * from a cookie or client hint — and membership_status is not writable by the
 * account holder (see migration 0003), so a member discount can only exist
 * because billing set it.
 */
export async function getMembership(): Promise<MembershipState> {
  const supabase = await createClient();

  const { data: plan } = await supabase
    .from('membership_plans')
    .select('id, code, name, price_cents, interval, discount_bp')
    .eq('active', true)
    .order('price_cents')
    .limit(1)
    .maybeSingle();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { plan: plan ?? null, isMember: false, status: 'anonymous', discountBp: 0 };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('membership_status')
    .eq('id', user.id)
    .maybeSingle();

  const status = profile?.membership_status ?? 'none';
  const isMember = status === 'active';

  return {
    plan: plan ?? null,
    isMember,
    status,
    discountBp: isMember ? (plan?.discount_bp ?? 0) : 0,
  };
}
