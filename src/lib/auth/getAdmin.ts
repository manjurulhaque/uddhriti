// src/lib/auth/getAdmin.ts

import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export const getAdmin = cache(async () => {
  const supabase = await createClient() // ✅ use shared wrapper

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const admin = await prisma.admin.findUnique({
    where: { id: user.id },
  })

  return admin
})
