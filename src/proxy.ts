import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { enforceIpRateLimit } from "@/lib/api/rate-limit"

function isAllowedRequestOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin")
  if (!origin) {
    const referer = request.headers.get("referer")
    if (!referer) return true // Same-origin navigation or direct request
    try {
      const refererUrl = new URL(referer)
      const host = request.headers.get("host") || request.nextUrl.host
      return refererUrl.host.toLowerCase() === host.toLowerCase()
    } catch {
      return false
    }
  }

  try {
    const originUrl = new URL(origin)
    const host = request.headers.get("host") || request.nextUrl.host
    return originUrl.host.toLowerCase() === host.toLowerCase()
  } catch {
    return false
  }
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // ── CSRF Protection on Mutating Requests ───────────────────────────
  const mutatingMethods = ["POST", "PUT", "DELETE", "PATCH"]
  if (mutatingMethods.includes(request.method) && !isAllowedRequestOrigin(request)) {
    return NextResponse.json(
      { error: "Forbidden: cross-origin request rejected" },
      { status: 403 }
    )
  }

  // ── Edge Rate Limiting on Scraping-Prone Dynamic Endpoints ──────────
  if (pathname === "/quotes/random") {
    const rateLimited = enforceIpRateLimit(request, "randomQuote")
    if (rateLimited) {
      return rateLimited
    }
  }

  const response = NextResponse.next()

  // ── Security headers ──────────────────────────────────────────────
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()"
  )
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  )
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin")

  // ── Cache-Control for Sensitive & Admin Surfaces ───────────────────
  const isAdminSurface =
    pathname.startsWith("/api/admin/") ||
    pathname.startsWith("/api/users") ||
    pathname.startsWith("/admin")

  if (isAdminSurface) {
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    )
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")

    // ── Supabase auth token refresh & edge defense ───────────────────
    // Keeps the session alive by writing refreshed cookies on admin requests
    // with hardened cookie flags (sameSite=lax, secure).
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            for (const { name, value, options } of cookiesToSet) {
              request.cookies.set(name, value)
              response.cookies.set(name, value, {
                ...options,
                sameSite: options?.sameSite || "lax",
                secure: process.env.NODE_ENV === "production",
              })
            }
          },
        },
      }
    )

    // Validate and refresh the user session
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // ── Edge Defense-in-Depth for Protected API Endpoints ─────────────
    if (pathname.startsWith("/api/admin/") || pathname.startsWith("/api/users")) {
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    // ── Edge Defense-in-Depth for Admin UI Pages ───────────────────────
    if (pathname.startsWith("/admin")) {
      const isLoginPage = pathname === "/admin/login"
      const isLogoutPage = pathname === "/admin/logout"

      // If authenticated user visits login page, redirect to dashboard
      if (user && isLoginPage) {
        const dashboardUrl = request.nextUrl.clone()
        dashboardUrl.pathname = "/admin/dashboard"
        return NextResponse.redirect(dashboardUrl)
      }

      // If unauthenticated user tries to access protected admin pages, redirect to login
      if (!user && !isLoginPage && !isLogoutPage) {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = "/admin/login"
        return NextResponse.redirect(loginUrl)
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    // Run on admin routes (pages + API) to keep auth fresh, enforce edge auth, and protect against CSRF
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/users/:path*",
    "/api/quotes/:path*",
    "/quotes/random",
  ],
}
