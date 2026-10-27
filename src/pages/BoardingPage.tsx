import { useEffect, useMemo, useState } from "react"

import { Link, useNavigate, useSearchParams } from "react-router-dom"

import { AppShell, Panel } from "../components/AppShell"

import { boardingApi } from "../lib/boardingApi"

import { useAuth } from "../lib/auth"

import { boardingDays, boardingStayDays, type BoardingRecord } from "../types/boarding"
import Pagination from "../components/Pagination"
import SearchableSelect from "../components/SearchableSelect"

import { useCachedResource } from "../lib/useCachedResource"
const readBoarding = () => boardingApi.list()
const PAGE_SIZE = 10

export default function BoardingPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const { data: staysData = [], setData: setStaysData, loading, error, setError } = useCachedResource("/api/boarding/view", readBoarding)

  const [activePanel, setActivePanel] = useState<"boarding" | "checkedout" | "total">(() => searchParams.get("status") === "Boarding" ? "boarding" : searchParams.get("status") === "Checked Out" ? "checkedout" : "total")





  const [searchQuery, setSearchQuery] = useState("")

  const [dropdownFilter, setDropdownFilter] = useState("All")
  const [page, setPage] = useState(1)

  const [deletingId, setDeletingId] = useState("")

  const [updatingStatusId, setUpdatingStatusId] = useState("")

  const [checkoutConfirmation, setCheckoutConfirmation] = useState<{
    record: BoardingRecord
    checkOutDate: string
  } | null>(null)

  function filterByPanel(rows: BoardingRecord[]) {
    if (activePanel === "boarding") return rows.filter((row) => row.status === "Boarding")
    if (activePanel === "checkedout") return rows.filter((row) => row.status === "Checked Out")
    return rows
  }

  function filterByDropdown(rows: BoardingRecord[]) {
    return dropdownFilter === "All" ? rows : rows.filter((row) => row.status === dropdownFilter)
  }

  function filterBySearch(rows: BoardingRecord[]) {
    const term = searchQuery.trim().toLowerCase()
    return term ? rows.filter((row) => [row.k9.dogName, row.k9.nickName, row.ownerName, row.ownerPhone].join(" ").toLowerCase().includes(term)) : rows
  }

  const filtered = useMemo(() => {
    const panelRows = filterByPanel(staysData)
    return filterBySearch(activePanel === "total" ? filterByDropdown(panelRows) : panelRows)
  }, [staysData, activePanel, dropdownFilter, searchQuery])
  const visibleRecords = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  useEffect(() => { setPage(1) }, [activePanel, dropdownFilter, searchQuery])
  useEffect(() => { setPage((current) => Math.min(current, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)))) }, [filtered.length])

  function updateCounters(status: BoardingRecord["status"]) {
    return staysData.filter((record) => record.status === status).length
  }

  async function remove(record: BoardingRecord) {
    if (!window.confirm(`Delete the boarding record for ${record.k9.dogName}?`))
      return

    setDeletingId(record.id)

    try {
      await boardingApi.remove(record.id)
      setStaysData((rows) => (rows ?? []).filter((row) => row.id !== record.id))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not delete the boarding record.",
      )
    } finally {
      setDeletingId("")
    }
  }

  async function updateStatus(
    record: BoardingRecord,
    status: BoardingRecord["status"],
    confirmedCheckOutDate?: string,
  ) {
    if (
      !session?.permissions.create ||
      record.status === status ||
      updatingStatusId
    )
      return

    if (status === "Checked Out" && !confirmedCheckOutDate) {
      setCheckoutConfirmation({
        record,
        checkOutDate: record.checkOutDate || new Date().toISOString().slice(0, 10),
      })
      return
    }

    setUpdatingStatusId(record.id)

    setError("")

    const checkOutDate =
      status === "Checked Out"
        ? confirmedCheckOutDate || record.checkOutDate || new Date().toISOString().slice(0, 10)
        : ""

    try {
      const updated = await boardingApi.updateStatus(record.id, status, checkOutDate)

      setStaysData((rows) =>
        (rows ?? []).map((row) => (row.id === updated.id ? updated : row)),
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update boarding status.",
      )
    } finally {
      setUpdatingStatusId("")
    }
  }

  const activeCount = updateCounters("Boarding")
  const completedCount = updateCounters("Checked Out")
  const checkoutDays = checkoutConfirmation
    ? boardingStayDays(checkoutConfirmation.record.checkInDate, checkoutConfirmation.checkOutDate)
    : 0
  const checkoutTotal = checkoutConfirmation
    ? Math.round(checkoutDays * checkoutConfirmation.record.pricePerDay * 100) / 100
    : 0

  return (
    <AppShell title="Boarding">
      {checkoutConfirmation && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy/70 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-confirmation-title"
            className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-positive">Checkout summary</p>
            <h2 id="checkout-confirmation-title" className="mt-1 text-xl font-black">Confirm checkout</h2>
            <dl className="mt-5 space-y-3 rounded-xl border border-line bg-canvas p-4 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-muted">Dog</dt><dd className="font-bold">{checkoutConfirmation.record.k9.dogName}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted">Check-in</dt><dd className="font-bold">{checkoutConfirmation.record.checkInDate}</dd></div>
              <div className="flex items-center justify-between gap-4"><dt className="text-muted">Check-out</dt><dd><input aria-label="Check-out date" type="date" min={checkoutConfirmation.record.checkInDate} value={checkoutConfirmation.checkOutDate} onChange={(event) => setCheckoutConfirmation((current) => current ? { ...current, checkOutDate: event.target.value } : current)} className="rounded-lg border border-line bg-surface px-2 py-1 text-right text-sm font-bold text-ink" /></dd></div>
              <div className="flex justify-between gap-4 border-t border-line pt-3"><dt className="text-muted">Total ({checkoutDays} {checkoutDays === 1 ? "day" : "days"})</dt><dd className="font-black">{checkoutConfirmation.record.currency} {checkoutTotal.toFixed(2)}</dd></div>
            </dl>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setCheckoutConfirmation(null)} className="button-secondary">Cancel</button>
              <button type="button" disabled={!checkoutConfirmation.checkOutDate || checkoutConfirmation.checkOutDate < checkoutConfirmation.record.checkInDate || updatingStatusId === checkoutConfirmation.record.id} onClick={() => { const pending = checkoutConfirmation; setCheckoutConfirmation(null); void updateStatus(pending.record, "Checked Out", pending.checkOutDate) }} className="button-primary">{updatingStatusId === checkoutConfirmation.record.id ? "Saving…" : "Confirm checkout"}</button>
            </div>
          </section>
        </div>
      )}
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-positive">
            K9 stay records
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">
            Boarding, kept simple.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Each stay is connected to a dog already registered in your K9
            Roster.
          </p>
          {error && (
            <p role="alert" className="mt-2 text-xs font-bold text-danger">
              {error}
            </p>
          )}
        </div>
        <Link
          to="/boarding/new"
          className="button-primary"
        >
          + New boarding record
        </Link>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "Currently boarding",
            value: activeCount,
            category: "boarding" as const,
          },
          {
            label: "Checked out",
            value: completedCount,
            category: "checkedout" as const,
          },
          {
            label: "Total stays",
            value: staysData.length,
            category: "total" as const,
          },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            aria-pressed={activePanel === item.category}
            onClick={() => setActivePanel(item.category)}
            className={`rounded-2xl border text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-positive ${
              activePanel === item.category
                ? "selection-active"
                : "border-line hover:border-positive/50"
            }`}
          >
            <Panel className="h-full rounded-[inherit] border-0 bg-transparent p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted">
                  {item.label}
                </p>
                {activePanel === item.category && (
                  <span className="selection-active-badge">
                    Active
                  </span>
                )}
              </div>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
                {item.value}
              </p>
            </Panel>
          </button>
        ))}
      </div>

      <Panel>
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row">
          <label className="flex-1">
            <span className="sr-only">Search boarding records</span>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search dog or owner..."
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-navy"
            />
          </label>
          <label>
            <span className="sr-only">Filter boarding status</span>
            <SearchableSelect
              id="boarding-status-filter"
              value={dropdownFilter}
              options={["All", "Boarding", "Checked Out"].map((status) => ({ value: status, label: status }))}
              onChange={(value) => {
                setDropdownFilter(value)
                setActivePanel("total")
              }}
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm sm:w-auto"
            />
          </label>
        </div>
        {loading ? (
          <p className="p-8 text-center text-sm text-muted">
            Loading boarding records…
          </p>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-bold text-ink">
              {staysData.length ? "No matching stays" : "No boarding records yet"}
            </p>
            <p className="mt-1 text-xs text-muted">
              {staysData.length
                ? "Try another search or status filter."
                : "Start by selecting a registered K9 for its first stay."}
            </p>
            <Link
              to="/boarding/new"
              className="mt-4 inline-flex rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-white"
            >
              Create boarding record
            </Link>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead className="bg-canvas text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">
                  <tr>
                    <th className="px-5 py-3">K9</th>
                    <th className="px-4 py-3">Owner</th>
                    <th className="px-4 py-3">Check-in</th>
                    <th className="px-4 py-3">Check-out</th>
                    <th className="px-4 py-3">Stay</th>
                    <th className="px-4 py-3">Total price</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {visibleRecords.map((record) => (
                    <tr key={record.id}>
                      <td className="px-5 py-3">
                        <span className="block text-sm font-extrabold">
                          {record.k9.dogName}
                        </span>
                        <span className="text-[11px] text-muted">
                          {record.k9.breed || "K9"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="block text-xs font-bold">
                          {record.ownerName}
                        </span>
                        <span className="text-[11px] text-muted">
                          {record.ownerPhone || "No phone"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold">
                        {record.checkInDate}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold">
                        {record.checkOutDate || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold">
                        {boardingDays(record)}{" "}
                        {boardingDays(record) === 1 ? "day" : "days"}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold">
                        {record.totalAmount == null
                          ? "—"
                          : `${record.currency} ${record.totalAmount.toFixed(2)}`}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          <label
                            className={`inline-flex items-center gap-1.5 text-[10px] font-semibold ${
                              ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={record.status === "Boarding"}
                              disabled={updatingStatusId === record.id}
                              onChange={() =>
                                void updateStatus(record, "Boarding")
                              }
                              aria-label={`${record.k9.dogName} boarding`}
                              className="size-3.5 accent-emerald-600 disabled:cursor-not-allowed"
                            />
                            Boarding
                          </label>
                          <label
                            className={`inline-flex items-center gap-1.5 text-[10px] font-semibold ${
                              ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={record.status === "Checked Out"}
                              disabled={updatingStatusId === record.id}
                              onChange={() =>
                                void updateStatus(record, "Checked Out")
                              }
                              aria-label={`${record.k9.dogName} checked out`}
                              className="size-3.5 accent-emerald-600 disabled:cursor-not-allowed"
                            />
                            Checked out
                          </label>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
<Link
  to={`/boarding/${record.id}/edit`}
  className="rounded-lg border border-line px-3 py-1.5 text-[11px] font-bold text-info hover:bg-info-soft"
>
  Edit
</Link>
                            <button
                              type="button"
                              disabled={deletingId === record.id}
                              onClick={() => navigate("/subscribe", { replace: true })}
                              className="rounded-lg border border-line px-3 py-1.5 text-[11px] font-bold text-danger hover:bg-danger-soft disabled:opacity-50"
                            >
                              Delete
                            </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 p-4 md:hidden">
              {visibleRecords.map((record) => (
                <article
                  key={record.id}
                  className="rounded-xl border border-line p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-extrabold">
                        {record.k9.dogName}
                      </p>
                      <p className="text-[11px] text-muted">
                        {record.k9.breed || "K9"} · Owner: {record.ownerName}
                      </p>
                    </div>
                    <div className="grid shrink-0 gap-1">
                      <label
                        className={`inline-flex items-center gap-1.5 text-[10px] font-semibold ${
                          ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={record.status === "Boarding"}
                          disabled={updatingStatusId === record.id}
                          onChange={() => navigate("/subscribe", { replace: true })}
                          aria-label={`${record.k9.dogName} boarding`}
                          className="size-3.5 accent-emerald-600 disabled:cursor-not-allowed"
                        />
                        Boarding
                      </label>
                      <label
                        className={`inline-flex items-center gap-1.5 text-[10px] font-semibold ${
                          ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={record.status === "Checked Out"}
                          disabled={updatingStatusId === record.id}
                          onChange={() => navigate("/subscribe", { replace: true })}
                          aria-label={`${record.k9.dogName} checked out`}
                          className="size-3.5 accent-emerald-600 disabled:cursor-not-allowed"
                        />
                        Checked out
                      </label>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted">
                    {record.checkInDate} →{" "}
                    {record.checkOutDate || "Still boarding"} ·{" "}
                    {boardingDays(record)}{" "}
                    {boardingDays(record) === 1 ? "day" : "days"}
                  </p>
                  <p className="mt-2 text-xs font-bold text-ink">
                    Total price: {record.totalAmount == null
                      ? "—"
                      : `${record.currency} ${record.totalAmount.toFixed(2)}`}
                  </p>
                  {record.ownerPhone && (
                    <p className="mt-1 text-xs text-muted">
                      {record.ownerPhone}
                    </p>
                  )}
                    <div className="mt-3 flex gap-2">
                      <Link
                        to={`/boarding/${record.id}/edit`}
                        className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-info"
                      >
                        Edit
                      </Link>
                        <button
                          type="button"
                          onClick={() => navigate("/subscribe", { replace: true })}
                          className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-danger"
                        >
                          Delete
                        </button>
                    </div>
                </article>
              ))}
            </div>
            <Pagination page={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} label="stays" />
          </>
        )}
      </Panel>
    </AppShell>
  )
}

