/**
 * Check whether an IP address belongs to a private or loopback range.
 * Works with both IPv4 and IPv6 addresses.
 */
export function isPrivateOrLocalIp(value: string) {
  if (value === "127.0.0.1" || value === "0.0.0.0" || value === "localhost") {
    return true
  }

  if (value.includes(":")) {
    const normalized = value.toLowerCase()

    return (
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80:") ||
      normalized.startsWith("fec0:")
    )
  }

  const octets = value.split(".").map(Number)
  if (octets.length !== 4 || octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) {
    return false
  }

  const [first, second] = octets

  return (
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254)
  )
}
