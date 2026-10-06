import { getSession, type AppEnv } from "../../_lib/auth"
import { json } from "../../_lib/http"

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
  const session = await getSession(context.request, context.env.DB)
  return session
    ? json({ data: session })
    : json({ error: "Authentication required" }, 401)
}
