import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function middleware(request: NextRequest) {
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

  // Refresh the session — this is the main purpose of running the
  // middleware for admin routes.
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    // Run on admin routes (pages + API) to keep the auth session fresh
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/users/:path*",
  ],
}
