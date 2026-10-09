import { createSession, hashPassword, randomToken, type AppEnv } from "./auth"
import { appUrl, id } from "./http"

export type OAuthProvider = "google" | "facebook"

type OAuthProfile = {
  subject: string
  email: string
  name: string
}

const FACEBOOK_API_VERSION = "v25.0"

export function isOAuthProvider(value: string): value is OAuthProvider {
  return value === "google" || value === "facebook"
}

function credentials(env: AppEnv, provider: OAuthProvider) {
  return provider === "google"
    ? { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }
    : { clientId: env.FACEBOOK_APP_ID, clientSecret: env.FACEBOOK_APP_SECRET }
}

export function oauthRedirectUri(
  request: Request,
  env: AppEnv,
  provider: OAuthProvider,
): string {
  return `${appUrl(request, env.APP_URL)}/api/auth/oauth/callback/${provider}`
}

export function oauthAuthorizationUrl(
  request: Request,
  env: AppEnv,
  provider: OAuthProvider,
  state: string,
): string {
  const { clientId } = credentials(env, provider)
  if (!clientId) throw new Error(`${provider} login is not configured`)
  const redirectUri = oauthRedirectUri(request, env, provider)
  if (provider === "google") {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth")
    url.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    }).toString()
    return url.toString()
  }
  const url = new URL(`https://www.facebook.com/${FACEBOOK_API_VERSION}/dialog/oauth`)
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "email,public_profile",
    state,
  }).toString()
  return url.toString()
}

export function oauthStateCookie(provider: OAuthProvider, state: string): string {
  return `sentinel_oauth_state=${encodeURIComponent(`${provider}:${state}`)}; Path=/api/auth/oauth/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
}

export const clearOAuthStateCookie =
  "sentinel_oauth_state=; Path=/api/auth/oauth/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=0"

export function readOAuthState(request: Request): string {
  const raw = request.headers.get("Cookie") ?? ""
  const part = raw
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("sentinel_oauth_state="))
  return part ? decodeURIComponent(part.slice("sentinel_oauth_state=".length)) : ""
}

async function exchangeCode(
  request: Request,
  env: AppEnv,
  provider: OAuthProvider,
  code: string,
): Promise<string> {
  const { clientId, clientSecret } = credentials(env, provider)
  if (!clientId || !clientSecret) throw new Error(`${provider} login is not configured`)
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: oauthRedirectUri(request, env, provider),
    code,
  })
  let response: Response
  if (provider === "google") {
    body.set("grant_type", "authorization_code")
    response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    })
  } else {
    response = await fetch(
      `https://graph.facebook.com/${FACEBOOK_API_VERSION}/oauth/access_token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      },
    )
  }
  const data = (await response.json()) as { access_token?: string; error?: unknown }
  if (!response.ok || !data.access_token) throw new Error("The provider rejected the login request")
  return data.access_token
}

async function fetchProfile(
  provider: OAuthProvider,
  accessToken: string,
): Promise<OAuthProfile> {
  const endpoint =
    provider === "google"
      ? "https://openidconnect.googleapis.com/v1/userinfo"
      : `https://graph.facebook.com/${FACEBOOK_API_VERSION}/me?fields=id,name,email`
  const response = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = (await response.json()) as Record<string, unknown>
  const subject = String(provider === "google" ? data.sub ?? "" : data.id ?? "")
  const email = String(data.email ?? "").trim().toLowerCase()
  const name = String(data.name ?? "").trim()
  if (
    !response.ok ||
    !subject ||
    !/^\S+@\S+\.\S+$/.test(email) ||
    !name ||
    (provider === "google" && data.email_verified !== true)
  )
    throw new Error("Your provider account did not return a verified email and name")
  return { subject, email, name }
}

export async function finishOAuthLogin(
  request: Request,
  env: AppEnv,
  provider: OAuthProvider,
  code: string,
): Promise<string> {
  const accessToken = await exchangeCode(request, env, provider, code)
  const profile = await fetchProfile(provider, accessToken)
  const linked = await env.DB.prepare(
    "SELECT user_id FROM oauth_accounts WHERE provider=? AND provider_subject=?",
  )
    .bind(provider, profile.subject)
    .first<{ user_id: string }>()
  let userId = linked?.user_id
  if (!userId) {
    const existing = await env.DB.prepare("SELECT id FROM users WHERE email=?")
      .bind(profile.email)
      .first<{ id: string }>()
    userId = existing?.id
    const now = new Date().toISOString()
    if (!userId) {
      userId = id()
      const workspaceId = id()
      const passwordData = await hashPassword(randomToken())
      await env.DB.prepare(
        "INSERT INTO users (id,email,name,password_hash,password_salt,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",
      )
        .bind(
          userId,
          profile.email,
          profile.name,
          passwordData.hash,
          passwordData.salt,
          now,
          now,
        )
        .run()
      await env.DB.prepare(
        "INSERT INTO workspaces (id,name,created_at,updated_at) VALUES (?,?,?,?)",
      )
        .bind(workspaceId, `${profile.name}'s K9 Unit`, now, now)
        .run()
      await env.DB.prepare(
        "INSERT INTO memberships (id,workspace_id,user_id,role,created_at) VALUES (?,?,?,?,?)",
      )
        .bind(id(), workspaceId, userId, "owner", now)
        .run()
    }
    await env.DB.prepare(
      "INSERT INTO oauth_accounts (id,user_id,provider,provider_subject,created_at,updated_at) VALUES (?,?,?,?,?,?)",
    )
      .bind(id(), userId, provider, profile.subject, now, now)
      .run()
  }
  return createSession(env.DB, userId)
}