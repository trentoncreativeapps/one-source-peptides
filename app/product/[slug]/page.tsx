import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import VialImage from '@/components/VialImage';
import ProductCard, { type CardProduct, type CardVariant } from '@/components/ProductCard';
import { RUO_LISTING_NOTICE } from '@/lib/legal';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('products_public').select('name, description').eq('slug', slug).maybeSingle();
  if (!data) return { title: 'Product — One Source Peptides' };
  return {
    title: `${data.name} — One Source Peptides`,
    description: data.description ?? undefined,
  };
}

function money(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: product } = await supabase
    .from(user ? 'products' : 'products_public')
    .select('id, slug, code, name, description, research_summary, purity_pct, category_id')
    .eq('slug', slug)
    .maybeSingle();

  if (!product) notFound();

  const [{ data: variants }, { data: category }, { data: coas }] = await Promise.all([
    supabase
      .from(user ? 'product_variants' : 'product_variants_public')
      .select(
        user
          ? 'id, product_id, size_label, pack_size, price_cents, purchasable'
          : 'id, product_id, size_label, pack_size'
      )
      .eq('product_id', product.id)
      .order('sort_order'),
    supabase.from('categories').select('slug, name').eq('id', product.category_id).maybeSingle(),
    supabase
      .from('coa_records')
      .select('id, batch_lot, test_date, purity_pct, test_method, pdf_path')
      .eq('product_id', product.id)
      .order('test_date', { ascending: false }),
  ]);

  const sizes = (variants ?? []) as unknown as CardVariant[];
  const priced = sizes.filter((v) => v.price_cents != null && v.purchasable);
  const certificates = coas ?? [];

  // Related: same category, excluding this product
  const { data: related } = product.category_id
    ? await supabase
        .from(user ? 'products' : 'products_public')
        .select('id, slug, code, name, description, purity_pct')
        .eq('category_id', product.category_id)
        .neq('id', product.id)
        .limit(4)
    : { data: [] };

  const relatedRows = (related ?? []) as unknown as CardProduct[];
  const relatedIds = relatedRows.map((r) => r.id);
  const { data: relatedVariants } = relatedIds.length
    ? await supabase
        .from(user ? 'product_variants' : 'product_variants_public')
        .select(
          user
            ? 'id, product_id, size_label, pack_size, price_cents, purchasable'
            : 'id, product_id, size_label, pack_size'
        )
        .in('product_id', relatedIds)
        .order('sort_order')
    : { data: [] };

  const relBySize = new Map<string, CardVariant[]>();
  for (const v of (relatedVariants ?? []) as unknown as (CardVariant & { product_id: string })[]) {
    const list = relBySize.get(v.product_id) ?? [];
    list.push(v);
    relBySize.set(v.product_id, list);
  }

  return (
    <>
      <section className="section pdp">
        <p className="breadcrumb">
          <Link href="/shop">Catalogue</Link>
          {category && <> / <Link href={`/shop/${category.slug}`}>{category.name}</Link></>}
          {' / '}{product.name}
        </p>

        <div className="pdp-grid">
          <div className="pdp-media">
            <div className="pdp-image">
              <VialImage name={product.name} code={product.code} />
            </div>
          </div>

          <div className="pdp-info">
            <p className="card-code">{product.code}</p>
            <h1>{product.name}</h1>
            {product.description && <p className="pdp-lede">{product.description}</p>}

            <dl className="pdp-specs">
              <div>
                <dt>Available sizes</dt>
                <dd>
                  <div className="card-sizes">
                    {sizes.length
                      ? sizes.map((v) => (
                          <span key={v.id} className="size-chip">{v.size_label}</span>
                        ))
                      : <span className="size-chip is-empty">Not listed</span>}
                  </div>
                </dd>
              </div>
              <div>
                <dt>Format</dt>
                <dd>Lyophilised powder, sealed vial</dd>
              </div>
              <div>
                <dt>Per box</dt>
                <dd>{sizes[0]?.pack_size ?? 10} vials</dd>
              </div>
              <div>
                <dt>Purity</dt>
                <dd>
                  {product.purity_pct != null
                    ? `${product.purity_pct}% (this lot)`
                    : '99%+, confirmed per lot by HPLC'}
                </dd>
              </div>
              {category && (
                <div>
                  <dt>Category</dt>
                  <dd><Link href={`/shop/${category.slug}`}>{category.name}</Link></dd>
                </div>
              )}
            </dl>

            <div className="pdp-buy">
              {user ? (
                priced.length ? (
                  <ul className="price-table">
                    {sizes.map((v) => (
                      <li key={v.id}>
                        <span>{v.size_label}</span>
                        <span className="price-val">
                          {v.price_cents != null && v.purchasable
                            ? money(v.price_cents)
                            : 'Not yet listed'}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="pdp-pending">
                    Pricing for this product has not been published yet. Ordering opens once
                    pricing is live.
                  </p>
                )
              ) : (
                <>
                  <Link href="/login" className="btn-primary">Sign in to view pricing</Link>
                  <p className="pdp-pending">
                    The catalogue is open to browse. Pricing and ordering require a verified
                    research account.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Chemical profile / research data — structure from the compliance-pack
          template. Copy is written per product and not yet loaded. */}
      <section className="band band--surface">
        <div className="wrap">
          <div className="pdp-doc">
            <div>
              <h2>Chemical profile</h2>
              {product.research_summary ? (
                <p>{product.research_summary}</p>
              ) : (
                <p className="pdp-pending">
                  Sequence and formula data for this compound have not been published here
                  yet. Molecular data is provided on the certificate of analysis
                  accompanying each lot.
                </p>
              )}
            </div>
            <div>
              <h2>Format and handling</h2>
              <p>
                Supplied as a lyophilised powder. Recommended storage is &minus;20&nbsp;&deg;C
                for long-term storage; reconstituted solution should be stored per standard
                peptide handling protocols and used within the timeframe indicated on the
                certificate of analysis. Handling should be performed only by trained
                laboratory personnel using appropriate PPE and equipment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Certificate of analysis */}
      <section className="band">
        <div className="wrap">
          <header className="band-head band-head--row">
            <div>
              <p className="eyebrow">Documentation</p>
              <h2>Certificate of analysis</h2>
            </div>
            <Link href="/coa-library" className="link-arrow">COA Library →</Link>
          </header>

          {certificates.length ? (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Lot / batch</th><th>Tested</th><th>Purity</th>
                    <th>Method</th><th>Certificate</th>
                  </tr>
                </thead>
                <tbody>
                  {certificates.map((c) => (
                    <tr key={c.id}>
                      <td className="mono">{c.batch_lot}</td>
                      <td>{c.test_date ?? '—'}</td>
                      <td className="num">{c.purity_pct != null ? `${c.purity_pct}%` : '—'}</td>
                      <td>{c.test_method ?? '—'}</td>
                      <td>{c.pdf_path ? <a href={c.pdf_path}>Download PDF</a> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="pdp-pending">
              Certificates for this product are being published. Each lot ships with its
              certificate, and copies are available on request in the meantime.
            </p>
          )}
        </div>
      </section>

      {/* Mandatory on every listing, verbatim from the compliance pack */}
      <section className="band band--tight">
        <div className="wrap">
          <p className="ruo-block">{RUO_LISTING_NOTICE}</p>
        </div>
      </section>

      {relatedRows.length > 0 && (
        <section className="band band--surface">
          <div className="wrap">
            <header className="band-head">
              <p className="eyebrow">Same category</p>
              <h2>Related products</h2>
            </header>
            <ul className="grid">
              {relatedRows.map((r) => (
                <ProductCard
                  key={r.id}
                  product={r}
                  variants={relBySize.get(r.id) ?? []}
                  signedIn={Boolean(user)}
                />
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
