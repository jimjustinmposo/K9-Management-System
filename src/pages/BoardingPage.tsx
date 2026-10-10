import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell, Panel } from "../components/AppShell";
import { boardingApi } from "../lib/boardingApi";
import { useAuth } from "../lib/auth";
import { boardingDays, type BoardingRecord } from "../types/boarding";

export default function BoardingPage() {
  const { session } = useAuth();
  const [records, setRecords] = useState<BoardingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [deletingId, setDeletingId] = useState("");

  useEffect(() => {
    let active = true;
    boardingApi.list().then((rows) => { if (active) { setRecords(rows); setError(""); } })
      .catch(() => { if (active) setError("Could not load boarding records. Check your connection and retry."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return records.filter((record) => (filter === "All" || record.status === filter) &&
      (!term || [record.k9.dogName, record.k9.nickName, record.ownerName, record.ownerPhone].join(" ").toLowerCase().includes(term)));
  }, [records, search, filter]);

  async function remove(record: BoardingRecord) {
    if (!window.confirm(`Delete the boarding record for ${record.k9.dogName}?`)) return;
    setDeletingId(record.id);
    try { await boardingApi.remove(record.id); setRecords((rows) => rows.filter((row) => row.id !== record.id)); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not delete the boarding record."); }
    finally { setDeletingId(""); }
  }

  const activeCount = records.filter((record) => record.status === "Boarding").length;
  const completedCount = records.filter((record) => record.status === "Checked Out").length;

  return (
    <AppShell title="Boarding">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-positive">K9 stay records</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">Boarding, kept simple.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Each stay is connected to a dog already registered in your K9 Roster.</p>
          {error && <p role="alert" className="mt-2 text-xs font-bold text-danger">{error}</p>}
        </div>
        {session?.permissions.create && <Link to="/boarding/new" className="inline-flex items-center justify-center rounded-xl bg-navy px-5 py-3 text-sm font-bold text-white shadow-action hover:bg-navy-light">+ New boarding record</Link>}
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[{ label: "Currently boarding", value: activeCount }, { label: "Checked out", value: completedCount }, { label: "Total stays", value: records.length }].map((item) => (
          <Panel key={item.label} className="p-4"><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted">{item.label}</p><p className="mt-1 font-rajdhani text-3xl font-bold text-ink">{item.value}</p></Panel>
        ))}
      </div>

      <Panel>
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row">
          <label className="flex-1"><span className="sr-only">Search boarding records</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search dog or owner..." className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-navy" /></label>
          <label><span className="sr-only">Filter boarding status</span><select value={filter} onChange={(event) => setFilter(event.target.value)} className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm sm:w-auto"><option>All</option><option>Boarding</option><option>Checked Out</option></select></label>
        </div>
        {loading ? <p className="p-8 text-center text-sm text-muted">Loading boarding records…</p> : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-bold text-ink">{records.length ? "No matching stays" : "No boarding records yet"}</p>
            <p className="mt-1 text-xs text-muted">{records.length ? "Try another search or status filter." : "Start by selecting a registered K9 for its first stay."}</p>
            {!records.length && session?.permissions.create && <Link to="/boarding/new" className="mt-4 inline-flex rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-white">Create boarding record</Link>}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block"><table className="w-full text-left"><thead className="bg-canvas text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted"><tr><th className="px-5 py-3">K9</th><th className="px-4 py-3">Owner</th><th className="px-4 py-3">Check-in</th><th className="px-4 py-3">Check-out</th><th className="px-4 py-3">Stay</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-line">{filtered.map((record) => <tr key={record.id}>
                <td className="px-5 py-3"><span className="block text-sm font-extrabold">{record.k9.dogName}</span><span className="text-[11px] text-muted">{record.k9.breed || "K9"}</span></td>
                <td className="px-4 py-3"><span className="block text-xs font-bold">{record.ownerName}</span><span className="text-[11px] text-muted">{record.ownerPhone || "No phone"}</span></td>
                <td className="px-4 py-3 text-xs font-semibold">{record.checkInDate}</td><td className="px-4 py-3 text-xs font-semibold">{record.checkOutDate || "—"}</td>
                <td className="px-4 py-3 text-xs font-semibold">{boardingDays(record)} {boardingDays(record) === 1 ? "day" : "days"}</td>
                <td className="px-4 py-3"><div className="flex flex-col gap-1.5"><label className="inline-flex items-center gap-1.5 text-[10px] font-semibold"><input type="checkbox" checked={record.status === "Boarding"} readOnly aria-label={`${record.k9.dogName} boarding`} className="size-3.5 accent-emerald-600" />Boarding</label><label className="inline-flex items-center gap-1.5 text-[10px] font-semibold"><input type="checkbox" checked={record.status === "Checked Out"} readOnly aria-label={`${record.k9.dogName} checked out`} className="size-3.5 accent-emerald-600" />Checked out</label></div></td>
                <td className="px-4 py-3"><div className="flex justify-end gap-2">{session?.permissions.edit && <Link to={`/boarding/${record.id}/edit`} className="rounded-lg border border-line px-3 py-1.5 text-[11px] font-bold text-info hover:bg-info-soft">Edit</Link>}{session?.permissions.delete && <button type="button" disabled={deletingId === record.id} onClick={() => void remove(record)} className="rounded-lg border border-line px-3 py-1.5 text-[11px] font-bold text-danger hover:bg-danger-soft disabled:opacity-50">Delete</button>}</div></td>
              </tr>)}</tbody>
            </table></div>
            <div className="grid gap-3 p-4 md:hidden">{filtered.map((record) => <article key={record.id} className="rounded-xl border border-line p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-extrabold">{record.k9.dogName}</p><p className="text-[11px] text-muted">{record.k9.breed || "K9"} · Owner: {record.ownerName}</p></div><div className="grid shrink-0 gap-1"><label className="inline-flex items-center gap-1.5 text-[10px] font-semibold"><input type="checkbox" checked={record.status === "Boarding"} readOnly aria-label={`${record.k9.dogName} boarding`} className="size-3.5 accent-emerald-600" />Boarding</label><label className="inline-flex items-center gap-1.5 text-[10px] font-semibold"><input type="checkbox" checked={record.status === "Checked Out"} readOnly aria-label={`${record.k9.dogName} checked out`} className="size-3.5 accent-emerald-600" />Checked out</label></div></div>
              <p className="mt-3 text-xs text-muted">{record.checkInDate} → {record.checkOutDate || "Still boarding"} · {boardingDays(record)} {boardingDays(record) === 1 ? "day" : "days"}</p>
              {record.ownerPhone && <p className="mt-1 text-xs text-muted">{record.ownerPhone}</p>}
              {(session?.permissions.edit || session?.permissions.delete) && <div className="mt-3 flex gap-2">{session?.permissions.edit && <Link to={`/boarding/${record.id}/edit`} className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-info">Edit</Link>}{session?.permissions.delete && <button type="button" onClick={() => void remove(record)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-danger">Delete</button>}</div>}
            </article>)}</div>
            <p className="border-t border-line px-5 py-3 text-[11px] font-semibold text-muted">Showing {filtered.length} of {records.length} stays</p>
          </>
        )}
      </Panel>
    </AppShell>
  );
}