import { type AppEnv } from "../../../../_lib/auth"
import {
  clearOAuthStateCookie,
  finishOAuthLogin,
  isOAuthProvider,
  readOAuthState,
} from "../../../../_lib/oauth"

function redirect(request: Request, message?: string, sessionCookie?: string): Response {
  const location = message
    ? `${new URL(request.url).origin}/login?oauth_error=${encodeURIComponent(message)}`
    : `${new URL(request.url).origin}/`
  const headers = new Headers({ Location: location, "Cache-Control": "no-store" })
  headers.append("Set-Cookie", clearOAuthStateCookie)
  if (sessionCookie) headers.append("Set-Cookie", sessionCookie)
  return new Response(null, { status: 302, headers })
}

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
  const providerValue = context.params.provider
  const provider = Array.isArray(providerValue) ? providerValue[0] : providerValue
  if (!isOAuthProvider(provider)) return redirect(context.request, "Unknown login provider")
  const url = new URL(context.request.url)
  const state = url.searchParams.get("state") ?? ""
  if (!state || readOAuthState(context.request) !== `${provider}:${state}`)
    return redirect(context.request, "Login session expired. Please try again.")
  const providerError = url.searchParams.get("error")
  if (providerError) return redirect(context.request, "Login was cancelled or declined.")
  const code = url.searchParams.get("code")
  if (!code) return redirect(context.request, "The provider did not return a login code.")
  try {
    const sessionCookie = await finishOAuthLogin(
      context.request,
      context.env,
      provider,
      code,
    )
    return redirect(context.request, undefined, sessionCookie)
  } catch (error) {
    console.error("OAuth login failed", error)
    return redirect(context.request, "Social login failed. Please try again.")
  }
}