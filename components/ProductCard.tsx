import Link from 'next/link';
import VialImage from '@/components/VialImage';
import { applyDiscount, money, formatPercent } from '@/lib/membership';

export type CardVariant = {
  id: string;
  size_label: string;
  pack_size: number;
  price_cents?: number | null;
  purchasable?: boolean;
};

export type CardProduct = {
  id: string;
  slug: string;
  code: string;
  name: string;
  description?: string | null;
  purity_pct?: number | null;
};

/**
 * Single card used by the catalogue, category pages, the homepage rail and the
 * related-products rail, so the logged-out state is defined once. When
 * `signedIn` is false the caller has already read from the price-free views —
 * there is no price to render, not a hidden one.
 *
 * `discountBp` comes from the server-resolved membership record. A non-member
 * gets 0 and sees list price; the member price is never computed client-side.
 */
export default function ProductCard({
  product,
  variants,
  signedIn,
  discountBp = 0,
}: {
  product: CardProduct;
  variants: CardVariant[];
  signedIn: boolean;
  discountBp?: number;
}) {
  const priced = variants.filter((v) => v.price_cents != null && v.purchasable);
  const cheapest = priced.length
    ? Math.min(...priced.map((v) => v.price_cents as number))
    : null;
  const memberPrice = cheapest != null ? applyDiscount(cheapest, discountBp) : null;
  const isMember = discountBp > 0;

  return (
    <li className="card">
      <Link href={`/product/${product.slug}`} className="card-image" aria-label={product.name}>
        <VialImage name={product.name} code={product.code} />
        <span className="card-tag">COA per lot</span>
      </Link>

      <div className="card-body">
        <p className="card-code">{product.code}</p>
        <h3 className="card-title">
          <Link href={`/product/${product.slug}`}>{product.name}</Link>
        </h3>
        {product.description && <p className="card-desc">{product.description}</p>}

        <div className="card-sizes">
          {variants.length
            ? variants.map((v) => (
                <span key={v.id} className="size-chip">{v.size_label}</span>
              ))
            : <span className="size-chip is-empty">No sizes listed</span>}
        </div>

        {/* Pack size is deliberately not shown: pack_size is currently seeded
            from the supplier sheet (10-vial boxes) and the retail selling unit
            is not yet confirmed. Showing "10 vials" before that is settled
            would misdescribe what a customer receives. */}
        <div className="card-meta">
          <span>{product.purity_pct != null ? `${product.purity_pct}% purity` : '99%+ purity'}</span>
          <span>COA per lot</span>
        </div>

        <div className="card-foot">
          {signedIn ? (
            cheapest != null ? (
              isMember ? (
                <span className="card-price">
                  from {money(memberPrice as number)}
                  <span className="price-was">{money(cheapest)}</span>
                  <span className="member-flag">{formatPercent(discountBp)} member</span>
                </span>
              ) : (
                <span className="card-price">from {money(cheapest)}</span>
              )
            ) : (
              <span className="card-price is-muted">Pricing not yet set</span>
            )
          ) : (
            <Link href="/login" className="btn-primary btn-sm">Sign in for pricing</Link>
          )}
        </div>

        <p className="ruo-badge">RUO · Not for human use</p>
      </div>
    </li>
  );
}
