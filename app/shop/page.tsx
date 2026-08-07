import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import ProductCard, { type CardProduct, type CardVariant } from '@/components/ProductCard';
import CatalogControls, { SORTS, type SortKey } from '@/components/CatalogControls';

export const metadata = { title: 'Catalog — One Source Peptides' };

type Props = { searchParams: Promise<{ q?: string; sort?: string }> };

type Row = CardProduct & { created_at?: string };

export default async function ShopPage({ searchParams }: Props) {
  const { q = '', sort = 'name-asc' } = await searchParams;
  const query = q.trim();
  const sortKey: SortKey = (Object.keys(SORTS) as SortKey[]).includes(sort as SortKey)
    ? (sort as SortKey)
    : 'name-asc';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: products, error: pErr }, { data: variants, error: vErr }, { data: categories }] =
    await Promise.all([
      supabase
        .from(user ? 'products' : 'products_public')
        .select('id, slug, code, name, description, purity_pct, created_at'),
      supabase
        .from(user ? 'product_variants' : 'product_variants_public')
        .select(
          user
            ? 'id, product_id, size_label, pack_size, price_cents, purchasable'
            : 'id, product_id, size_label, pack_size'
        )
        .order('sort_order'),
      supabase.from('categories').select('slug, name').eq('visible', true).order('sort_order'),
    ]);

  if (pErr || vErr) {
    return (
      <section className="section">
        <h1>Catalog</h1>
        <p className="notice">Could not load the catalog. {pErr?.message ?? vErr?.message}</p>
      </section>
    );
  }

  const all = (products ?? []) as unknown as Row[];
  const allVariants = (variants ?? []) as unknown as (CardVariant & { product_id: string })[];

  const bySize = new Map<string, CardVariant[]>();
  for (const v of allVariants) {
    const list = bySize.get(v.product_id) ?? [];
    list.push(v);
    bySize.set(v.product_id, list);
  }

  // Filtering happens here rather than in a PostgREST `or()` string: the
  // catalogue is 74 rows, and building that DSL from user input invites
  // injection into the filter grammar for no benefit.
  const needle = query.toLowerCase();
  const matched = needle
    ? all.filter((p) => {
        const sizes = (bySize.get(p.id) ?? []).map((v) => v.size_label).join(' ');
        return (
          p.name.toLowerCase().includes(needle) ||
          p.code.toLowerCase().includes(needle) ||
          (p.description ?? '').toLowerCase().includes(needle) ||
          sizes.toLowerCase().includes(needle)
        );
      })
    : all;

  const rows = [...matched].sort((a, b) => {
    switch (sortKey) {
      case 'name-desc': return b.name.localeCompare(a.name);
      case 'newest': return (b.created_at ?? '').localeCompare(a.created_at ?? '');
      case 'sizes':
        return (bySize.get(b.id)?.length ?? 0) - (bySize.get(a.id)?.length ?? 0);
      default: return a.name.localeCompare(b.name);
    }
  });

  return (
    <section className="section">
      <header className="section-head">
        <p className="eyebrow">Research catalogue</p>
        <h1>All peptides</h1>
        <p>
          {all.length} products · {allVariants.length} sizes · every lot tested by HPLC and
          mass spectrometry
        </p>
      </header>

      <nav className="cat-filter" aria-label="Categories">
        <span className="is-current">All</span>
        {(categories ?? []).map((c) => (
          <Link key={c.slug} href={`/shop/${c.slug}`}>{c.name}</Link>
        ))}
      </nav>

      <CatalogControls
        action="/shop"
        q={query}
        sort={sortKey}
        resultCount={rows.length}
        totalCount={all.length}
      />

      {!user && (
        <div className="login-prompt">
          <p>
            Pricing and ordering are available to verified account holders.{' '}
            <Link href="/login">Sign in or create an account</Link> to view pricing.
          </p>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="empty-state">
          <h2>Nothing matched “{query}”</h2>
          <p>Try a compound name, a product code, or a size such as 10mg.</p>
          <p><Link href="/shop">Clear the search</Link></p>
        </div>
      ) : (
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
      )}
    </section>
  );
}
