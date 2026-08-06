import Link from 'next/link';

export const metadata = { title: 'Wholesale — One Source Peptides' };

/**
 * Info page only. The application form is deliberately not built yet: per the
 * project docs, nobody is assigned to review applications and there is no SLA,
 * so a live form would collect submissions nothing happens to. The database
 * table (wholesale_applications) is ready for when that owner exists.
 */
export default function WholesalePage() {
  return (
    <section className="section">
      <header className="section-head">
        <h1>Wholesale</h1>
        <p>Volume pricing for clinics, practitioners, distributors, and institutions.</p>
      </header>

      <div className="two-col">
        <div className="prose">
          <h2>Eligibility</h2>
          <p>
            Wholesale accounts are available to clinics, licensed practitioners,
            distributors, and research institutions. Where applicable, a business licence
            or registration number is required, along with tax exemption documentation.
          </p>

          <h2>Pricing tiers</h2>
          <p>
            Wholesale pricing is tiered by volume and is separate from catalog pricing.
            Bulk pack sizes differ from retail. Specific tier structure has not been
            finalised and will be published here once set.
          </p>

          <h2>Approval</h2>
          <p>
            Applications are reviewed manually, not approved automatically. Wholesale
            accounts use a separate login from retail accounts — holding a retail account
            does not grant access to wholesale pricing.
          </p>
        </div>

        <aside className="callout">
          <h2>Applications are not open yet</h2>
          <p>
            The application process is not accepting submissions. A review process and
            owner need to be in place first — a form that collected applications nobody
            reviewed would waste applicants&rsquo; time.
          </p>
          <p>
            In the meantime, enquiries can go through <Link href="/contact">Contact</Link>.
          </p>
        </aside>
      </div>
    </section>
  );
}
