import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props) {
  const { category } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('categories').select('name').eq('slug', category).maybeSingle();
  return { title: data ? `${data.name} — One Source Peptides` : 'Category — One Source Peptides' };
}

type Variant = {
  id: string; product_id: string; size_label: string; pack_size: number;
  price_cents?: number | null; purchasable?: boolean;
};

function money(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: cat } = await supabase
    .from('categories')
    .select('id, slug, name, visible')
    .eq('slug', category)
    .maybeSingle();

  // Unknown slug, or a category deliberately hidden from nav (empty shell).
  if (!cat || !cat.visible) notFound();

  // Same gate as /shop: signed out reads the price-free views.
  const { data: products } = await supabase
    .from(user ? 'products' : 'products_public')
    .select('id, slug, code, name, description, purity_pct')
    .eq('category_id', cat.id)
    .order('name');

  const ids = (products ?? []).map((p) => p.id);
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
    : { data: [] as Variant[] };

  const bySize = new Map<string, Variant[]>();
  for (const v of (variants ?? []) as unknown as Variant[]) {
    const list = bySize.get(v.product_id) ?? [];
    list.push(v);
    bySize.set(v.product_id, list);
  }

  const rows = products ?? [];

  return (
    <section className="section">
      <header className="section-head">
        <p className="breadcrumb">
          <Link href="/shop">Catalog</Link> / {cat.name}
        </p>
        <h1>{cat.name}</h1>
        <p>
          {rows.length} {rows.length === 1 ? 'product' : 'products'}
          {' · '}
          {(variants ?? []).length} sizes
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
              <div className="card-body">
                <p className="card-code">{p.code}</p>
                <h2 className="card-title">{p.name}</h2>
                {p.description && <p className="card-desc">{p.description}</p>}

                <dl className="spec">
                  <dt>Sizes</dt>
                  <dd>{sizes.length ? sizes.map((v) => v.size_label).join(' · ') : '—'}</dd>
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
                  <Link href="/login" className="btn-primary">Log in to view pricing</Link>
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
