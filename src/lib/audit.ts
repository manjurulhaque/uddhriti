import { prisma } from "@/lib/prisma"
import type { AuditAction, AuditEntityType } from "@prisma/client"

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

