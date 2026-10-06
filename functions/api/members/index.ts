import {
  hashToken,
  isResponse,
  randomToken,
  requireSession,
  type AppEnv,
} from "../../_lib/auth"
import { sendEmail } from "../../_lib/email"
import { appUrl, clean, id, json } from "../../_lib/http"
import { stripe, stripePrice } from "../../_lib/stripe"

async function seatCount(db: D1Database, workspaceId: string): Promise<number> {
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
  return Number(members?.count ?? 0) + Number(pending?.count ?? 0)
}

async function setExtraSeats(
  env: AppEnv,
  workspace: any,
  quantity: number,
): Promise<string | null> {
  const paid = Math.max(0, quantity - 3)
  if (!workspace.stripe_subscription_id)
    throw new Error("An active subscription is required")
  if (!workspace.stripe_seat_item_id && paid > 0) {
    const item = await stripe(env, "subscription_items", {
      method: "POST",
      body: new URLSearchParams({
        subscription: workspace.stripe_subscription_id,
        price: stripePrice(env, workspace.billing_interval, true),
        quantity: String(paid),
        proration_behavior: "always_invoice",
      }),
    })
    return item.id
  }
  if (workspace.stripe_seat_item_id && paid === 0) {
    await stripe(env, `subscription_items/${workspace.stripe_seat_item_id}`, {
      method: "DELETE",
      body: new URLSearchParams({ proration_behavior: "create_prorations" }),
    })
    return null
  }
  if (workspace.stripe_seat_item_id)
    await stripe(env, `subscription_items/${workspace.stripe_seat_item_id}`, {
      method: "POST",
      body: new URLSearchParams({
        quantity: String(paid),
        proration_behavior: "always_invoice",
      }),
    })
  return workspace.stripe_seat_item_id ?? null
}

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "viewAdmin")
  if (isResponse(session)) return session
  const [members, invites] = await Promise.all([
    context.env.DB.prepare(
      "SELECT u.id,u.name,u.email,m.role,m.created_at FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.workspace_id=? ORDER BY m.created_at",
    )
      .bind(session.workspace.id)
      .all(),
    context.env.DB.prepare(
      "SELECT id,email,status,expires_at,created_at FROM invitations WHERE workspace_id=? AND status='pending' ORDER BY created_at DESC",
    )
      .bind(session.workspace.id)
      .all(),
  ])
  const used = await seatCount(context.env.DB, session.workspace.id)
  return json({
    data: {
      members: members.results,
      invitations: invites.results,
      seats: { included: 3, used, extra: Math.max(0, used - 3) },
    },
  })
}

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "manageMembers")
  if (isResponse(session)) return session
  try {
    const email = clean(
      ((await context.request.json()) as any).email,
    ).toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(email))
      return json({ error: "A valid email is required" }, 400)
    if (
      await context.env.DB.prepare("SELECT id FROM users WHERE email=?")
        .bind(email)
        .first()
    )
      return json({ error: "This email already belongs to an account" }, 409)
    await context.env.DB.prepare(
      "DELETE FROM invitations WHERE workspace_id=? AND email=? AND (status!='pending' OR expires_at<=?)",
    )
      .bind(session.workspace.id, email, new Date().toISOString())
      .run()
    if (
      await context.env.DB.prepare(
        "SELECT id FROM invitations WHERE workspace_id=? AND email=? AND status='pending'",
      )
        .bind(session.workspace.id, email)
        .first()
    )
      return json({ error: "An invitation is already pending" }, 409)
    const workspace = await context.env.DB.prepare(
      "SELECT * FROM workspaces WHERE id=?",
    )
      .bind(session.workspace.id)
      .first<any>()
    const nextCount =
      (await seatCount(context.env.DB, session.workspace.id)) + 1
    const seatItemId = await setExtraSeats(context.env, workspace, nextCount)
    if (seatItemId !== workspace.stripe_seat_item_id)
      await context.env.DB.prepare(
        "UPDATE workspaces SET stripe_seat_item_id=?,updated_at=? WHERE id=?",
      )
        .bind(seatItemId, new Date().toISOString(), session.workspace.id)
        .run()
    const token = randomToken()
    const now = new Date()
    const inviteId = id()
    await context.env.DB.prepare(
      "INSERT INTO invitations (id,workspace_id,email,token_hash,status,expires_at,created_at) VALUES (?,?,?,?,?,?,?)",
    )
      .bind(
        inviteId,
        session.workspace.id,
        email,
        await hashToken(token),
        "pending",
        new Date(now.getTime() + 7 * 86400000).toISOString(),
        now.toISOString(),
      )
      .run()
    try {
      await sendEmail(
        context.env,
        email,
        `Join ${session.workspace.name} on Sentinel`,
        `<p>${session.user.name} invited you to ${session.workspace.name}.</p><p><a href="${appUrl(context.request, context.env.APP_URL)}/accept-invite?token=${encodeURIComponent(token)}">Accept invitation</a></p><p>This invitation expires in 7 days.</p>`,
      )
    } catch (error) {
      await context.env.DB.prepare("DELETE FROM invitations WHERE id=?")
        .bind(inviteId)
        .run()
      const rollbackItemId = await setExtraSeats(
        context.env,
        { ...workspace, stripe_seat_item_id: seatItemId },
        nextCount - 1,
      )
      await context.env.DB.prepare(
        "UPDATE workspaces SET stripe_seat_item_id=?,updated_at=? WHERE id=?",
      )
        .bind(rollbackItemId, new Date().toISOString(), session.workspace.id)
        .run()
      throw error
    }
    return json({ success: true }, 201)
  } catch (error) {
    return json(
      { error: "Unable to invite member", detail: String(error) },
      500,
    )
  }
}
