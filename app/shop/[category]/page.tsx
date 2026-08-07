import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMembership } from '@/lib/membership';
import ProductCard, { type CardProduct, type CardVariant } from '@/components/ProductCard';

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props) {
  const { category } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('categories').select('name').eq('slug', category).maybeSingle();
  return {
    title: data ? `${data.name} — One Source Peptides` : 'Category — One Source Peptides',
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { discountBp } = await getMembership();

  const [{ data: cat }, { data: allCats }] = await Promise.all([
    supabase.from('categories').select('id, slug, name, visible').eq('slug', category).maybeSingle(),
    supabase.from('categories').select('slug, name').eq('visible', true).order('sort_order'),
  ]);

  // Unknown slug, or a category deliberately hidden from nav (an empty shell).
  if (!cat || !cat.visible) notFound();

  const { data: products } = await supabase
    .from(user ? 'products' : 'products_public')
    .select('id, slug, code, name, description, purity_pct')
    .eq('category_id', cat.id)
    .order('name');

  const rows = (products ?? []) as unknown as CardProduct[];
  const ids = rows.map((p) => p.id);

  const { data: variants } = ids.length
    ? await supabase
        .from(user ? 'product_variants' : 'product_variants_public')
        .select(
          user
            ? 'id, product_id, size_label, pack_size, price_cents, purchasable'
            : 'id, product_id, size_label, pack_size'
        )
        .in('product_id', ids)
        .order('sort_order')
    : { data: [] };

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
        <p className="breadcrumb">
          <Link href="/shop">Catalogue</Link> / {cat.name}
        </p>
        <h1>{cat.name}</h1>
        <p>
          {rows.length} {rows.length === 1 ? 'product' : 'products'} · {allVariants.length} sizes
        </p>
      </header>

      <nav className="cat-filter" aria-label="Categories">
        <Link href="/shop">All</Link>
        {(allCats ?? []).map((c) =>
          c.slug === cat.slug ? (
            <span key={c.slug} className="is-current">{c.name}</span>
          ) : (
            <Link key={c.slug} href={`/shop/${c.slug}`}>{c.name}</Link>
          )
        )}
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
                discountBp={discountBp}
          />
        ))}
      </ul>
    </section>
  );
}
