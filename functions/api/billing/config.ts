import { isResponse, requireSession, type AppEnv } from "../../_lib/auth"
import { json } from "../../_lib/http"
import { assertPaddleCheckoutEnabled, paddleCheckoutConfigMessage } from "../../_lib/paddle"

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "view")
  if (isResponse(session)) return session
  try {
    assertPaddleCheckoutEnabled(context.env)
  } catch (error) {
    return json({ error: paddleCheckoutConfigMessage(error) }, 503)
  }
  const workspace = await context.env.DB.prepare(
    "SELECT paddle_customer_id FROM workspaces WHERE id=?",
  ).bind(session.workspace.id).first<{ paddle_customer_id: string | null }>()
  return json({
    data: {
      clientToken: context.env.PADDLE_CLIENT_TOKEN,
      environment: context.env.PADDLE_ENVIRONMENT,
      customerId: workspace?.paddle_customer_id ?? null,
    },
  })
}
