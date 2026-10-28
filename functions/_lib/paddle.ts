import type { AppEnv } from "./auth"

export function validatePaddleEnvironment(env: AppEnv): void {
  paddleApiBase(env.PADDLE_ENVIRONMENT)
  const sandbox = env.PADDLE_ENVIRONMENT === "sandbox"
  const keyPrefix = sandbox ? "pdl_sdbx_apikey_" : "pdl_live_apikey_"
  const tokenPrefix = sandbox ? "test_" : "live_"
  if (!env.PADDLE_API_KEY?.startsWith(keyPrefix))
    throw new Error("Paddle API key does not match the configured environment")
  if (!env.PADDLE_CLIENT_TOKEN?.startsWith(tokenPrefix))
    throw new Error("Paddle client token does not match the configured environment")
  const prices = [env.PADDLE_MONTHLY_PRICE_ID, env.PADDLE_YEARLY_PRICE_ID]
  if (prices.some((price) => !price || !/^pri_[a-z0-9]{26}$/.test(price)) || prices[0] === prices[1])
    throw new Error("Configure distinct Paddle monthly and yearly prices")
  if (env.PADDLE_ENVIRONMENT === "production" && env.LOCAL_DEV_FULL_ACCESS === "true")
    throw new Error("Local full access must not be enabled with live billing")
  // Price IDs have no environment prefix. Catalog ownership requires API verification.
}

export function assertPaddleCheckoutEnabled(env: AppEnv): void {
  validatePaddleEnvironment(env)
  if (env.PADDLE_CHECKOUT_ENABLED === "false") throw new Error("New checkouts are paused")
  if (env.PADDLE_CHECKOUT_ENABLED !== undefined && env.PADDLE_CHECKOUT_ENABLED !== "true")
    throw new Error("Invalid checkout enablement setting")
}


export function paddleApiBase(environment?: string): string {
  if (environment === "sandbox") return "https://sandbox-api.paddle.com"
  if (environment === "production") return "https://api.paddle.com"
  throw new Error("PADDLE_ENVIRONMENT must be sandbox or production")
}

export async function paddleRequest<T>(
  env: AppEnv,
  path: string,
  init: RequestInit,
): Promise<T> {
  validatePaddleEnvironment(env)
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Invalid Paddle API path")
  const headers = new Headers(init.headers)
  headers.set("Authorization", `Bearer ${env.PADDLE_API_KEY}`)
  headers.set("Content-Type", "application/json")
  headers.set("Paddle-Version", "1")
  const response = await fetch(`${paddleApiBase(env.PADDLE_ENVIRONMENT)}${path}`, {
    ...init,
    headers,
    redirect: "error",
  })
  const result = (await response.json().catch(() => null)) as
    | { data?: T; error?: { code?: string; detail?: string; message?: string } }
    | null
  if (!response.ok || !result?.data) {
    console.error("Paddle API request failed", {
      status: response.status,
      code: result?.error?.code,
      message: result?.error?.message,
      detail: result?.error?.detail,
    })
    throw new Error("Paddle request failed")
  }
  return result.data
}