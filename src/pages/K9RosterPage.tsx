import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell, Panel } from "../components/AppShell";
import { k9Api } from "../lib/k9Api";
import { useAuth } from "../lib/auth";
import { k9Age, k9Initials, type K9Record } from "../types/k9";

function statusStyle(status: string): string {
  if (status === "Active") return "bg-positive-soft text-positive";
  if (status === "In Training") return "bg-info-soft text-info";
  if (status === "Medical Hold") return "bg-warning-soft text-warning";
  if (status === "Retired") return "bg-violet-soft text-violet";
  if (status === "Deceased") return "bg-danger-soft text-danger";
  return "bg-canvas text-muted";
}

export default function K9RosterPage() {
  const { session } = useAuth();
  const [records, setRecords] = useState<K9Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [deletingId, setDeletingId] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    k9Api
      .list()
      .then((rows) => {
        if (active) {
          setRecords(rows);
          setLoadError("");
        }
      })
      .catch(() => {
        if (active) setLoadError("Cloudflare unreachable — showing local records.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return records.filter((k9) => {
      const matchesStatus = statusFilter === "All" || k9.status === statusFilter;
      const matchesTerm =
        !term ||
        [k9.dogName, k9.nickName, k9.breed, k9.microchipNumber, k9.status]
          .join(" ")
          .toLowerCase()
          .includes(term);
      return matchesStatus && matchesTerm;
    });
  }, [records, search, statusFilter]);

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete ${name || "this K9 record"}?`)) return;
    setDeletingId(id);
    try {
      await k9Api.remove(id);
      setRecords((prev) => prev.filter((k9) => k9.id !== id));
    } catch {
      alert("Delete failed. Check the Cloudflare connection and retry.");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <AppShell title="K9 Roster">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-positive">Live roster database</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">Every K9, one command view.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            {session?.permissions.edit ? <>Click <strong className="text-ink">Add new record</strong> to register a K9. Click any row to edit its profile.</> : "View the unit roster or add a new K9 record."}
          </p>
          {loadError && <p className="mt-2 text-xs font-bold text-warning">{loadError}</p>}
        </div>
        {(session?.permissions.create || !session?.subscription.writable) && <Link to="/k9-roster/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-5 py-3 text-sm font-bold text-white shadow-action transition hover:bg-navy-light">
          <span className="text-lg leading-none text-gold">+</span>
          Add new record
        </Link>}
      </div>

      <Panel>
        <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center">
          <label className="flex flex-1 items-center gap-2 rounded-xl border border-line bg-canvas px-3 py-2.5">
            <span className="text-xs font-bold text-muted">Search</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Dog name, nickname, breed, microchip..."
              className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted/70" />
          </label>
          <div className="flex flex-wrap gap-2">
            {["All", "Active", "In Training", "Medical Hold", "Retired", "Deceased"].map((status) => (
              <button key={status} type="button" onClick={() => setStatusFilter(status)}
                className={`rounded-lg px-3 py-2 text-[11px] font-extrabold transition ${
                  statusFilter === status ? "bg-navy text-white" : "bg-canvas text-muted hover:text-ink"
                }`}>
                {status}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="grid gap-3 p-5">
            {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-canvas" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-canvas text-xl font-black text-muted">K9</div>
            <p className="mt-4 text-sm font-extrabold">No K9 records found</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted">
              Add your first K9 profile to start building the Cloudflare-connected roster.
            </p>
            {(session?.permissions.create || !session?.subscription.writable) && <Link to="/k9-roster/new"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-navy px-5 py-3 text-xs font-bold text-white">
              <span className="text-base leading-none text-gold">+</span> Add new record
            </Link>}
          </div>
        ) : (
          <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead>
                <tr className="bg-canvas/70 text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">
                  <th className="px-5 py-3">K9</th>
                  <th className="px-4 py-3">Breed</th>
                  <th className="px-4 py-3">Sex / Age</th>
                  <th className="px-4 py-3">Microchip</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="w-40 px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((k9) => (
                  <tr key={k9.id} className="border-t border-line transition hover:bg-canvas/60">
                    <td className="px-5 py-3">
                      <Link to={session?.permissions.edit ? `/k9-roster/${k9.id}/edit` : "/k9-roster"} className="flex items-center gap-3">
                        {k9.profilePhoto ? (
                          <img src={k9.profilePhoto} alt={k9.dogName} className="size-10 rounded-full border border-line object-cover" />
                        ) : (
                          <span className="grid size-10 place-items-center rounded-full bg-navy text-[11px] font-black text-gold">
                            {k9Initials(k9.dogName)}
                          </span>
                        )}
                        <span>
                          <span className="block text-sm font-extrabold text-ink hover:underline">
                            {k9.dogName || "Unnamed K9"}
                          </span>
                          <span className="block text-[11px] font-semibold text-muted">
                            {k9.nickName ? `"${k9.nickName}"` : "No nickname"}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold">{k9.breed || "—"}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate">
                      {[k9.sex, k9Age(k9.dateOfBirth)].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] font-semibold">{k9.microchipNumber || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-extrabold ${statusStyle(k9.status)}`}>
                        {k9.status || "Unset"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {session?.permissions.edit && <div className="flex justify-end gap-2">
                        <Link to={`/k9-roster/${k9.id}/edit`}
                          className="rounded-lg border border-line px-3 py-1.5 text-[11px] font-extrabold text-info hover:bg-info-soft">
                          Edit
                        </Link>
                        <button type="button" disabled={deletingId === k9.id} onClick={() => handleDelete(k9.id, k9.dogName)}
                          className="rounded-lg border border-line px-3 py-1.5 text-[11px] font-extrabold text-danger hover:bg-danger-soft disabled:opacity-50">
                          {deletingId === k9.id ? "..." : "Delete"}
                        </button>
                      </div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 border-t border-line p-4 md:hidden">
              {filtered.map((k9) => (
                <Link key={k9.id} to={session?.permissions.edit ? `/k9-roster/${k9.id}/edit` : "/k9-roster"}
                  className="flex items-center gap-3 rounded-xl border border-line p-3">
                  {k9.profilePhoto ? (
                    <img src={k9.profilePhoto} alt={k9.dogName} className="size-12 rounded-xl border border-line object-cover" />
                  ) : (
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-navy text-xs font-black text-gold">
                      {k9Initials(k9.dogName)}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-extrabold">{k9.dogName || "Unnamed K9"}</span>
                    <span className="block truncate text-[11px] font-semibold text-muted">
                      {[k9.breed, k9.sex].filter(Boolean).join(" · ") || "No details yet"}
                    </span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-extrabold ${statusStyle(k9.status)}`}>
                    {k9.status || "Unset"}
                  </span>
                </Link>
              ))}
            </div>
            <p className="border-t border-line px-5 py-3 text-[11px] font-semibold text-muted">
              {filtered.length} of {records.length} records · Cloudflare D1 endpoint /api/k9
            </p>
          </>
        )}

      </Panel>
    </AppShell>
  );
}
