import { prisma } from "@/lib/prisma"
import type { AuditAction, AuditEntityType, Prisma } from "@prisma/client"

export const VALID_AUDIT_ACTIONS: readonly AuditAction[] = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "RESTORE",
  "BULK_UPDATE",
  "BULK_DELETE",
  "IMPORT",
  "REPAIR",
  "LOGIN",
  "LOGOUT",
] as const

export const VALID_AUDIT_ENTITY_TYPES: readonly AuditEntityType[] = [
  "QUOTE",
  "AUTHOR",
  "SOURCE",
  "CATEGORY",
  "TAG",
  "COLLECTION",
  "FAQ",
  "SYSTEM",
] as const

export type ActivityQueryParams = {
  action?: string | null
  entityType?: string | null
  admin?: string | null
  adminEmail?: string | null
  search?: string | null
  days?: number | string | null
  startDate?: string | null
  from?: string | null
  endDate?: string | null
  to?: string | null
}

export type RecordAuditParams = {
  action: AuditAction
  entityType: AuditEntityType
  entityId?: string | null
  entityName?: string | null
  adminId?: string | null
  adminEmail?: string | null
  adminName?: string | null
  details?: Record<string, unknown> | string | null
  req?: Request | null
}

/**
 * Builds a type-safe Prisma where clause from URLSearchParams or query parameters.
 */
export function buildActivityQueryWhere(
  params: ActivityQueryParams | URLSearchParams
): Prisma.AdminAuditLogWhereInput {
  const getParam = (key: string): string | null => {
    if (params instanceof URLSearchParams) {
      return params.get(key)
    }
    const val = (params as Record<string, unknown>)[key]
    return val != null ? String(val) : null
  }

  const actionParam = getParam("action")?.toUpperCase()
  const entityTypeParam = getParam("entityType")?.toUpperCase()
  const adminParam = getParam("admin")?.trim() || getParam("adminEmail")?.trim() || ""
  const search = getParam("search")?.trim() || ""
  const daysRaw = getParam("days")
  const daysParam = daysRaw ? parseInt(daysRaw, 10) : null
  const startDateParam = getParam("startDate")?.trim() || getParam("from")?.trim() || ""
  const endDateParam = getParam("endDate")?.trim() || getParam("to")?.trim() || ""

  const where: Prisma.AdminAuditLogWhereInput = {}

  if (actionParam && actionParam !== "ALL" && VALID_AUDIT_ACTIONS.includes(actionParam as AuditAction)) {
    where.action = actionParam as AuditAction
  }

  if (
    entityTypeParam &&
    entityTypeParam !== "ALL" &&
    VALID_AUDIT_ENTITY_TYPES.includes(entityTypeParam as AuditEntityType)
  ) {
    where.entityType = entityTypeParam as AuditEntityType
  }

  if (adminParam && adminParam !== "ALL") {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(adminParam)
    if (isUuid) {
      where.adminId = adminParam
    } else {
      where.adminEmail = { equals: adminParam, mode: "insensitive" }
    }
  }

  // Date filtering: custom range (startDate / endDate) or relative cutoff (days)
  if (startDateParam || endDateParam) {
    const dateFilter: Prisma.DateTimeFilter = {}
    if (startDateParam) {
      const fromDate = new Date(startDateParam)
      if (!isNaN(fromDate.getTime())) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(startDateParam)) {
          fromDate.setHours(0, 0, 0, 0)
        }
        dateFilter.gte = fromDate
      }
    }
    if (endDateParam) {
      const toDate = new Date(endDateParam)
      if (!isNaN(toDate.getTime())) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(endDateParam)) {
          toDate.setHours(23, 59, 59, 999)
        }
        dateFilter.lte = toDate
      }
    }
    if (dateFilter.gte || dateFilter.lte) {
      where.createdAt = dateFilter
    }
  } else if (daysParam && daysParam > 0) {
    const cutoff = new Date(Date.now() - daysParam * 24 * 60 * 60 * 1000)
    where.createdAt = { gte: cutoff }
  }

  if (search) {
    where.AND = [
      {
        OR: [
          { entityName: { contains: search, mode: "insensitive" } },
          { adminEmail: { contains: search, mode: "insensitive" } },
          { adminName: { contains: search, mode: "insensitive" } },
          { details: { contains: search, mode: "insensitive" } },
        ],
      },
    ]
  }

  return where
}

/**
 * Persists an administrative action to the audit ledger.
 * Non-blocking: failures are logged without throwing errors to prevent
 * disrupting primary transactional workflows.
 */
export async function recordAuditLog(params: RecordAuditParams) {
  try {
    let ipAddress: string | null = null
    let userAgent: string | null = null

    if (params.req) {
      const headers = params.req.headers
      ipAddress =
        headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        headers.get("x-real-ip") ||
        null
      userAgent = headers.get("user-agent")?.slice(0, 300) || null
    }

    const detailsStr =
      params.details == null
        ? null
        : typeof params.details === "string"
        ? params.details
        : JSON.stringify(params.details)

    return await prisma.adminAuditLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        entityName: params.entityName ? params.entityName.slice(0, 200) : null,
        adminId: params.adminId || null,
        adminEmail: params.adminEmail || null,
        adminName: params.adminName || null,
        details: detailsStr,
        ipAddress,
        userAgent,
      },
    })
  } catch (error) {
    console.error("[AuditLog] Failed to record admin audit log:", error)
    return null
  }
}
