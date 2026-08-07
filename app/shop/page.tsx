import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import ProductCard, { type CardProduct, type CardVariant } from '@/components/ProductCard';

export const metadata = { title: 'Catalog — One Source Peptides' };

export default async function ShopPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // The gate in practice: signed out reads the *_public views, which have no
  // price column. anon has no grant on `products`, so a logged-out request
  // cannot retrieve a price even by crafting its own query.
  const [{ data: products, error: pErr }, { data: variants, error: vErr }, { data: categories }] =
    await Promise.all([
      supabase
        .from(user ? 'products' : 'products_public')
        .select('id, slug, code, name, description, purity_pct')
        .order('name'),
      supabase
        .from(user ? 'product_variants' : 'product_variants_public')
        .select(
          user
            ? 'id, product_id, size_label, pack_size, price_cents, purchasable'
            : 'id, product_id, size_label, pack_size'
        )
        .order('sort_order'),
      supabase
        .from('categories')
        .select('slug, name')
        .eq('visible', true)
        .order('sort_order'),
    ]);

  if (pErr || vErr) {
    return (
      <section className="section">
        <h1>Catalog</h1>
        <p className="notice">Could not load the catalog. {pErr?.message ?? vErr?.message}</p>
      </section>
    );
  }

  const rows = (products ?? []) as unknown as CardProduct[];
  const allVariants = (variants ?? []) as unknown as (CardVariant & { product_id: string })[];

  const bySize = new Map<string, CardVariant[]>();
  for (const v of allVariants) {
    const list = bySize.get(v.product_id) ?? [];
    list.push(v);
    bySize.set(v.product_id, list);
  }

  return (
    <section className="section">
      <header className="section-head">
        <p className="eyebrow">Research catalogue</p>
        <h1>All peptides</h1>
        <p>
          {rows.length} products · {allVariants.length} sizes · every lot tested by HPLC
          and mass spectrometry
        </p>
      </header>

      <nav className="cat-filter" aria-label="Categories">
        <span className="is-current">All</span>
        {(categories ?? []).map((c) => (
          <Link key={c.slug} href={`/shop/${c.slug}`}>{c.name}</Link>
        ))}
      </nav>

      {!user && (
        <div className="login-prompt">
          <p>
            Pricing and ordering are available to verified account holders.{' '}
            <Link href="/login">Sign in or create an account</Link> to view pricing.
          </p>
        </div>
      )}

      <ul className="grid">
        {rows.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            variants={bySize.get(p.id) ?? []}
            signedIn={Boolean(user)}
          />
        ))}
      </ul>
    </section>
  );
}
