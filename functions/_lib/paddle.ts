import type { AppEnv } from "./auth"

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
  if (!env.PADDLE_API_KEY) throw new Error("Paddle API key is not configured")
  const response = await fetch(`${paddleApiBase(env.PADDLE_ENVIRONMENT)}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.PADDLE_API_KEY}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  })
  const result = (await response.json().catch(() => null)) as
    | { data?: T; error?: { detail?: string; message?: string } }
    | null
  if (!response.ok || !result?.data) {
    console.error("Paddle API request failed", response.status, result?.error)
    throw new Error("Paddle request failed")
  }
  return result.data
}