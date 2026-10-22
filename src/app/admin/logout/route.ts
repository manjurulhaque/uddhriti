import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getSiteUrl } from "@/lib/site"

export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  return NextResponse.redirect(new URL("/admin/login", getSiteUrl()))
}