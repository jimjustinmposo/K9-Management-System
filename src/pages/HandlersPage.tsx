import { useCallback, useEffect, useState } from "react"
import { useLatestLoad } from "../lib/useLatestLoad"
import { Link } from "react-router-dom"
import { AppShell, Panel, PanelHeader } from "../components/AppShell"
import { useAuth } from "../lib/auth"
import { handlersApi } from "../lib/handlersApi"
import type { Handler } from "../types/handlers"
import Pagination from "../components/Pagination"

const PAGE_SIZE = 10

export default function HandlersPage() {
  const { session } = useAuth()
  const [items, setItems] = useState<Handler[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const read = useCallback(() => handlersApi.page(search, pageSize, (page - 1) * pageSize), [search, page, pageSize])
  const accept = useCallback((result: { data: Handler[]; total: number }) => { setItems(result.data); setTotal(result.total) }, [])
  const load = useLatestLoad(read, accept, setLoading, setError, "Could not load handlers.", search)
  useEffect(() => { setPage(1) }, [search])

  async function remove(handler: Handler) {
    if (!window.confirm(`Delete handler ${handler.full_name}?`)) return
    try { await handlersApi.remove(handler.id); await load() }
    catch (err) { setError(err instanceof Error ? err.message : "Could not delete handler.") }
  }

  return <AppShell title="Handlers">
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-positive">Personnel · K9 operations</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">Handler directory</h2>
          <p className="mt-1 text-sm text-muted">Keep your team’s contact details and roles in one place.</p>
        </div>
        {session?.role === "owner" && <Link to="/handlers/new" className="button-primary">+ Add handler</Link>}
      </div>

      <label className="block max-w-md">
        <span className="sr-only">Search handlers</span>
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, position, email or phone…" className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-positive" />
      </label>

      {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{error}</p>}
      <Panel>
        <PanelHeader eyebrow="Team register" title={`${total} handler${total === 1 ? "" : "s"}`} />
        {loading ? <p className="p-8 text-center text-sm text-muted">Loading handlers…</p>
          : total === 0 ? <div className="p-10 text-center"><p className="text-sm font-bold text-ink">{search ? "No matching handlers" : "No handlers added yet"}</p><p className="mt-1 text-xs text-muted">{search ? "Try another search term." : "Add your first handler to start the directory."}</p></div>
          : <div className="divide-y divide-line">{items.map((handler) => <article key={handler.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-full border border-positive/20 bg-positive-soft text-sm font-black text-positive" aria-hidden="true">{handler.full_name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</div>
              <div className="min-w-0"><h3 className="truncate text-sm font-bold text-ink">{handler.full_name}{handler.nick_name && <span className="ml-2 text-xs font-medium text-muted">“{handler.nick_name}”</span>}</h3><p className="mt-1 text-xs font-semibold text-positive">{handler.position}</p><p className="mt-1 break-all text-xs text-muted">{handler.email} · {handler.phone}</p></div>
            </div>
            <div className="flex shrink-0 items-center gap-2">{session?.permissions.edit && <Link className="button-edit" to={`/handlers/${encodeURIComponent(handler.id)}/edit`}>Edit</Link>}{session?.permissions.delete && <button type="button" className="button-delete" onClick={() => void remove(handler)}>Delete</button>}</div>
          </article>)}</div>}
        {!loading && total > 0 && <Pagination page={page} totalItems={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1) }} label="handlers" />}
      </Panel>
    </div>
  </AppShell>
}