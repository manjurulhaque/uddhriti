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

  return admin
}