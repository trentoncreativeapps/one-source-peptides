import Link from 'next/link';

export const metadata = { title: 'Contact — One Source Peptides' };

/**
 * No form yet: submissions would need the Resend integration wired and an
 * inbox to land in. Plain contact details until then, so nothing silently
 * swallows a message.
 */
export default function ContactPage() {
  return (
    <section className="section">
      <header className="section-head">
        <h1>Contact</h1>
        <p>Institutional enquiries, certificate requests, and wholesale questions.</p>
      </header>

      <div className="prose">
        <p>
          A contact form is not connected yet. Until it is, email reaches us directly.
        </p>
        <p className="contact-line">
          <strong>Email:</strong>{' '}
          <a href="mailto:info@onesourcepeptides.com">info@onesourcepeptides.com</a>
        </p>
        <p>
          For certificates of analysis, include the product name and lot number if you
          have it. See the <Link href="/coa-library">COA Library</Link>.
        </p>
      </div>
    </section>
  );
}
