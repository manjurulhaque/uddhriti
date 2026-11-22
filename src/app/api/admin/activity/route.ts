import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, requireSuperAdmin } from "@/lib/api/admin-auth"
import { enforceAdminRateLimit } from "@/lib/api/rate-limit"
import { recordAuditLog, buildActivityQueryWhere } from "@/lib/audit"

export async function GET(req: NextRequest) {
  const { admin, response } = await requireAdmin()
  if (response) return response

  const rateLimitResponse = enforceAdminRateLimit(admin.id, "quoteView")
  if (rateLimitResponse) return rateLimitResponse

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "25", 10)))

  const where = buildActivityQueryWhere(searchParams)

  try {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const [total, logs, todayCount, topActions, topEntities, registeredAdmins, distinctLogAdmins] = await Promise.all([
      prisma.adminAuditLog.count({ where }),
      prisma.adminAuditLog.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.adminAuditLog.count({
        where: {
          createdAt: {
            gte: startOfDay,
          },
        },
      }),
      prisma.adminAuditLog.groupBy({
        by: ["action"],
        _count: { action: true },
        orderBy: { _count: { action: "desc" } },
        take: 5,
      }),
      prisma.adminAuditLog.groupBy({
        by: ["entityType"],
        _count: { entityType: true },
        orderBy: { _count: { entityType: "desc" } },
        take: 5,
      }),
      prisma.admin.findMany({
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      }),
      prisma.adminAuditLog.findMany({
        select: { adminEmail: true, adminName: true },
        distinct: ["adminEmail"],
        where: { adminEmail: { not: null } },
      }),
    ])

    // Build unified operators list for admin filter dropdown
    const knownAdmins = new Map<string, { email: string; name: string }>()
    for (const a of registeredAdmins) {
      if (a.email) {
        knownAdmins.set(a.email.toLowerCase(), { email: a.email, name: a.name || a.email })
      }
    }
    for (const a of distinctLogAdmins) {
      if (a.adminEmail && !knownAdmins.has(a.adminEmail.toLowerCase())) {
        knownAdmins.set(a.adminEmail.toLowerCase(), {
          email: a.adminEmail,
          name: a.adminName || a.adminEmail,
        })
      }
    }
    const operators = Array.from(knownAdmins.values()).sort((a, b) => a.name.localeCompare(b.name))

    const totalPages = Math.ceil(total / limit) || 1

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      stats: {
        totalOverall: total,
        todayCount,
        topActions: topActions.map((a) => ({ action: a.action, count: a._count.action })),
        topEntities: topEntities.map((e) => ({ entityType: e.entityType, count: e._count.entityType })),
      },
      operators,
    })
  } catch (error) {
    console.error("[GET /api/admin/activity] Error:", error)
    return NextResponse.json({ error: "Failed to fetch activity logs" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { admin, response } = await requireSuperAdmin()
  if (response) return response

  const rateLimitResponse = enforceAdminRateLimit(admin.id, "adminMutation")
  if (rateLimitResponse) return rateLimitResponse

  const { searchParams } = new URL(req.url)
  const olderThanDays = Math.max(30, parseInt(searchParams.get("olderThanDays") || "90", 10))
  const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)

  try {
    const result = await prisma.adminAuditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    })

    await recordAuditLog({
      action: "DELETE",
      entityType: "SYSTEM",
      entityName: "Audit Log Cleanup",
      adminId: admin.id,
      adminEmail: admin.email,
      adminName: admin.name,
      details: {
        purgedCount: result.count,
        cutoffDays: olderThanDays,
      },
      req,
    })

    return NextResponse.json({
      success: true,
      purgedCount: result.count,
      message: `Purged ${result.count} audit logs older than ${olderThanDays} days.`,
    })
  } catch (error) {
    console.error("[DELETE /api/admin/activity] Error:", error)
    return NextResponse.json({ error: "Failed to purge audit logs" }, { status: 500 })
  }
}
