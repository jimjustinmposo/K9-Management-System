import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell, Panel } from "../components/AppShell";
import { boardingApi } from "../lib/boardingApi";
import { k9Api } from "../lib/k9Api";
import { BOARDING_STATUS_OPTIONS, EMPTY_BOARDING_FORM, type BoardingFormValues } from "../types/boarding";
import type { K9Record } from "../types/k9";

const inputClass = "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm font-semibold text-ink outline-none transition placeholder:font-medium placeholder:text-muted/70 focus:border-navy";
const labelClass = "mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.1em] text-slate";

export default function BoardingFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const [form, setForm] = useState<BoardingFormValues>(EMPTY_BOARDING_FORM);
  const [dogs, setDogs] = useState<K9Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([k9Api.list(), id ? boardingApi.get(id) : Promise.resolve(null)])
      .then(([roster, record]) => {
        if (!active) return;
        setDogs(roster);
        if (id && !record) { setError("Boarding record not found."); return; }
        if (record) setForm({ k9Id: record.k9Id, ownerName: record.ownerName, ownerPhone: record.ownerPhone, checkInDate: record.checkInDate, checkOutDate: record.checkOutDate, status: record.status, notes: record.notes });
      })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Could not load the form data."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  function set<K extends keyof BoardingFormValues>(key: K, value: BoardingFormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!form.k9Id) { setError("Select a dog from the K9 Roster."); return; }
    if (!form.ownerName.trim()) { setError("Owner name is required."); return; }
    if (form.checkOutDate && form.checkOutDate < form.checkInDate) { setError("Check-out date must be on or after check-in."); return; }
    setSaving(true);
    try {
      if (id) await boardingApi.update(id, form);
      else await boardingApi.create(form);
      navigate("/boarding", { replace: true });
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save the boarding record."); }
    finally { setSaving(false); }
  }

  if (loading) return <AppShell title={editing ? "Edit Boarding" : "New Boarding"}><Panel className="p-8 text-center text-sm text-muted">Loading…</Panel></AppShell>;

  return (
    <AppShell title={editing ? "Edit Boarding Record" : "New Boarding Record"}>
      <form onSubmit={(event) => void submit(event)} className="mx-auto max-w-3xl space-y-5">
        <div><p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-positive">Stay details</p><h2 className="mt-1 text-2xl font-black tracking-tight">{editing ? "Update a stay" : "Register a boarding stay"}</h2><p className="mt-2 text-sm text-muted">Choose a K9 that is already in your roster. New dogs must be registered there first.</p></div>
        {error && <p role="alert" className="rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
        {dogs.length === 0 ? <Panel className="p-6"><p className="text-sm font-bold">No registered K9s found</p><p className="mt-1 text-xs text-muted">Register the dog in your K9 Roster before creating a boarding record.</p><Link to="/k9-roster/new" className="mt-4 inline-flex rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-white">Register a K9</Link></Panel> : <>
          <Panel className="p-5"><label htmlFor="boarding-k9" className={labelClass}>K9 Roster record <span className="text-danger">*</span></label><select id="boarding-k9" required className={inputClass} value={form.k9Id} onChange={(event) => set("k9Id", event.target.value)}><option value="">Select a registered dog</option>{dogs.map((dog) => <option key={dog.id} value={dog.id}>{dog.dogName}{dog.nickName ? ` “${dog.nickName}”` : ""}{dog.breed ? ` · ${dog.breed}` : ""}</option>)}</select><p className="mt-2 text-xs text-muted">Dog details are linked from the roster and are not duplicated here.</p></Panel>
          <Panel className="p-5"><p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">Owner contact</p><div className="mt-4 grid gap-4 md:grid-cols-2"><div><label htmlFor="owner-name" className={labelClass}>Owner name <span className="text-danger">*</span></label><input id="owner-name" required className={inputClass} value={form.ownerName} onChange={(event) => set("ownerName", event.target.value)} placeholder="Owner or client name" /></div><div><label htmlFor="owner-phone" className={labelClass}>Phone</label><input id="owner-phone" type="tel" className={inputClass} value={form.ownerPhone} onChange={(event) => set("ownerPhone", event.target.value)} placeholder="Contact number" /></div></div></Panel>
          <Panel className="p-5"><p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">Stay dates & status</p><div className="mt-4 grid gap-4 md:grid-cols-3"><div><label htmlFor="check-in" className={labelClass}>Check-in <span className="text-danger">*</span></label><input id="check-in" required type="date" className={inputClass} value={form.checkInDate} onChange={(event) => set("checkInDate", event.target.value)} /></div><div><label htmlFor="check-out" className={labelClass}>Check-out</label><input id="check-out" type="date" min={form.checkInDate} className={inputClass} value={form.checkOutDate} onChange={(event) => { set("checkOutDate", event.target.value); set("status", event.target.value ? "Checked Out" : "Boarding"); }} /></div><div><label htmlFor="status" className={labelClass}>Status</label><select id="status" className={inputClass} value={form.status} onChange={(event) => set("status", event.target.value as BoardingFormValues["status"])}>{BOARDING_STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}</select></div></div></Panel>
          <Panel className="p-5"><label htmlFor="boarding-notes" className={labelClass}>Notes</label><textarea id="boarding-notes" rows={4} className={`${inputClass} resize-y`} value={form.notes} onChange={(event) => set("notes", event.target.value)} placeholder="Care notes or details for this stay…" /></Panel>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Link to="/boarding" className="rounded-xl border border-line bg-surface px-6 py-3 text-center text-sm font-bold text-slate hover:bg-canvas">Cancel</Link><button type="submit" disabled={saving || dogs.length === 0} className="rounded-xl bg-navy px-8 py-3 text-sm font-bold text-white shadow-action hover:bg-navy-light disabled:opacity-60">{saving ? "Saving…" : editing ? "Save changes" : "Create boarding record"}</button></div>
        </>}
      </form>
    </AppShell>
  );
}