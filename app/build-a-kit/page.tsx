import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import KitBuilder, { type KitOption } from '@/components/KitBuilder';

export const metadata = { title: 'Build a Kit — One Source Peptides' };

export default async function BuildAKitPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Options come from the price-free views for signed-out visitors, same as
  // everywhere else — building a kit never reveals pricing.
  const [{ data: products }, { data: variants }, { data: categories }] = await Promise.all([
    supabase
      .from(user ? 'products' : 'products_public')
      .select('id, name, code, category_id')
      .order('name'),
    supabase
      .from(user ? 'product_variants' : 'product_variants_public')
      .select('id, product_id, size_label, sort_order')
      .order('sort_order'),
    supabase.from('categories').select('id, name'),
  ]);

  const catName = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const productById = new Map((products ?? []).map((p) => [p.id, p]));

  const options: KitOption[] = (variants ?? [])
    .map((v) => {
      const p = productById.get(v.product_id);
      if (!p) return null;
      return {
        variantId: v.id,
        productName: p.name,
        code: p.code,
        sizeLabel: v.size_label,
        categoryName: p.category_id ? catName.get(p.category_id) ?? null : null,
      };
    })
    .filter((o): o is KitOption => o !== null);

  return (
    <>
      <section className="section">
        <header className="section-head">
          <p className="eyebrow">Custom panels</p>
          <h1>Build a kit</h1>
          <p>
            Assemble a panel from the catalogue — pick a kit size, add the compounds and
            sizes you need, and save it to reorder the same combination later.
          </p>
        </header>

        {!user && (
          <div className="login-prompt">
            <p>
              Kits can be built without an account. Saving a kit and ordering require a
              verified account — <Link href="/login">sign in or register</Link>.
            </p>
          </div>
        )}

        <KitBuilder options={options} signedIn={Boolean(user)} />
      </section>

      <section className="band band--tight">
        <div className="wrap">
          <p className="ruo-block">
            FOR RESEARCH USE ONLY. NOT FOR HUMAN OR ANIMAL USE. Kits are assembled from
            laboratory reference materials intended solely for in-vitro research by
            qualified personnel.
          </p>
        </div>
      </section>
    </>
  );
}
