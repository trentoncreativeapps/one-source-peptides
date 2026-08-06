import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/auth/actions';
import EntryGate from '@/components/EntryGate';

export const metadata: Metadata = {
  title: 'Research Catalog — One Source Peptides',
  description:
    'High-purity peptides supplied strictly for laboratory research use. Not for human or animal use.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body>
        <div className="ruo-bar">
          <strong>Research Use Only.</strong> Not for human or animal use. Not a drug,
          food, or cosmetic.
        </div>

        <header className="site-header">
          <nav className="nav">
            <Link href="/" className="brand">
              One Source <span>Peptides</span>
            </Link>
            <div className="nav-links">
              <Link href="/shop">Catalog</Link>
              <Link href="/coa-library">COA Library</Link>
              <Link href="/wholesale">Wholesale</Link>
              <Link href="/faq">FAQ</Link>
            </div>
            <div className="nav-actions">
              {user ? (
                <form action={signOut}>
                  <button type="submit" className="btn-ghost">Sign out</button>
                </form>
              ) : (
                <Link href="/login" className="btn-ghost">Log in</Link>
              )}
            </div>
          </nav>
        </header>

        <main>{children}</main>

        <footer className="site-footer">
          <div className="footer-inner">
            <p className="disclaimer">
              FOR RESEARCH USE ONLY. NOT FOR HUMAN OR ANIMAL USE. All products offered on
              this site are intended solely for in-vitro laboratory research by qualified
              professionals. These products are not drugs, foods, cosmetics, or dietary
              supplements under the Federal Food, Drug, and Cosmetic Act, and have not been
              evaluated by the FDA for safety or efficacy for any use other than laboratory
              research. Purchaser assumes full responsibility for compliance with all
              applicable federal, state, and local laws governing the purchase, possession,
              and use of these materials. By purchasing, the buyer certifies they are a
              qualified researcher, laboratory, or institution and agrees not to resell,
              distribute, or use these products for human or animal consumption in any form.
            </p>
          </div>
        </footer>

        <EntryGate signedIn={Boolean(user)} />
      </body>
    </html>
  );
}
