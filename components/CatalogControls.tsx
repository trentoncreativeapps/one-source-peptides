export const SORTS = {
  'name-asc': 'Name A–Z',
  'name-desc': 'Name Z–A',
  'newest': 'Recently added',
  'sizes': 'Most sizes',
} as const;

export type SortKey = keyof typeof SORTS;

/**
 * Search and sort as a plain GET form. State lives in the URL, so results are
 * shareable, the back button behaves, and the page stays server-rendered —
 * which matters here because the pricing gate depends on the query running
 * server-side under the visitor's own session.
 *
 * The submit button is present for keyboard and no-JS use; typing and pressing
 * Enter is the normal path.
 */
export default function CatalogControls({
  action,
  q,
  sort,
  resultCount,
  totalCount,
}: {
  action: string;
  q: string;
  sort: SortKey;
  resultCount: number;
  totalCount: number;
}) {
  return (
    <form className="catalog-controls" action={action} method="get" role="search">
      <div className="control-search">
        <label className="sr-only" htmlFor="catalog-q">Search the catalogue</label>
        <input
          id="catalog-q"
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name, code or size…"
          autoComplete="off"
        />
      </div>

      <div className="control-sort">
        <label htmlFor="catalog-sort">Sort</label>
        <select id="catalog-sort" name="sort" defaultValue={sort}>
          {Object.entries(SORTS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <button type="submit" className="btn-outline btn-sm">Apply</button>

      <p className="control-count" aria-live="polite">
        {q
          ? `${resultCount} of ${totalCount} products`
          : `${totalCount} products`}
      </p>
    </form>
  );
}
