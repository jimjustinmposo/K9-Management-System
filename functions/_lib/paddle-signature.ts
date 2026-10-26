/** Verify the original body before parsing JSON. Never log bodies or secrets. */
export async function verifyPaddleSignature(
  rawBody: string,
  header: string,
  secret: string,
  now = Date.now(),
): Promise<boolean> {
  const timestamps: string[] = []
  const signatures: string[] = []
  for (const part of header.split(";")) {
    const separator = part.indexOf("=")
    if (separator < 0) return false
    const name = part.slice(0, separator).trim()
    const value = part.slice(separator + 1).trim()
    if (name === "ts") timestamps.push(value)
    if (name === "h1") signatures.push(value)
  }
  if (!secret || timestamps.length !== 1 || !/^\d+$/.test(timestamps[0])) return false
  const timestamp = Number(timestamps[0])
  if (!Number.isSafeInteger(timestamp) || !Number.isFinite(now) || Math.abs(now / 1000 - timestamp) > 5)
    return false
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"],
  )
  const message = new TextEncoder().encode(`${timestamps[0]}:${rawBody}`)
  // Paddle may send multiple h1 values during signing-key rotation.
  for (const signature of signatures) {
    if (!/^[a-fA-F0-9]{64}$/.test(signature)) continue
    const bytes = Uint8Array.from(signature.match(/../g)!, (hex) => parseInt(hex, 16))
    if (await crypto.subtle.verify("HMAC", key, bytes, message)) return true
  }
  return false
}