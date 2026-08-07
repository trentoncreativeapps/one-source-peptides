'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { saveKit } from '@/app/build-a-kit/actions';

export type KitOption = {
  variantId: string;
  productName: string;
  code: string;
  sizeLabel: string;
  categoryName: string | null;
};

const SIZES = [3, 5, 10] as const;

export default function KitBuilder({
  options,
  signedIn,
}: {
  options: KitOption[];
  signedIn: boolean;
}) {
  const [target, setTarget] = useState<number | null>(5);
  const [picked, setPicked] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [kitName, setKitName] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const byId = useMemo(() => {
    const m = new Map<string, KitOption>();
    for (const o of options) m.set(o.variantId, o);
    return m;
  }, [options]);

  const visible = useMemo(() => {
    const n = filter.trim().toLowerCase();
    if (!n) return options.slice(0, 60);
    return options
      .filter(
        (o) =>
          o.productName.toLowerCase().includes(n) ||
          o.code.toLowerCase().includes(n) ||
          o.sizeLabel.toLowerCase().includes(n)
      )
      .slice(0, 60);
  }, [options, filter]);

  const full = target != null && picked.length >= target;

  function add(id: string) {
    if (full) return;
    setPicked((p) => [...p, id]);
    setStatus(null);
  }

  function removeAt(index: number) {
    setPicked((p) => p.filter((_, i) => i !== index));
    setStatus(null);
  }

  async function onSave(formData: FormData) {
    setBusy(true);
    setStatus(null);
    formData.set('variant_ids', picked.join(','));
    const result = await saveKit(formData);
    setBusy(false);
    if ('error' in result) { setStatus(result.error); return; }
    setStatus(`Saved “${result.name}”.`);
    setPicked([]);
    setKitName('');
  }

  return (
    <div className="kit">
      <div className="kit-panel">
        <h2>1 · Choose a kit size</h2>
        <div className="kit-sizes">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              className={target === s ? 'kit-size is-active' : 'kit-size'}
              onClick={() => setTarget(s)}
            >
              {s} vials
            </button>
          ))}
          <button
            type="button"
            className={target === null ? 'kit-size is-active' : 'kit-size'}
            onClick={() => setTarget(null)}
          >
            No limit
          </button>
        </div>

        <h2>2 · Add products</h2>
        <input
          type="search"
          className="kit-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name, code or size…"
          aria-label="Filter products"
        />

        {full && (
          <p className="kit-note">
            Kit is full at {target}. Remove something, or switch to a larger size.
          </p>
        )}

        <ul className="kit-options">
          {visible.map((o) => (
            <li key={o.variantId}>
              <span className="kit-opt-main">
                <strong>{o.productName}</strong>
                <span className="kit-opt-meta">
                  {o.sizeLabel}
                  {o.categoryName ? ` · ${o.categoryName}` : ''}
                </span>
              </span>
              <button
                type="button"
                className="btn-outline btn-sm"
                onClick={() => add(o.variantId)}
                disabled={full}
              >
                Add
              </button>
            </li>
          ))}
          {visible.length === 0 && <li className="kit-empty">No products match that filter.</li>}
        </ul>
      </div>

      <aside className="kit-summary">
        <h2>Your kit</h2>
        <p className="kit-count">
          {picked.length}
          {target != null ? ` of ${target}` : ''} selected
        </p>

        {picked.length === 0 ? (
          <p className="kit-note">Nothing added yet.</p>
        ) : (
          <ol className="kit-picked">
            {picked.map((id, i) => {
              const o = byId.get(id);
              if (!o) return null;
              return (
                <li key={`${id}-${i}`}>
                  <span>
                    <strong>{o.productName}</strong>
                    <span className="kit-opt-meta">{o.sizeLabel}</span>
                  </span>
                  <button type="button" className="kit-remove" onClick={() => removeAt(i)}>
                    Remove
                  </button>
                </li>
              );
            })}
          </ol>
        )}

        {/* No subtotal or bundle discount shown: pricing is not published yet,
            and an invented figure here would be worse than none. */}
        <p className="kit-pricing">
          Kit pricing, including the bundle discount, appears here once catalogue pricing
          is published.
        </p>

        {signedIn ? (
          <form action={onSave} className="kit-save">
            <label className="field">
              <span>Kit name</span>
              <input
                name="kit_name"
                value={kitName}
                onChange={(e) => setKitName(e.target.value)}
                placeholder="e.g. Repair panel — Feb"
              />
            </label>
            <button
              type="submit"
              className="btn-primary"
              disabled={busy || picked.length === 0}
            >
              {busy ? 'Saving…' : 'Save this kit'}
            </button>
          </form>
        ) : (
          <div className="kit-save">
            <Link href="/login" className="btn-primary">Sign in to save this kit</Link>
            <p className="kit-note">
              You can build a kit without an account; saving and ordering need one.
            </p>
          </div>
        )}

        {status && <p className="kit-status" role="status">{status}</p>}
      </aside>
    </div>
  );
}
