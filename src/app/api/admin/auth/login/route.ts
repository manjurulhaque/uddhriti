import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdmin } from "@/lib/auth/getAdmin"
import { recordAuditLog } from "@/lib/audit"
import { enforceIpRateLimit } from "@/lib/api/rate-limit"

export async function POST(req: NextRequest) {
  // Edge rate limiting to mitigate spam
  const rateLimitResponse = enforceIpRateLimit(req, "adminMutation")
  if (rateLimitResponse) return rateLimitResponse

  const body = await req.json().catch(() => ({}))
  const rawEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : null
  const status = body.status === "FAILED" ? "FAILED" : "SUCCESS"
  const failureReason = typeof body.error === "string" ? body.error.slice(0, 200) : "Invalid credentials"

  // 1. Check if user session is already established
  const admin = await getAdmin()

  if (admin && status === "SUCCESS") {
    await recordAuditLog({
      action: "LOGIN",
      entityType: "SYSTEM",
      entityName: `Admin Session (${admin.email})`,
      adminId: admin.id,
      adminEmail: admin.email,
      adminName: admin.name,
      details: {
        status: "SUCCESS",
        role: admin.role,
        method: "password",
      },
      req,
    })

    return NextResponse.json({ success: true, recorded: true })
  }

  // 2. Fallback / Explicit reporting with provided email
  if (rawEmail) {
    const targetAdmin = await prisma.admin.findUnique({
      where: { email: rawEmail },
      select: { id: true, name: true, email: true, role: true },
    })

    if (status === "FAILED") {
      await recordAuditLog({
        action: "LOGIN",
        entityType: "SYSTEM",
        entityName: `Failed Login (${rawEmail})`,
        adminId: targetAdmin?.id || null,
        adminEmail: rawEmail,
        adminName: targetAdmin?.name || null,
        details: {
          status: "FAILED",
          reason: failureReason,
        },
        req,
      })

      return NextResponse.json({ success: true, recorded: true, failedAttempt: true })
    }

    if (status === "SUCCESS" && targetAdmin) {
      await recordAuditLog({
        action: "LOGIN",
        entityType: "SYSTEM",
        entityName: `Admin Session (${targetAdmin.email})`,
        adminId: targetAdmin.id,
        adminEmail: targetAdmin.email,
        adminName: targetAdmin.name,
        details: {
          status: "SUCCESS",
          role: targetAdmin.role,
          method: "password",
        },
        req,
      })

      return NextResponse.json({ success: true, recorded: true })
    }
  }

  return NextResponse.json({ error: "Unauthorized: session or admin not recognized" }, { status: 401 })
}
