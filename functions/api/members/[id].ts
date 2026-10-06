import { isResponse, requireSession, type AppEnv } from "../../_lib/auth"
import { json } from "../../_lib/http"
import { stripe } from "../../_lib/stripe"

async function reduceSeat(env: AppEnv, db: D1Database, workspaceId: string) {
  const workspace = await db
    .prepare("SELECT * FROM workspaces WHERE id=?")
    .bind(workspaceId)
    .first<any>()
  if (!workspace?.stripe_seat_item_id) return
  const members = await db
    .prepare(
      "SELECT COUNT(*) count FROM memberships WHERE workspace_id=? AND role='member'",
    )
    .bind(workspaceId)
    .first<any>()
  const pending = await db
    .prepare(
      "SELECT COUNT(*) count FROM invitations WHERE workspace_id=? AND status='pending' AND expires_at>?",
    )
    .bind(workspaceId, new Date().toISOString())
    .first<any>()
  const paid = Math.max(
    0,
    Number(members?.count ?? 0) + Number(pending?.count ?? 0) - 3,
  )
  if (paid === 0) {
    await stripe(env, `subscription_items/${workspace.stripe_seat_item_id}`, {
      method: "DELETE",
      body: new URLSearchParams({ proration_behavior: "create_prorations" }),
    })
    await db
      .prepare(
        "UPDATE workspaces SET stripe_seat_item_id=NULL,updated_at=? WHERE id=?",
      )
      .bind(new Date().toISOString(), workspaceId)
      .run()
  } else
    await stripe(env, `subscription_items/${workspace.stripe_seat_item_id}`, {
      method: "POST",
      body: new URLSearchParams({
        quantity: String(paid),
        proration_behavior: "create_prorations",
      }),
    })
}

export const onRequestDelete: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "manageMembers")
  if (isResponse(session)) return session
  const target = context.params.id as string
  const invite = await context.env.DB.prepare(
    "SELECT id FROM invitations WHERE id=? AND workspace_id=? AND status='pending'",
  )
    .bind(target, session.workspace.id)
    .first()
  if (invite)
    await context.env.DB.prepare(
      "UPDATE invitations SET status='revoked' WHERE id=?",
    )
      .bind(target)
      .run()
  else {
    const member = await context.env.DB.prepare(
      "SELECT m.id,u.email FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.user_id=? AND m.workspace_id=? AND m.role='member'",
    )
      .bind(target, session.workspace.id)
      .first<any>()
    if (!member) return json({ error: "Member or invitation not found" }, 404)
    await context.env.DB.prepare("DELETE FROM memberships WHERE id=?")
      .bind(member.id)
      .run()
    await context.env.DB.prepare("DELETE FROM sessions WHERE user_id=?")
      .bind(target)
      .run()
    await context.env.DB.prepare("DELETE FROM users WHERE id=?")
      .bind(target)
      .run()
    await context.env.DB.prepare(
      "DELETE FROM invitations WHERE workspace_id=? AND email=?",
    )
      .bind(session.workspace.id, member.email)
      .run()
  }
  try {
    await reduceSeat(context.env, context.env.DB, session.workspace.id)
  } catch (error) {
    return json(
      {
        error: "Access was removed, but Stripe seat synchronization failed",
        detail: String(error),
      },
      502,
    )
  }
  return json({ success: true })
}
