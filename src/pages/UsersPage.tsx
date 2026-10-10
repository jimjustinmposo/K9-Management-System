import { useEffect, useState, type FormEvent } from "react"
import { AppShell, Icon, Panel, PanelHeader } from "../components/AppShell"
import { apiRequest } from "../lib/auth"

type Member = {
  id: string
  name: string
  email: string
  role: "owner" | "member"
  created_at: string
}

export default function UsersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selected, setSelected] = useState<Member | null>(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState("")

  useEffect(() => {
    void loadMembers()
  }, [])

  async function loadMembers() {
    setLoading(true)
    setError("")
    try {
      const response = await apiRequest("/api/members")
      setMembers(response.data.members)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load users")
    } finally {
      setLoading(false)
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected) return
    setSaving(true)
    setError("")
    setSuccess("")
    const form = new FormData(event.currentTarget)
    const password = String(form.get("password") ?? "")
    const confirmPassword = String(form.get("confirmPassword") ?? "")
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setSaving(false)
      return
    }
    try {
      await apiRequest(`/api/members/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({ password }),
      })
      setSuccess(
        `${selected.name}'s password was reset. Their existing sessions were signed out.`,
      )
      setSelected(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to reset password")
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell title="Users">
      <div className="mx-auto max-w-5xl space-y-6">
        <Panel>
          <PanelHeader
            eyebrow="Administration"
            title="User accounts"
            action={
              <span className="rounded-full bg-info-soft px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-info">
                Owner only
              </span>
            }
          />
          <div className="p-5">
            <p className="max-w-2xl text-sm leading-6 text-muted">
              Reset a member's password manually. The member will be signed out on all
              devices and can sign in with the new password you provide.
            </p>
            {success && (
              <p className="mt-4 rounded-xl bg-positive-soft px-4 py-3 text-sm font-bold text-positive">
                {success}
              </p>
            )}
            {error && (
              <p role="alert" className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
                {error}
              </p>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Workspace users" />
          {loading ? (
            <p className="p-6 text-sm font-semibold text-muted">Loading users…</p>
          ) : members.length === 0 ? (
            <p className="p-6 text-sm font-semibold text-muted">No users found.</p>
          ) : (
            <div className="divide-y divide-line">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-navy text-gold">
                      <Icon name="users" className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-ink">{member.name}</p>
                      <p className="mt-1 truncate text-xs text-muted">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-canvas px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">
                      {member.role}
                    </span>
                    {member.role === "member" && (
                      <button
                        type="button"
                        onClick={() => {
                          setError("")
                          setSuccess("")
                          setSelected(member)
                        }}
                        className="rounded-lg bg-navy px-4 py-2 text-xs font-bold text-white transition hover:bg-navy-light"
                      >
                        Reset password
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy/70 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-member-title"
            className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl"
          >
            <h2 id="reset-member-title" className="text-xl font-black text-ink">
              Reset {selected.name}'s password
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Enter a temporary password and give it to {selected.email} securely.
            </p>
            <form className="mt-6 space-y-4" onSubmit={resetPassword}>
              <label className="block text-xs font-bold text-ink">
                New temporary password
                <input
                  className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3.5 py-3 text-sm font-semibold outline-none focus:border-navy"
                  name="password"
                  type="password"
                  minLength={6}
                  autoComplete="new-password"
                  required
                />
              </label>
              <label className="block text-xs font-bold text-ink">
                Confirm temporary password
                <input
                  className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3.5 py-3 text-sm font-semibold outline-none focus:border-navy"
                  name="confirmPassword"
                  type="password"
                  minLength={6}
                  autoComplete="new-password"
                  required
                />
              </label>
              {error && (
                <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-xs font-bold text-danger">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  disabled={saving}
                  className="rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-slate disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-white hover:bg-navy-light disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Resetting…" : "Reset password"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </AppShell>
  )
}