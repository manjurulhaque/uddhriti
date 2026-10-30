import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { getSiteUrl } from "@/lib/site"
import { getSupabaseConfig } from "@/lib/security/env"

async function handleLogout() {
  const cookieStore = await cookies()
  const response = NextResponse.redirect(new URL("/admin/login", getSiteUrl()), 303)

  // ── Anti-Caching Headers & Cache Purge ──────────────────────────────
  // Prevents shared workstations or intermediate proxies from caching
  // redirect states or retaining authenticated views via back-button.
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  )
  response.headers.set("Pragma", "no-cache")
  response.headers.set("Expires", "0")
  response.headers.set("Clear-Site-Data", '"cache"')

  const isProduction = process.env.NODE_ENV === "production"
  const { url, anonKey } = getSupabaseConfig()

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          const hardenedOptions = {
            ...options,
            sameSite: options?.sameSite || ("lax" as const),
            secure: isProduction,
          }

          try {
            cookieStore.set(name, value, hardenedOptions)
          } catch {
            // Ignore if cookieStore cannot be modified directly in the current context
          }
          response.cookies.set(name, value, hardenedOptions)
        }
      },
    },
  })

  await supabase.auth.signOut()

  return response
}

export async function POST() {
  return handleLogout()
}

export async function GET() {
  return handleLogout()
}
