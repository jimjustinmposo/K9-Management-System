import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { AppShell, Panel } from "../components/AppShell"
import { handlersApi } from "../lib/handlersApi"
import { EMPTY_HANDLER_FORM, type HandlerFormValues } from "../types/handlers"

const inputClass = "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm font-semibold text-ink outline-none transition placeholder:font-medium placeholder:text-muted/70 focus:border-navy"
const labelClass = "mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.1em] text-slate"

export default function HandlerFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form, setForm] = useState<HandlerFormValues>(EMPTY_HANDLER_FORM)
  const [loading, setLoading] = useState(Boolean(id))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!id) return
    let active = true
    handlersApi.get(id).then((handler) => {
      if (active) setForm({ full_name: handler.full_name, nick_name: handler.nick_name, position: handler.position, email: handler.email, phone: handler.phone })
    }).catch((err) => { if (active) setError(err instanceof Error ? err.message : "Could not load handler.") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  function set<K extends keyof HandlerFormValues>(key: K, value: HandlerFormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    setSaving(true)
    try {
      if (id) await handlersApi.update(id, form)
      else await handlersApi.create(form)
      navigate("/handlers", { replace: true })
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save handler.") }
    finally { setSaving(false) }
  }

  if (loading) return <AppShell title="Edit Handler"><Panel className="p-8 text-center text-sm text-muted">Loading handler…</Panel></AppShell>

  return <AppShell title={id ? "Edit Handler" : "Add Handler"}>
    <form onSubmit={(event) => void submit(event)} className="mx-auto max-w-3xl space-y-5">
      <div><Link to="/handlers" className="text-xs font-bold text-positive">← Handler directory</Link><p className="mt-4 text-[11px] font-extrabold uppercase tracking-[.16em] text-positive">Personnel record</p><h2 className="mt-1 font-rajdhani text-3xl font-bold text-ink">{id ? "Update handler details" : "Add a team member"}</h2><p className="mt-1 text-sm text-muted">Enter the handler’s name, role and contact information.</p></div>
      {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{error}</p>}
      <Panel className="grid gap-4 p-5 md:grid-cols-2">
        <div><label htmlFor="full-name" className={labelClass}>Full name <span className="text-danger">*</span></label><input id="full-name" required maxLength={160} autoComplete="name" className={inputClass} value={form.full_name} onChange={(event) => set("full_name", event.target.value)} placeholder="Handler’s full name" /></div>
        <div><label htmlFor="nick-name" className={labelClass}>Nick name</label><input id="nick-name" maxLength={160} className={inputClass} value={form.nick_name} onChange={(event) => set("nick_name", event.target.value)} placeholder="Preferred name (optional)" /></div>
        <div><label htmlFor="position" className={labelClass}>Position <span className="text-danger">*</span></label><input id="position" required maxLength={160} className={inputClass} value={form.position} onChange={(event) => set("position", event.target.value)} placeholder="e.g. K9 Handler, Trainer" /></div>
        <div><label htmlFor="email" className={labelClass}>Gmail / email <span className="text-danger">*</span></label><input id="email" required type="email" maxLength={160} autoComplete="email" className={inputClass} value={form.email} onChange={(event) => set("email", event.target.value)} placeholder="name@gmail.com" /></div>
        <div className="md:col-span-2"><label htmlFor="phone" className={labelClass}>Number / phone <span className="text-danger">*</span></label><input id="phone" required type="tel" maxLength={160} autoComplete="tel" className={inputClass} value={form.phone} onChange={(event) => set("phone", event.target.value)} placeholder="Phone number, including country code" /></div>
      </Panel>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Link to="/handlers" className="rounded-xl border border-line bg-surface px-6 py-3 text-center text-sm font-bold text-slate hover:bg-canvas">Cancel</Link><button type="submit" disabled={saving} className="rounded-xl bg-navy px-8 py-3 text-sm font-bold text-white shadow-action hover:bg-navy-light disabled:opacity-60">{saving ? "Saving…" : id ? "Save changes" : "Create handler"}</button></div>
    </form>
  </AppShell>
}