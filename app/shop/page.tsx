import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import VialImage from '@/components/VialImage';

export const metadata = { title: 'Catalog — One Source Peptides' };

type PublicProduct = {
  id: string;
  slug: string;
  code: string;
  name: string;
  description: string | null;
  purity_pct: number | null;
  category_slug: string | null;
  category_name: string | null;
};

type Variant = { id: string; product_id: string; size_label: string; pack_size: number };
type PricedVariant = Variant & { price_cents: number | null; purchasable: boolean };

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function ShopPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // The gate, in practice: signed-out reads hit the *_public views, which have
  // no price column at all. Signed-in reads hit the base tables. This is not a
  // UI toggle — the anon role has no grant on `products`, so a logged-out
  // request cannot retrieve a price even by crafting its own query.
  const productSource = user ? 'products' : 'products_public';
  const variantSource = user ? 'product_variants' : 'product_variants_public';

  const productCols = user
    ? 'id, slug, code, name, description, purity_pct, category_id'
    : 'id, slug, code, name, description, purity_pct, category_slug, category_name';

  const [{ data: products, error: pErr }, { data: variants, error: vErr }, { data: categories }] =
    await Promise.all([
      supabase.from(productSource).select(productCols).order('name'),
      supabase
        .from(variantSource)
        .select(user ? 'id, product_id, size_label, pack_size, price_cents, purchasable' : 'id, product_id, size_label, pack_size')
        .order('sort_order'),
      supabase.from('categories').select('id, slug, name, visible').eq('visible', true).order('sort_order'),
    ]);

  if (pErr || vErr) {
    return (
      <section className="section">
        <h1>Catalog</h1>
        <p className="notice">
          The catalog could not be loaded. {pErr?.message ?? vErr?.message}
        </p>
      </section>
    );
  }

  const rows = (products ?? []) as unknown as PublicProduct[];
  const allVariants = (variants ?? []) as unknown as PricedVariant[];
  const bySize = new Map<string, PricedVariant[]>();
  for (const v of allVariants) {
    const list = bySize.get(v.product_id) ?? [];
    list.push(v);
    bySize.set(v.product_id, list);
  }

  return (
    <section className="section">
      <header className="section-head">
        <h1>Research Catalog</h1>
        <p>
          {rows.length} products · {allVariants.length} sizes ·{' '}
          {(categories ?? []).map((c) => c.name).join(' / ')}
        </p>
      </header>

      {!user && (
        <div className="login-prompt">
          <p>
            Pricing and ordering are available to verified account holders.{' '}
            <Link href="/login">Log in or create an account</Link> to view pricing.
          </p>
        </div>
      )}

      <ul className="grid">
        {rows.map((p) => {
          const sizes = bySize.get(p.id) ?? [];
          return (
            <li key={p.id} className="card">
              <div className="card-image">
                <VialImage name={p.name} code={p.code} />
              </div>
              <div className="card-body">
                <p className="card-code">{p.code}</p>
                <h2 className="card-title">{p.name}</h2>
                {p.description && <p className="card-desc">{p.description}</p>}

                <dl className="spec">
                  <dt>Sizes</dt>
                  <dd>
                    {sizes.length
                      ? sizes.map((v) => v.size_label).join(' · ')
                      : '—'}
                  </dd>
                  <dt>Per box</dt>
                  <dd>{sizes[0]?.pack_size ?? 10} vials</dd>
                  <dt>Purity</dt>
                  <dd>{p.purity_pct != null ? `${p.purity_pct}%` : 'See COA'}</dd>
                </dl>

                {user ? (
                  <ul className="price-list">
                    {sizes.map((v) => (
                      <li key={v.id}>
                        <span>{v.size_label}</span>
                        <span>
                          {v.price_cents != null && v.purchasable
                            ? money(v.price_cents)
                            : 'Not yet listed'}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Link href="/login" className="btn-primary">
                    Log in to view pricing
                  </Link>
                )}

                <p className="ruo-badge">RUO · Not for human use</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
