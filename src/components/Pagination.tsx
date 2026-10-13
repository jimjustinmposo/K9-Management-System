interface PaginationProps {
  page: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  label?: string
}

export default function Pagination({ page, totalItems, pageSize, onPageChange, onPageSizeChange, label = "records" }: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize)
  if (totalPages <= 1) return <p className="border-t border-line px-5 py-3 text-[11px] font-semibold text-muted">Showing {totalItems ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, totalItems)} of {totalItems} {label}</p>
  return <nav aria-label={`${label} pages`} className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
    <p className="text-[11px] font-semibold text-muted">Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalItems)} of {totalItems} {label}</p>
    <div className="flex flex-wrap items-center gap-2">
      {onPageSizeChange && <label className="flex items-center gap-2 text-[11px] font-semibold text-muted">Rows
        <select aria-label="Rows per page" value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))} className="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs font-bold text-ink">
          <option value={10}>10</option><option value={20}>20</option>
        </select>
      </label>}
      <button type="button" aria-label="Previous page" disabled={page === 1} onClick={() => onPageChange(page - 1)} className="rounded-lg border border-line px-3 py-2 text-xs font-extrabold text-slate hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
      <span aria-live="polite" className="px-2 text-xs font-bold text-muted">Page {page} of {totalPages}</span>
      <button type="button" aria-label="Next page" disabled={page === totalPages} onClick={() => onPageChange(page + 1)} className="rounded-lg border border-line px-3 py-2 text-xs font-extrabold text-slate hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40">Next</button>
    </div>
  </nav>
}