import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const response = NextResponse.next()

  // ── Security headers ──────────────────────────────────────────────
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  )
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  )
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin")

  // ── Supabase auth token refresh ───────────────────────────────────
  // Keeps the session alive by writing refreshed cookies on every
  // matched request. Without this the server-side Supabase client
  // (which has setAll as a no-op) can silently lose the session.
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
            response.cookies.set(name, value, options)
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

  return response
}

export const config = {
  matcher: [
    // Run on admin routes (pages + API) to keep the auth session fresh and enforce edge access control
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/users/:path*",
  ],
}
