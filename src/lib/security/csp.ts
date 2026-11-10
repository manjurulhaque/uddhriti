/**
 * Content Security Policy (CSP) Builder & Directives (CWE-79 Defense)
 *
 * Provides a hardened Content Security Policy that mitigates Cross-Site Scripting (XSS),
 * Clickjacking, unauthorized image exfiltration, and malicious resource injection.
 */

export interface CspOptions {
  isDev?: boolean
  supabaseUrl?: string
  additionalConnectSrc?: string[]
}

/**
 * Generates an object of CSP directive names and their allowed source expressions.
 */
export function buildCspDirectives(options: CspOptions = {}): Record<string, string[]> {
  const isDev =
    options.isDev ?? (process.env.NODE_ENV !== "production")

  const connectSrc = [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://*.vercel-insights.com",
    "https://*.vercel-analytics.com",
  ]

  const customSupabase = options.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL
  if (customSupabase) {
    try {
      const parsed = new URL(customSupabase)
      if (!connectSrc.includes(parsed.origin)) {
        connectSrc.push(parsed.origin)
      }
    } catch {
      // Discard invalid URL
    }
  }

  if (options.additionalConnectSrc) {
    for (const src of options.additionalConnectSrc) {
      if (!connectSrc.includes(src)) {
        connectSrc.push(src)
      }
    }
  }

  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    ...(isDev ? ["'unsafe-eval'"] : []),
    "https://va.vercel-scripts.com",
  ]

  const imgSrc = [
    "'self'",
    "data:",
    "blob:",
    "https://commons.wikimedia.org",
    "https://upload.wikimedia.org",
    "https://thumb.wikimedia.org",
    "https://*.wikimedia.org",
    "https://*.wikipedia.org",
    "https://covers.openlibrary.org",
  ]

  return {
    "default-src": ["'self'"],
    "script-src": scriptSrc,
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": imgSrc,
    "font-src": ["'self'", "data:"],
    "connect-src": connectSrc,
    "media-src": ["'none'"],
    "object-src": ["'none'"],
    "frame-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'"],
    "base-uri": ["'self'"],
    "manifest-src": ["'self'"],
    "worker-src": ["'self'", "blob:"],
    "upgrade-insecure-requests": [],
    "block-all-mixed-content": [],
  }
}

/**
 * Formats CSP directives into a standardized, compliant HTTP header string.
 */
export function buildCspHeader(options: CspOptions = {}): string {
  const directives = buildCspDirectives(options)
  return Object.entries(directives)
    .map(([directive, values]) => {
      if (values.length === 0) {
        return directive
      }
      return `${directive} ${values.join(" ")}`
    })
    .join("; ")
    .trim()
}

