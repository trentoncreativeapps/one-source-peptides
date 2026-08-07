import Link from 'next/link';
import { money, formatPercent, monthlyEquivalent, type MembershipPlan } from '@/lib/membership';

/**
 * Standing offer strip shown to non-members on catalogue and product pages.
 *
 * Renders nothing when there's no active plan (migration 0003 not applied) or
 * when the visitor is already a member — an offer to someone who already pays
 * is just noise.
 *
 * The monthly figure is paired with the real annual charge, same rule as the
 * membership page: the amount billed is never left implied.
 */
export default function MemberOffer({
  plan,
  isMember,
}: {
  plan: MembershipPlan | null;
  isMember: boolean;
}) {
  if (!plan || isMember) return null;

  const perMonth = monthlyEquivalent(plan) ?? plan.price_cents;
  const isAnnual = plan.interval === 'year';

  return (
    <aside className="member-offer">
      <div className="member-offer-text">
        <p className="member-offer-head">
          Save {formatPercent(plan.discount_bp)} on every product
        </p>
        <p className="member-offer-sub">
          {money(perMonth)}/month{isAnnual && <> — billed {money(plan.price_cents)} annually</>}.
          No membership needed to order at standard pricing.
        </p>
      </div>
      <Link href="/membership" className="btn-primary btn-sm">See membership</Link>
    </aside>
  );
}
