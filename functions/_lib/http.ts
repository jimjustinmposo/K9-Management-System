export function json(
  data: unknown,
  status = 200,
  headers: HeadersInit = {},
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  })
}

export function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

export function id(): string {
  return crypto.randomUUID()
}

export function appUrl(request: Request, configured?: string): string {
  return configured?.replace(/\/$/, "") || new URL(request.url).origin
}
