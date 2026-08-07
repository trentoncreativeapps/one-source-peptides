'use client';

import { useState } from 'react';
import Link from 'next/link';
import { requestMembership, withdrawMembershipRequest } from '@/app/membership/actions';

/**
 * Enrolment control. Requesting membership is real and recorded; the charge is
 * not, because payment processing isn't connected. The copy says so plainly
 * rather than implying a card will be taken.
 */
export default function MembershipSignup({
  signedIn,
  isMember,
  existingRequest,
  chargedLabel,
  perMonthLabel,
  discountLabel,
}: {
  signedIn: boolean;
  isMember: boolean;
  existingRequest: string | null;
  chargedLabel: string;
  perMonthLabel: string;
  discountLabel: string;
}) {
  const [state, setState] = useState<string | null>(existingRequest);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function join() {
    setBusy(true);
    setError(null);
    const result = await requestMembership();
    setBusy(false);
    if ('error' in result) { setError(result.error); return; }
    setState(result.status);
  }

  async function withdraw() {
    setBusy(true);
    setError(null);
    const result = await withdrawMembershipRequest();
    setBusy(false);
    if ('error' in result) { setError(result.error); return; }
    setState(null);
  }

  if (isMember) {
    return (
      <div className="signup-box signup-box--active">
        <p className="member-badge member-badge--lg">
          Membership active · {discountLabel} applied to every product
        </p>
        <p className="signup-note">
          Your member price is shown throughout the catalogue. Nothing else to do.
        </p>
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="signup-box">
        <h2>Join the membership</h2>
        <p className="signup-price">
          <strong>{perMonthLabel}</strong> a month — billed {chargedLabel} annually
        </p>
        <Link href="/login" className="btn-primary">Create an account to join</Link>
        <p className="signup-note">
          Membership sits on top of a free research account. You can also order at
          standard pricing without a membership — <Link href="/shop">browse the
          catalogue</Link>.
        </p>
      </div>
    );
  }

  if (state === 'requested' || state === 'awaiting_payment') {
    return (
      <div className="signup-box signup-box--pending">
        <h2>Enrolment requested</h2>
        <p className="signup-note">
          Your request is recorded at {perMonthLabel} a month, billed {chargedLabel}
          annually with {discountLabel} off all products. We&rsquo;ll be in touch to
          complete payment — nothing has been charged.
        </p>
        <button type="button" className="btn-outline btn-sm" onClick={withdraw} disabled={busy}>
          {busy ? 'Withdrawing…' : 'Withdraw request'}
        </button>
        {error && <p className="gate-error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="signup-box">
      <h2>Join the membership</h2>
      <p className="signup-price">
        <strong>{perMonthLabel}</strong> a month — billed {chargedLabel} annually
      </p>
      <ul className="signup-terms">
        <li>{discountLabel} off every product, every size</li>
        <li>{chargedLabel} charged once, covering 12 months</li>
        <li>Renews annually · cancel any time before renewal</li>
      </ul>
      <button type="button" className="btn-primary" onClick={join} disabled={busy}>
        {busy ? 'Recording…' : 'Request enrolment'}
      </button>
      <p className="signup-note">
        No card details are collected today and nothing is charged — payment processing
        isn&rsquo;t connected yet. This records your enrolment so you&rsquo;re first in
        line. Prefer to skip it? Standard pricing needs no membership.
      </p>
      {error && <p className="gate-error">{error}</p>}
    </div>
  );
}
