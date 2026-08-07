import Link from 'next/link';

export const metadata = { title: 'FAQ — One Source Peptides' };

/**
 * The six questions from spec §14. Answers are written only where the fact is
 * actually settled; the rest say so rather than inventing a figure. A stated
 * purity number or shipping cutoff that turns out to be wrong is worse than
 * an honest "not yet published".
 */
const faqs = [
  {
    q: 'Is every batch third-party tested?',
    a: (
      <>
        Each lot is tested by HPLC and mass spectrometry, and ships with a corresponding
        certificate of analysis. The{' '}
        <Link href="/coa-library">COA Library</Link> is where those certificates are
        published — it is not yet populated, so certificates are currently available on
        request rather than by download.
      </>
    ),
  },
  {
    q: 'What does "Research Use Only" mean?',
    a: (
      <>
        These materials are sold for in-vitro laboratory research by qualified personnel.
        They are not drugs, foods, cosmetics, or dietary supplements, and they are not for
        human or animal consumption, injection, or application of any kind. They have not
        been evaluated by the FDA for any use other than laboratory research, and nothing
        on this site should be read as a claim about effects in humans or animals.
      </>
    ),
  },
  {
    q: 'Who can order from this site?',
    a: (
      <>
        Ordering is limited to qualified research professionals and the laboratories,
        research institutions, and organizations that employ them. An account is required,
        and account holders must be 21 or older. Browsing the catalog does not require an
        account; pricing and ordering do.
      </>
    ),
  },
  {
    q: 'How fast is shipping, and what does it cost?',
    a: (
      <>
        Orders placed before <strong>12pm PST</strong>, Monday to Friday, ship the same
        business day. Shipping rates will be listed here shortly.
      </>
    ),
  },
  {
    q: "What's your purity standard?",
    a: (
      <>
        99% or higher. Purity is confirmed for each lot by high-performance liquid
        chromatography and reported on that lot&rsquo;s certificate of analysis, so the
        figure you rely on is the one for the material you receive rather than a
        site-wide average.
      </>
    ),
  },
  {
    q: 'How do I get a wholesale account?',
    a: (
      <>
        Wholesale pricing is available to clinics, practitioners, distributors, and
        institutions. See <Link href="/wholesale">Wholesale</Link> — applications are not
        open yet.
      </>
    ),
  },
];

export default function FaqPage() {
  return (
    <section className="section">
      <header className="section-head">
        <h1>Frequently asked questions</h1>
        <p>
          Fuller detail lives in the <Link href="/terms">Terms of Service</Link> and{' '}
          <Link href="/refund-policy">Refund Policy</Link>.
        </p>
      </header>

      <dl className="faq">
        {faqs.map((f) => (
          <div key={f.q} className="faq-item">
            <dt>{f.q}</dt>
            <dd>{f.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
