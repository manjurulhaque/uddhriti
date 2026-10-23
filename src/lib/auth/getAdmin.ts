// src/lib/auth/getAdmin.ts

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function getAdmin() {
  const supabase = await createClient() // ✅ use shared wrapper

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const admin = await prisma.admin.findUnique({
    where: { id: user.id },
  })

  // The admin interface and its API are restricted to super admins.
  // Keep this check here so routes that call getAdmin() directly cannot
  // accidentally grant editors access by checking only for a database row.
  if (!admin || admin.role !== "SUPER_ADMIN") return null

  return admin
}
