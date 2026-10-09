import { randomToken, type AppEnv } from "../../../_lib/auth"
import {
  isOAuthProvider,
  oauthAuthorizationUrl,
  oauthStateCookie,
} from "../../../_lib/oauth"

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
  const providerValue = context.params.provider
  const provider = Array.isArray(providerValue) ? providerValue[0] : providerValue
  if (!isOAuthProvider(provider)) return new Response("Unknown login provider", { status: 404 })
  try {
    const state = randomToken()
    return new Response(null, {
      status: 302,
      headers: {
        Location: oauthAuthorizationUrl(context.request, context.env, provider, state),
        "Set-Cookie": oauthStateCookie(provider, state),
        "Cache-Control": "no-store",
      },
    })
  } catch {
    return Response.redirect(
      `${new URL(context.request.url).origin}/login?oauth_error=Login+provider+is+not+configured`,
      302,
    )
  }
}