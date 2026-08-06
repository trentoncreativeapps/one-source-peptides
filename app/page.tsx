import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();

  // Counts come from the public views, so this page renders identically
  // whether or not anyone is signed in.
  const [{ count: productCount }, { count: variantCount }, { data: categories }] =
    await Promise.all([
      supabase.from('products_public').select('id', { count: 'exact', head: true }),
      supabase.from('product_variants_public').select('id', { count: 'exact', head: true }),
      supabase.from('categories').select('slug, name').eq('visible', true).order('sort_order'),
    ]);

  return (
    <>
      <section className="hero">
        <p className="hero-eyebrow">Laboratory reference materials</p>
        <h1>
          High-purity peptides, supplied <em>for research use only</em>.
        </h1>
        <p className="hero-lede">
          One Source Peptides supplies a catalog of research-grade peptides with per-lot
          purity data, intended exclusively for laboratory and in-vitro research
          applications by qualified personnel.
        </p>
        <div className="hero-actions">
          <Link href="/shop" className="btn-primary">Browse the catalog</Link>
          <Link href="/coa-library" className="btn-ghost">COA Library</Link>
        </div>
        <p className="hero-banner">
          All products on this page are Research Use Only (RUO). They are not evaluated or
          approved by the FDA for human or veterinary use, and are not to be used for any
          purpose other than laboratory research.
        </p>
      </section>

      <section className="section">
        <header className="section-head">
          <h2>Catalog</h2>
          <p>
            {productCount ?? 0} products across {variantCount ?? 0} sizes.
          </p>
        </header>
        <ul className="cat-tiles">
          {(categories ?? []).map((c) => (
            <li key={c.slug}>
              <Link href={`/shop/${c.slug}`}>{c.name}</Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
