import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getMembership, money, formatPercent, monthlyEquivalent } from '@/lib/membership';

export const metadata = { title: 'Research Membership — One Source Peptides' };

export default async function MembershipPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { plan, isMember, status, discountBp } = await getMembership();

  if (!plan) {
    return (
      <section className="section">
        <h1>Membership</h1>
        <p className="notice">
          No membership plan is configured. Run migration 0003 in Supabase.
        </p>
      </section>
    );
  }

  // Worked example so the value is concrete rather than a percentage claim.
  const example = 4000;

  // Headline figure is the monthly equivalent; the amount actually charged is
  // stated immediately beside it, never only in small print.
  const perMonth = monthlyEquivalent(plan);
  const isAnnual = plan.interval === 'year';
  const headlineAmount = perMonth ?? plan.price_cents;

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <p className="eyebrow">{plan.name}</p>
            <h1>
              {formatPercent(plan.discount_bp)} off every product, {money(headlineAmount)} a
              month.
            </h1>
            <p className="hero-lede">
              An annual membership for laboratories ordering regularly. The discount
              applies to the entire catalogue — every compound, every size, no exclusions
              and no minimum order.
            </p>
            <div className="hero-actions">
              {isMember ? (
                <span className="member-badge member-badge--lg">
                  Membership active · {formatPercent(discountBp)} applied
                </span>
              ) : (
                <>
                  <span className="btn-primary is-disabled" aria-disabled="true">
                    Join — {money(plan.price_cents)} today
                  </span>
                  <Link href="/shop" className="btn-outline">Browse the catalogue</Link>
                </>
              )}
            </div>
            {!isMember && (
              <p className="hero-note">
                {isAnnual && (
                  <>
                    <strong>{money(plan.price_cents)} is charged once at sign-up</strong>,
                    covering 12 months — that is {money(headlineAmount)} per month averaged
                    over the year, not a monthly charge. Renews annually; cancel any time
                    before renewal.{' '}
                  </>
                )}
                Enrolment opens once payment processing is connected. Nothing is charged and
                no card details are collected today.
              </p>
            )}
          </div>

          <aside className="plan-card">
            <p className="plan-price">
              <span className="plan-amount">{money(headlineAmount)}</span>
              <span className="plan-interval">/ month</span>
            </p>
            {isAnnual && (
              <p className="plan-billed">
                Billed <strong>{money(plan.price_cents)} annually</strong>, charged once at
                sign-up
              </p>
            )}
            <ul className="plan-list">
              <li><strong>{formatPercent(plan.discount_bp)}</strong> off all products</li>
              <li>Applies to every size in the catalogue</li>
              <li>No minimum order, no exclusions</li>
              <li>Stacks with your account&rsquo;s existing terms</li>
              <li>Cancel any time before renewal</li>
            </ul>
            <div className="plan-example">
              <p className="plan-example-head">Worked example</p>
              <p>
                A {money(example)} order costs a member{' '}
                <strong>{money(Math.round(example * (10000 - plan.discount_bp) / 10000))}</strong> —
                a saving of{' '}
                {money(example - Math.round(example * (10000 - plan.discount_bp) / 10000))}.
                At that order size the membership pays for itself after roughly{' '}
                {Math.ceil(plan.price_cents / (example * plan.discount_bp / 10000))} orders
                across the year.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <header className="band-head">
            <p className="eyebrow">How it works</p>
            <h2>Membership mechanics</h2>
          </header>
          <ol className="steps">
            <li>
              <h3>Verified account first</h3>
              <p>
                Membership sits on top of a verified research account. The same eligibility
                rules apply — researcher, clinic, university or distributor, 21 or older.
              </p>
            </li>
            <li>
              <h3>Discount applied server-side</h3>
              <p>
                Member pricing is calculated on the server from your membership record. It
                is not a coupon code and cannot be shared, guessed or applied from the
                browser.
              </p>
            </li>
            <li>
              <h3>Billed annually, cancel any time</h3>
              <p>
                {money(plan.price_cents)} charged once at sign-up, covering 12 months.
                Cancelling stops the next annual renewal; the discount runs to the end of
                the period already paid for, and nothing already ordered changes.
              </p>
            </li>
            <li>
              <h3>Separate from wholesale</h3>
              <p>
                Wholesale tiers are a different arrangement with their own application and
                pack sizes. Membership is for standard catalogue ordering.
              </p>
            </li>
          </ol>
        </div>
      </section>

      {!user && (
        <section className="band band--surface">
          <div className="wrap">
            <div className="split-band">
              <div>
                <p className="eyebrow">First step</p>
                <h2>Create a research account</h2>
                <p className="band-lede">
                  An account is required before membership, and it is free — it also
                  unlocks catalogue pricing.
                </p>
                <Link href="/login" className="btn-primary">Create an account</Link>
              </div>
              <ul className="checklist">
                <li>Free to create</li>
                <li>Unlocks catalogue pricing</li>
                <li>Required for ordering</li>
                <li>Membership can be added later</li>
              </ul>
            </div>
          </div>
        </section>
      )}

      <section className="band band--tight">
        <div className="wrap">
          <p className="ruo-block">
            FOR RESEARCH USE ONLY. NOT FOR HUMAN OR ANIMAL USE. Membership affects pricing
            only. It does not change the research-use-only terms on which every product is
            supplied, and it does not alter eligibility requirements.
          </p>
        </div>
      </section>
    </>
  );
}
