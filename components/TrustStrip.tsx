/**
 * The claim strip under the hero. Both reference sites lead with four of these.
 *
 * Purity and same-day shipping are confirmed by One Source. The shipping
 * cutoff time is NOT yet confirmed, so the detail line stays general rather
 * than naming an hour — goalphalabs commits to "before 12pm EST (M-F)", and
 * a cutoff we miss is worse than one we don't advertise.
 *
 * Still unconfirmed, so still absent: whether testing is by an independent
 * third-party lab (as opposed to in-house), and country of manufacture. Both
 * reference sites claim these; add them here once verified.
 */
const items = [
  {
    label: '99%+ purity',
    detail: 'Confirmed per lot, reported on the certificate',
  },
  {
    label: 'HPLC + MS tested',
    detail: 'Identity and purity determined for every lot',
  },
  {
    label: 'Same-day shipping',
    detail: 'Orders placed before the daily cutoff, Mon–Fri',
  },
  {
    label: 'Certificate with every lot',
    detail: 'Supplied at time of shipment',
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
