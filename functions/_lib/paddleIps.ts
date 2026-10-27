let cached: { addresses: Set<string>; expires: number } | undefined
let pending: Promise<Set<string>> | undefined

// Trust this header only behind Cloudflare's ingress, not a direct origin proxy.
export async function isPaddleLiveIp(request: Request): Promise<boolean> {
  const ip = request.headers.get("CF-Connecting-IP")
  if (!ip) return false
  if (!cached || cached.expires <= Date.now()) {
    pending ??= (async () => {
      const response = await fetch("https://api.paddle.com/ips", {
        signal: AbortSignal.timeout(2000),
      })
      if (!response.ok) throw new Error("Paddle IP lookup failed")
      const body = await response.json() as { data?: { ipv4_cidrs?: unknown } }
      const cidrs = body.data?.ipv4_cidrs
      if (!Array.isArray(cidrs) || !cidrs.length || cidrs.some((cidr) => {
        if (typeof cidr !== "string" || !/^\d{1,3}(\.\d{1,3}){3}\/32$/.test(cidr)) return true
        return cidr.slice(0, -3).split(".").some((part) => Number(part) > 255)
      })) throw new Error("Invalid Paddle IP response")
      const addresses = new Set<string>(cidrs.map((cidr: string) => cidr.slice(0, -3)))
      cached = { addresses, expires: Date.now() + 300_000 }
      return addresses
    })()
    try {
      return (await pending).has(ip)
    } finally {
      pending = undefined
    }
  }
  return cached.addresses.has(ip)
}