/**
 * The reference sites get much of their credibility from a claim strip under
 * the hero: "99%+ purity", "same-day shipping", "USA made".
 *
 * Every claim below is one that can actually be substantiated today. Purity
 * percentage, shipping cutoff and manufacturing origin are deliberately absent
 * — there is no COA data loaded, no dispatch cutoff committed to, and the
 * compliance pack forbids stating figures that aren't confirmed. Add them here
 * once each is true and checkable.
 */
const items = [
  {
    label: 'HPLC + MS tested',
    detail: 'Identity and purity confirmed per lot',
  },
  {
    label: 'Certificate with every lot',
    detail: 'Reported at time of shipment',
  },
  {
    label: 'Research use only',
    detail: 'Sold to qualified researchers and institutions',
  },
  {
    label: 'Account-verified pricing',
    detail: 'Catalogue open, ordering restricted',
  },
];

export default function TrustStrip() {
  return (
    <ul className="trust-strip" aria-label="Product assurances">
      {items.map((i) => (
        <li key={i.label}>
          <span className="trust-check" aria-hidden="true" />
          <span className="trust-text">
            <strong>{i.label}</strong>
            <span>{i.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
