import { isResponse, requireSession, type AppEnv } from "../../_lib/auth"
import { json } from "../../_lib/http"
import { assertPaddleCheckoutEnabled } from "../../_lib/paddle"

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "view")
  if (isResponse(session)) return session
  try {
    assertPaddleCheckoutEnabled(context.env)
  } catch {
    return json({ error: "New checkouts are currently unavailable" }, 503)
  }
  return json({
    data: {
      clientToken: context.env.PADDLE_CLIENT_TOKEN,
      environment: context.env.PADDLE_ENVIRONMENT,
    },
  })
}