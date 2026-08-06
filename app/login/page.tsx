import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import EntryGate from '@/components/EntryGate';

export const metadata = { title: 'Log in — One Source Peptides' };

/**
 * /login reuses the entry-gate component rather than duplicating the form, so
 * the 21+ / ToS / researcher-type rules can only ever be defined in one place.
 */
export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/shop');

  return (
    <section className="section">
      <header className="section-head">
        <h1>Account access</h1>
        <p>
          Pricing and ordering require a verified research account. Browsing the catalog
          does not.
        </p>
      </header>
      {/* signedIn=false forces the gate open on this route */}
      <EntryGate signedIn={false} />
    </section>
  );
}
