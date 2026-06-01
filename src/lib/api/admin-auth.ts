import { NextResponse } from "next/server"
import { getAdmin } from "@/lib/auth/getAdmin"

type Admin = NonNullable<Awaited<ReturnType<typeof getAdmin>>>
type AdminAuthResult =
  | { admin: Admin; response: null }
  | { admin: null; response: NextResponse }

export async function requireAdmin(): Promise<AdminAuthResult> {
  const admin = await getAdmin()
  if (!admin) {
    return {
      admin: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  return { admin, response: null }
}

export async function requireSuperAdmin(): Promise<AdminAuthResult> {
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
