import { NextResponse } from "next/server"
import { getAdmin } from "@/lib/auth/getAdmin"

export async function requireAdmin() {
  const admin = await getAdmin()
  if (!admin) {
    return {
      admin: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  return { admin, response: null }
}

export async function requireSuperAdmin() {
  const result = await requireAdmin()
  if (!result.admin) {
    return result
  }

  if (result.admin.role !== "SUPER_ADMIN") {
    return {
      admin: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  return result
}
