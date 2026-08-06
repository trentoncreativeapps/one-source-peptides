import Markdown from '@/components/Markdown';
import { REFUND_POLICY } from '@/lib/legal';

export const metadata = { title: 'Refund & Cancellation Policy — One Source Peptides' };

export default function RefundPolicyPage() {
  return (
    <section className="section">
      <div className="draft-notice" role="note">
        <strong>Draft — not yet in force.</strong> Pending review by legal counsel.
        Published here for review only.
      </div>
      <Markdown source={REFUND_POLICY} />
    </section>
  );
}
