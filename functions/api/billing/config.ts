import { isResponse, requireSession, type AppEnv } from "../../_lib/auth"
import { json } from "../../_lib/http"

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
  const session = await requireSession(context, "view")
  if (isResponse(session)) return session
  if (!context.env.PADDLE_CLIENT_TOKEN)
    return json({ error: "Paddle checkout is not configured" }, 503)
  return json({
    data: {
      clientToken: context.env.PADDLE_CLIENT_TOKEN,
      environment: context.env.PADDLE_ENVIRONMENT,
    },
  })
}