import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, requireSuperAdmin } from "@/lib/api/admin-auth"
import { recordAuditLog } from "@/lib/audit"
import type { AuditAction, AuditEntityType, Prisma } from "@prisma/client"

export async function GET(req: NextRequest) {
  const { response } = await requireAdmin()
  if (response) return response

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "25", 10)))
  const actionParam = searchParams.get("action") as AuditAction | null
  const entityTypeParam = searchParams.get("entityType") as AuditEntityType | null
  const search = searchParams.get("search")?.trim() || ""
  const daysParam = searchParams.get("days") ? parseInt(searchParams.get("days")!, 10) : null

  const where: Prisma.AdminAuditLogWhereInput = {}

  if (actionParam) {
    where.action = actionParam
  }

  if (entityTypeParam) {
    where.entityType = entityTypeParam
  }

  if (daysParam && daysParam > 0) {
    const cutoff = new Date(Date.now() - daysParam * 24 * 60 * 60 * 1000)
    where.createdAt = { gte: cutoff }
  }

  if (search) {
    where.OR = [
      { entityName: { contains: search, mode: "insensitive" } },
      { adminEmail: { contains: search, mode: "insensitive" } },
      { details: { contains: search, mode: "insensitive" } },
    ]
  }

  try {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const [total, logs, todayCount, topActions, topEntities] = await Promise.all([
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
    ])

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
    })
  } catch (error) {
    console.error("[GET /api/admin/activity] Error:", error)
    return NextResponse.json({ error: "Failed to fetch activity logs" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { admin, response } = await requireSuperAdmin()
  if (response) return response

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

