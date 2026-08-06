import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'COA Library — One Source Peptides' };

/**
 * Public by design (spec §6) — COA transparency is a trust signal and shouldn't
 * sit behind the gate. Reads coa_records, whose RLS policy allows anonymous
 * SELECT where is_public = true.
 */
export default async function CoaLibraryPage() {
  const supabase = await createClient();

  const { data: records, error } = await supabase
    .from('coa_records')
    .select('id, batch_lot, test_date, purity_pct, test_method, pdf_path, product_id')
    .order('test_date', { ascending: false });

  const rows = records ?? [];

  return (
    <section className="section">
      <header className="section-head">
        <h1>Certificate of Analysis Library</h1>
        <p>
          Per-lot identity and purity testing by HPLC and mass spectrometry. Public — no
          account required.
        </p>
      </header>

      {error && <p className="notice">Could not load certificates: {error.message}</p>}

      {!error && rows.length === 0 && (
        <div className="empty-state">
          <h2>No certificates published yet</h2>
          <p>
            This library is live but empty: COA documents have not been collected into it.
            Certificates are available on request in the meantime — see{' '}
            <Link href="/contact">Contact</Link>.
          </p>
          <p className="empty-note">
            Each lot ships with its certificate regardless of what is published here.
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Lot / batch</th>
                <th>Tested</th>
                <th>Purity</th>
                <th>Method</th>
                <th>Certificate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.batch_lot}</td>
                  <td>{r.test_date ?? '—'}</td>
                  <td className="num">{r.purity_pct != null ? `${r.purity_pct}%` : '—'}</td>
                  <td>{r.test_method ?? '—'}</td>
                  <td>
                    {r.pdf_path ? <a href={r.pdf_path}>Download PDF</a> : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
