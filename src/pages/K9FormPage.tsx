import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell, Panel } from "../components/AppShell";
import { k9Api } from "../lib/k9Api";
import {
  EMPTY_K9_FORM,
  K9_BREED_OPTIONS,
  K9_SEX_OPTIONS,
  K9_STATUS_OPTIONS,
  k9Initials,
  type K9FormValues,
} from "../types/k9";

const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm font-semibold text-ink outline-none transition placeholder:font-medium placeholder:text-muted/70 focus:border-navy";

const labelClass = "mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.1em] text-slate";

export default function K9FormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<K9FormValues>(EMPTY_K9_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [photoError, setPhotoError] = useState("");

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    k9Api
      .get(id)
      .then((record) => {
        if (!active) return;
        if (!record) {
          setError("K9 record not found.");
          return;
        }
        setForm({
          profilePhoto: record.profilePhoto,
          dogName: record.dogName,
          nickName: record.nickName,
          breed: record.breed,
          dateOfBirth: record.dateOfBirth,
          sex: record.sex,
          status: record.status,
          microchipNumber: record.microchipNumber,
          fatherSire: record.fatherSire,
          motherDam: record.motherDam,
          notes: record.notes,
        });
      })
      .catch(() => {
        if (active) setError("Could not load this K9 record.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  function set<K extends keyof K9FormValues>(key: K, value: K9FormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handlePhotoFile(file: File | undefined) {
    setPhotoError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("Please choose an image file.");
      return;
    }
    if (file.size > 1_500_000) {
      setPhotoError("Photo must be under 1.5MB so it fits in Cloudflare D1.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      set("profilePhoto", String(reader.result ?? ""));
    };
    reader.onerror = () => setPhotoError("Could not read that photo.");
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.dogName.trim()) {
      setError("Dog Name is required.");
      return;
    }
    setSaving(true);
    try {
      if (isEdit && id) {
        await k9Api.update(id, form);
      } else {
        await k9Api.create(form);
      }
      navigate("/k9-roster", { replace: true });
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Save failed. Check the Cloudflare connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell title={isEdit ? "Edit K9 Record" : "Add New K9 Record"}>
        <Panel className="p-6">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-canvas" />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-canvas" />)}
          </div>
        </Panel>
      </AppShell>
    );
  }

  return (
    <AppShell title={isEdit ? "Edit K9 Record" : "Add New K9 Record"}>
      <div className="mb-6">
        <Link to="/k9-roster" className="text-xs font-extrabold text-info">← Back to K9 Roster</Link>
        <h2 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">
          {isEdit ? `Edit ${form.dogName || "K9 record"}` : "Register a new K9"}
        </h2>
        <p className="mt-1 text-sm text-muted">Saved to Cloudflare D1 table k9_roster.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-xs font-bold text-danger">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <Panel className="p-5">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">Profile photo</p>
            <div className="mt-3 flex flex-col items-center text-center">
              {form.profilePhoto ? (
                <img src={form.profilePhoto} alt="K9 profile"
                  className="size-36 rounded-2xl border border-line object-cover shadow-filter" />
              ) : (
                <div className="grid size-36 place-items-center rounded-2xl bg-navy text-3xl font-black text-gold">
                  {k9Initials(form.dogName || "K9")}
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => handlePhotoFile(e.target.files?.[0])} />
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="rounded-lg bg-navy px-4 py-2 text-[11px] font-extrabold text-white">
                  Upload photo
                </button>
                {form.profilePhoto && (
                  <button type="button" onClick={() => set("profilePhoto", "")}
                    className="rounded-lg border border-line px-4 py-2 text-[11px] font-extrabold text-danger">
                    Remove
                  </button>
                )}
              </div>
              {photoError && <p className="mt-2 text-[11px] font-bold text-danger">{photoError}</p>}
              <p className="mt-3 text-[11px] leading-5 text-muted">JPG/PNG under 1.5MB. Stored with the record.</p>
            </div>
          </Panel>

          <div className="grid gap-5">
            <Panel className="p-5">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">Identity</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="dogName">Dog Name *</label>
                  <input id="dogName" className={inputClass} value={form.dogName}
                    onChange={(e) => set("dogName", e.target.value)} placeholder="e.g. Rex" required />
                </div>
                <div>
                  <label className={labelClass} htmlFor="nickName">Nick Name</label>
                  <input id="nickName" className={inputClass} value={form.nickName}
                    onChange={(e) => set("nickName", e.target.value)} placeholder="e.g. Rexy" />
                </div>
                <div>
                  <label className={labelClass} htmlFor="breed">Breed</label>
                  <input id="breed" className={inputClass} list="k9-breeds" value={form.breed}
                    onChange={(e) => set("breed", e.target.value)} placeholder="Select or type a breed" />
                  <datalist id="k9-breeds">
                    {K9_BREED_OPTIONS.map((breed) => <option key={breed} value={breed} />)}
                  </datalist>
                </div>
                <div>
                  <label className={labelClass} htmlFor="dob">Date of birth</label>
                  <input id="dob" type="date" className={inputClass} value={form.dateOfBirth}
                    onChange={(e) => set("dateOfBirth", e.target.value)} />
                </div>
                <div>
                  <span className={labelClass}>Sex</span>
                  <div className="flex gap-2">
                    {K9_SEX_OPTIONS.map((sex) => (
                      <button key={sex} type="button" onClick={() => set("sex", form.sex === sex ? "" : sex)}
                        className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                          form.sex === sex ? "border-navy bg-navy text-white" : "border-line bg-surface text-muted"
                        }`}>
                        {sex}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelClass} htmlFor="status">Status</label>
                  <select id="status" className={inputClass} value={form.status}
                    onChange={(e) => set("status", e.target.value as K9FormValues["status"])}>
                    <option value="">Select status</option>
                    {K9_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass} htmlFor="microchip">Microchip #</label>
                  <input id="microchip" className={`${inputClass} font-mono`} value={form.microchipNumber}
                    onChange={(e) => set("microchipNumber", e.target.value)} placeholder="e.g. 985141012345678" />
                </div>
              </div>
            </Panel>

            <Panel className="p-5">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">Lineage</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="sire">Father (Sire)</label>
                  <input id="sire" className={inputClass} value={form.fatherSire}
                    onChange={(e) => set("fatherSire", e.target.value)} placeholder="Sire name" />
                </div>
                <div>
                  <label className={labelClass} htmlFor="dam">Mother (Dam)</label>
                  <input id="dam" className={inputClass} value={form.motherDam}
                    onChange={(e) => set("motherDam", e.target.value)} placeholder="Dam name" />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass} htmlFor="notes">Notes</label>
                  <textarea id="notes" rows={4} className={`${inputClass} resize-y`} value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                    placeholder="Temperament, training notes, medical flags..." />
                </div>
              </div>
            </Panel>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Link to="/k9-roster"
                className="rounded-xl border border-line bg-surface px-6 py-3 text-center text-sm font-bold text-slate hover:bg-canvas">
                Cancel
              </Link>
              <button type="submit" disabled={saving}
                className="rounded-xl bg-navy px-8 py-3 text-sm font-bold text-white shadow-action transition hover:bg-navy-light disabled:opacity-60">
                {saving ? "Saving..." : isEdit ? "Save changes" : "Add K9 record"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </AppShell>
  );
}

