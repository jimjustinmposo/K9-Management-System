import { isResponse, requireSession, type AppEnv } from "../../_lib/auth"
import { json } from "../../_lib/http"
import { paddleRequest } from "../../_lib/paddle"

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "manageBilling")
  if (isResponse(session)) return session

  const workspace = await context.env.DB.prepare(
    "SELECT paddle_customer_id, paddle_subscription_id FROM workspaces WHERE id=?",
  )
    .bind(session.workspace.id)
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