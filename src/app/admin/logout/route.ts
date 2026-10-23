import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { getSiteUrl } from "@/lib/site"

async function handleLogout() {
  const cookieStore = await cookies()
  const response = NextResponse.redirect(new URL("/admin/login", getSiteUrl()), 303)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            try {
              cookieStore.set(name, value, options)
            } catch {
              // ignore if cookieStore cannot be modified directly
            }
            response.cookies.set(name, value, options)
          }
        },
      },
    }
  )

  await supabase.auth.signOut()

  return response
}

export async function POST() {
  return handleLogout()
}

export async function GET() {
  return handleLogout()
}

