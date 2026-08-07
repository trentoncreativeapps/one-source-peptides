import Link from 'next/link';
import VialImage from '@/components/VialImage';

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

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Single card used by the catalogue, category pages and the homepage rail, so
 * the logged-out state can only be defined once. When `signedIn` is false the
 * caller has already read from the price-free views — there is no price to
 * render, not a hidden one.
 */
export default function ProductCard({
  product,
  variants,
  signedIn,
}: {
  product: CardProduct;
  variants: CardVariant[];
  signedIn: boolean;
}) {
  const priced = variants.filter((v) => v.price_cents != null && v.purchasable);

  return (
    <li className="card">
      <div className="card-image">
        <VialImage name={product.name} code={product.code} />
        <span className="card-tag">COA per lot</span>
      </div>

      <div className="card-body">
        <p className="card-code">{product.code}</p>
        <h3 className="card-title">{product.name}</h3>
        {product.description && <p className="card-desc">{product.description}</p>}

        <div className="card-sizes">
          {variants.length
            ? variants.map((v) => (
                <span key={v.id} className="size-chip">{v.size_label}</span>
              ))
            : <span className="size-chip is-empty">No sizes listed</span>}
        </div>

        <div className="card-meta">
          <span>{variants[0]?.pack_size ?? 10} vials / box</span>
          <span>{product.purity_pct != null ? `${product.purity_pct}% purity` : 'Purity per COA'}</span>
        </div>

        <div className="card-foot">
          {signedIn ? (
            priced.length ? (
              <span className="card-price">
                from {money(Math.min(...priced.map((v) => v.price_cents as number)))}
              </span>
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
