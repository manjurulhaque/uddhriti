import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { getSupabaseConfig } from "@/lib/security/env"

export async function createClient() {
  const cookieStore = await cookies()
  const { url, anonKey } = getSupabaseConfig()

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      // 🚨 DO NOT allow cookie writes in Server Components
      setAll() {
        // no-op
      },
    },
  })
}
