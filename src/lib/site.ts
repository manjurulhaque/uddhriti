export const DEFAULT_PRODUCTION_URL = "https://www.quotzen.com"

export function getSiteUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production"
      ? DEFAULT_PRODUCTION_URL
      : null)

  if (!configured) {
    return "http://localhost:3000"
  }

  let url: URL
  try {
    url = new URL(configured)
  } catch {
    return DEFAULT_PRODUCTION_URL
  }

  if (
    (url.protocol !== "https:" && url.protocol !== "http:") ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    return DEFAULT_PRODUCTION_URL
  }

  if (process.env.VERCEL_ENV === "production" && url.protocol !== "https:") {
    return DEFAULT_PRODUCTION_URL
  }

  return url.origin
}
