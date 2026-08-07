import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getMembership } from '@/lib/membership';
import TrustStrip from '@/components/TrustStrip';
import ProductCard, { type CardProduct, type CardVariant } from '@/components/ProductCard';

const CATEGORY_BLURBS: Record<string, string> = {
  vials: 'Single-compound lyophilised powders in sealed vials.',
  blends: 'Co-formulated multi-component preparations.',
  bioregulators: 'Short peptide bioregulators.',
};

const FAQ_PREVIEW = [
  {
    q: 'What does "Research Use Only" mean?',
    a: 'These materials are for in-vitro laboratory research by qualified personnel. They are not drugs, foods, cosmetics or supplements, and not for human or animal use.',
  },
  {
    q: 'Is every batch third-party tested?',
    a: 'Each lot is tested by HPLC and mass spectrometry and ships with a corresponding certificate of analysis.',
  },
  {
    q: 'Who can order?',
    a: 'Qualified research professionals and the laboratories and institutions employing them. Browsing is open; pricing and ordering require a verified account.',
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { discountBp } = await getMembership();

  const [{ count: productCount }, { count: variantCount }, { data: categories }, { data: recent }] =
    await Promise.all([
      supabase.from('products_public').select('id', { count: 'exact', head: true }),
      supabase.from('product_variants_public').select('id', { count: 'exact', head: true }),
      supabase.from('categories').select('slug, name, visible').eq('visible', true).order('sort_order'),
      supabase
        .from(user ? 'products' : 'products_public')
        .select('id, slug, code, name, description, purity_pct')
        .order('created_at', { ascending: false })
        .limit(4),
    ]);

  const featured = (recent ?? []) as unknown as CardProduct[];
  const ids = featured.map((p) => p.id);
  const { data: featuredVariants } = ids.length
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

  const bySize = new Map<string, CardVariant[]>();
  for (const v of (featuredVariants ?? []) as unknown as (CardVariant & { product_id: string })[]) {
    const list = bySize.get(v.product_id) ?? [];
    list.push(v);
    bySize.set(v.product_id, list);
  }

  return (
    <>
      {/* 1 — Hero */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <p className="eyebrow">Laboratory reference materials</p>
            <h1>Research-grade peptides, supplied for research use only.</h1>
            <p className="hero-lede">
              {productCount ?? 0} compounds across {variantCount ?? 0} sizes, each lot
              tested by HPLC and mass spectrometry and shipped with its certificate of
              analysis.
            </p>
            <div className="hero-actions">
              <Link href="/shop" className="btn-primary">Browse the catalogue</Link>
              <Link href="/coa-library" className="btn-outline">View COA Library</Link>
            </div>
          </div>
          <div className="hero-logo">
            <Image
              src="/logo-lockup.png"
              alt="One Source Peptides"
              width={455}
              height={340}
              priority
              /* Source artwork is only 455px wide, so it is shown at 340px
                 (1.34x) rather than filling the column — a larger slot would
                 upscale and soften. A higher-resolution original would allow
                 this to grow. */
              sizes="(max-width: 900px) 220px, 340px"
            />
          </div>
        </div>
      </section>

      {/* 2 — Trust strip */}
      <section className="band band--tight">
        <div className="wrap"><TrustStrip /></div>
      </section>

      {/* 3 — Categories */}
      <section className="band">
        <div className="wrap">
          <header className="band-head">
            <p className="eyebrow">Explore the catalogue</p>
            <h2>Shop by category</h2>
          </header>
          <ul className="cat-grid">
            {(categories ?? []).map((c) => (
              <li key={c.slug}>
                <Link href={`/shop/${c.slug}`} className="cat-tile">
                  <span className="cat-name">{c.name}</span>
                  <span className="cat-blurb">{CATEGORY_BLURBS[c.slug] ?? ''}</span>
                  <span className="cat-go" aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 4 — Recently added */}
      <section className="band band--surface">
        <div className="wrap">
          <header className="band-head band-head--row">
            <div>
              <p className="eyebrow">Catalogue</p>
              <h2>Recently added</h2>
            </div>
            <Link href="/shop" className="link-arrow">View all products →</Link>
          </header>
          <ul className="grid">
            {featured.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                variants={bySize.get(p.id) ?? []}
                signedIn={Boolean(user)}
                discountBp={discountBp}
              />
            ))}
          </ul>
        </div>
      </section>

      {/* 5 — Account requirement */}
      {!user && (
        <section className="band">
          <div className="wrap">
            <div className="split-band">
              <div>
                <p className="eyebrow">Ordering</p>
                <h2>Pricing requires a verified account</h2>
                <p className="band-lede">
                  The full catalogue, sizes and specifications are open to browse without an
                  account. Pricing and ordering are restricted to verified research accounts
                  — pricing is withheld at the database level, not merely hidden from view.
                </p>
                <Link href="/login" className="btn-primary">Create an account</Link>
              </div>
              <ul className="checklist">
                <li>Researcher, clinic, university or distributor</li>
                <li>21 or older</li>
                <li>Research-use certification at checkout</li>
                <li>Wholesale tiers available on application</li>
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* 6 — Documentation */}
      <section className="band band--navy">
        <div className="wrap">
          <div className="split-band">
            <div>
              <p className="eyebrow eyebrow--light">Documentation and transparency</p>
              <h2>Every lot ships with its certificate</h2>
              <p className="band-lede">
                Identity and purity are determined per lot by high-performance liquid
                chromatography and mass spectrometry, and reported on the certificate
                accompanying that lot. Certificates are published openly — no account
                required to read them.
              </p>
              <Link href="/coa-library" className="btn-light">Open the COA Library</Link>
            </div>
            <dl className="stat-pair">
              <div>
                <dt>Test methods</dt>
                <dd>HPLC + MS</dd>
              </div>
              <div>
                <dt>Reported</dt>
                <dd>Per lot</dd>
              </div>
              <div>
                <dt>Access</dt>
                <dd>Public</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* 7 — FAQ preview */}
      <section className="band">
        <div className="wrap">
          <header className="band-head band-head--row">
            <div>
              <p className="eyebrow">Support and information</p>
              <h2>Frequently asked questions</h2>
            </div>
            <Link href="/faq" className="link-arrow">See all questions →</Link>
          </header>
          <dl className="faq faq--preview">
            {FAQ_PREVIEW.map((f) => (
              <div key={f.q} className="faq-item">
                <dt>{f.q}</dt>
                <dd>{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* 8 — Closing */}
      <section className="band band--tight closing">
        <div className="wrap closing-inner">
          <div>
            <h2>Browse the full research catalogue</h2>
            <p>{productCount ?? 0} compounds · {variantCount ?? 0} sizes · certificates per lot</p>
          </div>
          <Link href="/shop" className="btn-primary">Browse the catalogue</Link>
        </div>
      </section>
    </>
  );
}
