export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()

  if (!configured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "NEXT_PUBLIC_SITE_URL must be set to the public HTTPS site origin in production."
      )
    }

    return "http://localhost:3000"
  }

  let url: URL
  try {
    url = new URL(configured)
  } catch {
    throw new Error("NEXT_PUBLIC_SITE_URL must be a valid absolute URL.")
  }

  if (
    (url.protocol !== "https:" && url.protocol !== "http:") ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must contain only an HTTP(S) origin, without credentials, a path, query, or fragment."
    )
  }

  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS in production.")
  }

  return url.origin
}
