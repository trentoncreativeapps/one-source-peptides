import Link from 'next/link';

export const metadata = { title: 'Privacy Policy — One Source Peptides' };

/**
 * Intentionally not drafted here. A privacy policy makes binding statements
 * about what is collected, where it is stored, and who it is shared with —
 * writing that speculatively would put inaccurate commitments in front of
 * users. The compliance pack has no privacy policy in it.
 */
export default function PrivacyPage() {
  return (
    <section className="section">
      <header className="section-head">
        <h1>Privacy Policy</h1>
      </header>

      <div className="draft-notice" role="note">
        <strong>Not yet published.</strong> A privacy policy has not been drafted for this
        site. It needs to state accurately what data is collected and where it is stored,
        and should be reviewed alongside the{' '}
        <Link href="/terms">Terms of Service</Link>, which is itself pending counsel
        sign-off.
      </div>

      <div className="prose">
        <p>
          For reference while it is being written: accounts on this site store a name,
          email address, researcher type, and optionally an organization name. Passwords
          and session handling are managed by Supabase Auth. Orders record what was
          purchased and the research-use certification timestamp.
        </p>
        <p>
          That description is factual as of now but is not a substitute for a published
          policy.
        </p>
      </div>
    </section>
  );
}
