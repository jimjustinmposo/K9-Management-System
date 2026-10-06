import { clearSessionCookie, hashToken, type AppEnv } from "../../_lib/auth"
import { json } from "../../_lib/http"

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
  const raw = (context.request.headers.get("Cookie") ?? "")
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith("sentinel_session="))
    ?.split("=")
    .slice(1)
    .join("=")
  if (raw)
    await context.env.DB.prepare("DELETE FROM sessions WHERE token_hash=?")
      .bind(await hashToken(decodeURIComponent(raw)))
      .run()
  return json({ success: true }, 200, { "Set-Cookie": clearSessionCookie })
}
