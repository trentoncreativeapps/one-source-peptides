'use client';

import { useEffect, useState } from 'react';
import { signIn, signUp } from '@/app/auth/actions';

const STORAGE_KEY = 'osp-gate-ack';
const RECONFIRM_DAYS = 30;

/**
 * Site-wide entry gate (spec §2). Shown on first visit, re-confirmed every 30
 * days. "Continue browsing" dismisses it — that grants browsing only; pricing
 * stays gated in the database regardless of what happens in this component.
 */
export default function EntryGate({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'login' | 'create'>('create');
  const [age, setAge] = useState(false);
  const [tos, setTos] = useState(false);
  const [type, setType] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (signedIn) return;
    let ack: number | null = null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      ack = raw ? Number(raw) : null;
    } catch {
      // private browsing can throw on localStorage; treat as un-acknowledged
    }
    const stale = !ack || Date.now() - ack > RECONFIRM_DAYS * 864e5;
    if (stale) setOpen(true);
  }, [signedIn]);

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      /* non-fatal */
    }
    setOpen(false);
  }

  const orgRequired = ['clinic', 'university', 'distributor'].includes(type);
  const canSubmit = tab === 'login' ? true : age && tos;

  async function onSubmit(formData: FormData) {
    setBusy(true);
    setError(null);
    const result = tab === 'login' ? await signIn(formData) : await signUp(formData);
    setBusy(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    dismiss();
  }

  if (!open) return null;

  return (
    <div className="gate-overlay" role="dialog" aria-modal="true" aria-labelledby="gate-title">
      <div className="gate-card">
        <p className="gate-eyebrow">Restricted access — research use only</p>
        <h2 id="gate-title">Before you enter the research catalog</h2>
        <p className="gate-lede">
          This catalog lists laboratory reference materials supplied strictly for in-vitro
          research. Products are not for human or animal use.
        </p>
        <ul className="gate-list">
          <li>Not for human or animal consumption, injection, or application of any kind</li>
          <li>Not for diagnosis, treatment, cure, or prevention of any disease</li>
          <li>To be handled only by qualified personnel in a controlled laboratory setting</li>
          <li>You must be 21 or older to hold an account</li>
        </ul>

        <div className="gate-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'create'}
            className={tab === 'create' ? 'gate-tab is-active' : 'gate-tab'}
            onClick={() => { setTab('create'); setError(null); }}
          >
            Create account
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'login'}
            className={tab === 'login' ? 'gate-tab is-active' : 'gate-tab'}
            onClick={() => { setTab('login'); setError(null); }}
          >
            Log in
          </button>
        </div>

        <form action={onSubmit} className="gate-form">
          {tab === 'create' && (
            <>
              <label className="field">
                <span>Full name</span>
                <input name="full_name" autoComplete="name" required />
              </label>
              <label className="field">
                <span>Researcher type</span>
                <select
                  name="researcher_type"
                  required
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="" disabled>Select one</option>
                  <option value="researcher">Researcher</option>
                  <option value="clinic">Clinic</option>
                  <option value="university">University</option>
                  <option value="distributor">Distributor</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="field">
                <span>
                  Organization / institution
                  {orgRequired ? '' : ' (optional)'}
                </span>
                <input name="organization" required={orgRequired} autoComplete="organization" />
              </label>
            </>
          )}

          <label className="field">
            <span>Email address</span>
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              name="password"
              type="password"
              required
              minLength={tab === 'create' ? 8 : undefined}
              autoComplete={tab === 'create' ? 'new-password' : 'current-password'}
            />
          </label>

          {tab === 'create' && (
            <div className="gate-checks">
              <label className="check">
                <input
                  type="checkbox"
                  name="age_confirmed"
                  checked={age}
                  onChange={(e) => setAge(e.target.checked)}
                />
                <span>I confirm I am 21 years of age or older.</span>
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  name="tos_accepted"
                  checked={tos}
                  onChange={(e) => setTos(e.target.checked)}
                />
                <span>
                  I have read and accept the{' '}
                  <a href="/terms" target="_blank" rel="noreferrer">Terms of Service</a>, and
                  certify that I am acquiring these materials for laboratory research only.
                </span>
              </label>
            </div>
          )}

          {error && <p className="gate-error" role="alert">{error}</p>}

          <button type="submit" className="gate-submit" disabled={!canSubmit || busy}>
            {busy
              ? 'Working…'
              : tab === 'create'
                ? 'Create account & enter'
                : 'Log in & enter'}
          </button>
        </form>

        <button type="button" className="gate-secondary" onClick={dismiss}>
          Continue browsing without an account
        </button>
        <p className="gate-footnote">
          Browsing without an account is allowed. Pricing and ordering require a
          verified account.
        </p>
      </div>
    </div>
  );
}
