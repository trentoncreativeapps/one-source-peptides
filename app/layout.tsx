import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/auth/actions';
import EntryGate from '@/components/EntryGate';

// Self-hosted at build time — no CDN request, so nothing to be blocked.
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Research Catalog — One Source Peptides',
  description:
    'High-purity research peptides with per-lot certificates of analysis, supplied strictly for laboratory research use. Not for human or animal use.',
};

const shopLinks = [
  { href: '/shop', label: 'All Peptides' },
  { href: '/shop/vials', label: 'Vials' },
  { href: '/shop/blends', label: 'Blends' },
  { href: '/shop/bioregulators', label: 'Bioregulators' },
];

const companyLinks = [
  { href: '/coa-library', label: 'COA Library' },
  { href: '/wholesale', label: 'Wholesale' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
];

const legalLinks = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/refund-policy', label: 'Refund Policy' },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en" className={inter.variable}>
      <body>
        {/* Announcement rail — both reference sites lead with one. Ours carries
            the compliance notice rather than a promotion. */}
        <div className="announce">
          <strong>Research Use Only.</strong> Not for human or animal use. Not a drug,
          food, or cosmetic.
        </div>

        <header className="site-header">
          <div className="header-inner">
            <Link href="/" className="brand">
              One Source <span>Peptides</span>
            </Link>

            <nav className="main-nav" aria-label="Main">
              {shopLinks.map((l) => (
                <Link key={l.href} href={l.href}>{l.label}</Link>
              ))}
              <Link href="/coa-library">COA Library</Link>
              <Link href="/wholesale">Wholesale</Link>
              <Link href="/faq">FAQ</Link>
            </nav>

            <div className="header-actions">
              {user ? (
                <form action={signOut}>
                  <button type="submit" className="btn-quiet">Sign out</button>
                </form>
              ) : (
                <Link href="/login" className="btn-quiet">Sign in or register</Link>
              )}
            </div>
          </div>
        </header>

        <main>{children}</main>

        <footer className="site-footer">
          <div className="footer-grid">
            <div className="footer-about">
              <p className="footer-brand">One Source <span>Peptides</span></p>
              <p>
                A supplier of research-grade peptides for laboratory and in-vitro
                research, with per-lot identity and purity testing by HPLC and mass
                spectrometry.
              </p>
            </div>

            <div className="footer-col">
              <h2>Shop</h2>
              {shopLinks.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
            </div>

            <div className="footer-col">
              <h2>Company</h2>
              {companyLinks.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
            </div>

            <div className="footer-col">
              <h2>Legal</h2>
              {legalLinks.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
            </div>
          </div>

          <div className="footer-legal">
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
