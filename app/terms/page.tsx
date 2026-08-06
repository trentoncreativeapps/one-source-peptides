import Markdown from '@/components/Markdown';
import { TERMS_OF_SERVICE } from '@/lib/legal';

export const metadata = { title: 'Terms of Service — One Source Peptides' };

export default function TermsPage() {
  return (
    <section className="section">
      <div className="draft-notice" role="note">
        <strong>Draft — not yet in force.</strong> This document is pending review by
        legal counsel and has not been signed off, particularly Section 4. Placeholder
        fields remain unfilled. It is published here for review only and does not
        constitute the Company&rsquo;s binding terms.
      </div>
      <Markdown source={TERMS_OF_SERVICE} />
    </section>
  );
}
