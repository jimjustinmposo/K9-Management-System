import { isResponse, requireSession, type AppEnv } from "../../_lib/auth"
import { json } from "../../_lib/http"
import { paddleRequest } from "../../_lib/paddle"

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "manageBilling")
  if (isResponse(session)) return session

  const v2 = context.env.BILLING_V2_ENABLED === "true"
  const workspace = await context.env.DB.prepare(v2
    ? "SELECT customer_id paddle_customer_id,subscription_id paddle_subscription_id FROM billing_subscriptions WHERE workspace_id=? AND environment=? ORDER BY version DESC LIMIT 1"
    : "SELECT paddle_customer_id, paddle_subscription_id FROM workspaces WHERE id=?")
    .bind(...(v2 ? [session.workspace.id, context.env.PADDLE_ENVIRONMENT] : [session.workspace.id]))
    .first<{
      paddle_customer_id: string | null
      paddle_subscription_id: string | null
    }>()

  if (!workspace?.paddle_customer_id)
    return json({ error: "No Paddle billing customer is linked yet" }, 404)

  try {
    const portal = await paddleRequest<{
      urls: { general: { overview: string } }
    }>(
      context.env,
      `/customers/${encodeURIComponent(workspace.paddle_customer_id)}/portal-sessions`,
      {
        method: "POST",
        body: JSON.stringify({
          ...(workspace.paddle_subscription_id
            ? { subscription_ids: [workspace.paddle_subscription_id] }
            : {}),
        }),
      },
    )
    return json({ data: { url: portal.urls.general.overview } })
  } catch {
    return json({ error: "Unable to open billing management right now" }, 502)
  }
}