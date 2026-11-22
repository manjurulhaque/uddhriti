import { describe, it } from "node:test"
import assert from "node:assert/strict"

(process.env as Record<string, string | undefined>).NODE_ENV = "test"

import { prisma } from "../../src/lib/prisma"
import {
  recordAuditLog,
  buildActivityQueryWhere,
  VALID_AUDIT_ACTIONS,
  VALID_AUDIT_ENTITY_TYPES,
} from "../../src/lib/audit"

type CapturedAuditData = {
  action?: string
  entityType?: string
  entityId?: string | null
  entityName?: string | null
  adminId?: string | null
  adminEmail?: string | null
  adminName?: string | null
  details?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}

describe("Admin Audit Logging (recordAuditLog)", () => {
  it("persists audit entries with correct entity and admin metadata", async () => {
    const captured: { data: CapturedAuditData | null } = { data: null }
    const originalCreate = prisma.adminAuditLog.create
    // @ts-expect-error Mocking Prisma create for test isolation
    prisma.adminAuditLog.create = async ({ data }: { data: Record<string, unknown> }) => {
      captured.data = data as CapturedAuditData
      return { id: "audit-1", ...data, createdAt: new Date() }
    }

    try {
      const req = new Request("https://example.com/api/admin/quotes", {
        headers: {
          "x-forwarded-for": "203.0.113.195, 10.0.0.1",
          "user-agent": "QuotzenAdmin/1.0",
        },
      })

      const result = await recordAuditLog({
        action: "CREATE",
        entityType: "QUOTE",
        entityId: "quote-uuid-123",
        entityName: "A timeless quotation",
        adminId: "admin-uuid-456",
        adminEmail: "admin@quotzen.com",
        adminName: "Senior Curator",
        details: { status: "PUBLISHED", language: "en" },
        req,
      })

      assert.ok(result !== null)
      assert.equal(captured.data?.action, "CREATE")
      assert.equal(captured.data?.entityType, "QUOTE")
      assert.equal(captured.data?.entityId, "quote-uuid-123")
      assert.equal(captured.data?.entityName, "A timeless quotation")
      assert.equal(captured.data?.adminId, "admin-uuid-456")
      assert.equal(captured.data?.adminEmail, "admin@quotzen.com")
      assert.equal(captured.data?.adminName, "Senior Curator")
      assert.equal(captured.data?.ipAddress, "203.0.113.195")
      assert.equal(captured.data?.userAgent, "QuotzenAdmin/1.0")
      assert.equal(captured.data?.details, '{"status":"PUBLISHED","language":"en"}')
    } finally {
      prisma.adminAuditLog.create = originalCreate
    }
  })

  it("extracts IP address from x-real-ip when x-forwarded-for is missing", async () => {
    const captured: { data: CapturedAuditData | null } = { data: null }
    const originalCreate = prisma.adminAuditLog.create
    // @ts-expect-error Mocking Prisma create for test isolation
    prisma.adminAuditLog.create = async ({ data }: { data: Record<string, unknown> }) => {
      captured.data = data as CapturedAuditData
      return { id: "audit-2", ...data, createdAt: new Date() }
    }

    try {
      const req = new Request("https://example.com/api/admin/sources", {
        headers: {
          "x-real-ip": "198.51.100.77",
        },
      })

      await recordAuditLog({
        action: "UPDATE",
        entityType: "SOURCE",
        entityId: "source-1",
        adminId: "admin-1",
        req,
      })

      assert.equal(captured.data?.ipAddress, "198.51.100.77")
    } finally {
      prisma.adminAuditLog.create = originalCreate
    }
  })

  it("handles absent req gracefully by defaulting IP and userAgent to null", async () => {
    const captured: { data: CapturedAuditData | null } = { data: null }
    const originalCreate = prisma.adminAuditLog.create
    // @ts-expect-error Mocking Prisma create for test isolation
    prisma.adminAuditLog.create = async ({ data }: { data: Record<string, unknown> }) => {
      captured.data = data as CapturedAuditData
      return { id: "audit-3", ...data, createdAt: new Date() }
    }

    try {
      await recordAuditLog({
        action: "REPAIR",
        entityType: "SYSTEM",
        entityName: "Database Recalculation",
        adminId: "admin-cron",
      })

      assert.equal(captured.data?.ipAddress, null)
      assert.equal(captured.data?.userAgent, null)
    } finally {
      prisma.adminAuditLog.create = originalCreate
    }
  })

  it("truncates entityName longer than 200 characters", async () => {
    const captured: { data: CapturedAuditData | null } = { data: null }
    const originalCreate = prisma.adminAuditLog.create
    // @ts-expect-error Mocking Prisma create for test isolation
    prisma.adminAuditLog.create = async ({ data }: { data: Record<string, unknown> }) => {
      captured.data = data as CapturedAuditData
      return { id: "audit-4", ...data, createdAt: new Date() }
    }

    try {
      const longTitle = "A".repeat(350)
      await recordAuditLog({
        action: "DELETE",
        entityType: "TAG",
        entityName: longTitle,
      })

      assert.equal(typeof captured.data?.entityName, "string")
      assert.equal((captured.data?.entityName as string).length, 200)
      assert.equal(captured.data?.entityName, "A".repeat(200))
    } finally {
      prisma.adminAuditLog.create = originalCreate
    }
  })

  it("truncates userAgent longer than 300 characters", async () => {
    const captured: { data: CapturedAuditData | null } = { data: null }
    const originalCreate = prisma.adminAuditLog.create
    // @ts-expect-error Mocking Prisma create for test isolation
    prisma.adminAuditLog.create = async ({ data }: { data: Record<string, unknown> }) => {
      captured.data = data as CapturedAuditData
      return { id: "audit-5", ...data, createdAt: new Date() }
    }

    try {
      const longAgent = "TestAgent/".padEnd(450, "x")
      const req = new Request("https://example.com/api/admin/categories", {
        headers: { "user-agent": longAgent },
      })

      await recordAuditLog({
        action: "CREATE",
        entityType: "CATEGORY",
        req,
      })

      assert.equal(typeof captured.data?.userAgent, "string")
      assert.equal((captured.data?.userAgent as string).length, 300)
    } finally {
      prisma.adminAuditLog.create = originalCreate
    }
  })

  it("handles string, object, and null details correctly", async () => {
    let lastDetails: unknown = null
    const originalCreate = prisma.adminAuditLog.create
    // @ts-expect-error Mocking Prisma create for test isolation
    prisma.adminAuditLog.create = async ({ data }: { data: Record<string, unknown> }) => {
      lastDetails = data.details
      return { id: "audit-details", ...data, createdAt: new Date() }
    }

    try {
      // 1. Raw string preserved
      await recordAuditLog({
        action: "UPDATE",
        entityType: "TAG",
        details: "Raw migration details note",
      })
      assert.equal(lastDetails, "Raw migration details note")

      // 2. Object serialized
      await recordAuditLog({
        action: "BULK_UPDATE",
        entityType: "QUOTE",
        details: { count: 42, affected: ["id1", "id2"] },
      })
      assert.equal(lastDetails, JSON.stringify({ count: 42, affected: ["id1", "id2"] }))

      // 3. Null / undefined
      await recordAuditLog({
        action: "DELETE",
        entityType: "FAQ",
        details: null,
      })
      assert.equal(lastDetails, null)
    } finally {
      prisma.adminAuditLog.create = originalCreate
    }
  })

  it("is non-blocking: catches database errors and returns null without throwing", async () => {
    const originalCreate = prisma.adminAuditLog.create
    // @ts-expect-error Mocking Prisma create for test isolation
    prisma.adminAuditLog.create = async () => {
      throw new Error("Simulated database connection loss")
    }

    const originalConsoleError = console.error
    console.error = () => {}

    try {
      let result: unknown = undefined
      try {
        result = await recordAuditLog({
          action: "CREATE",
          entityType: "QUOTE",
          entityId: "quote-fail-id",
        })
      } catch {
        assert.fail("recordAuditLog should never throw")
      }

      assert.equal(result, null)
    } finally {
      console.error = originalConsoleError
      prisma.adminAuditLog.create = originalCreate
    }
  })

  it("records successful admin LOGIN audit log with operator session metadata", async () => {
    const captured: { data: CapturedAuditData | null } = { data: null }
    const originalCreate = prisma.adminAuditLog.create
    // @ts-expect-error Mocking Prisma create for test isolation
    prisma.adminAuditLog.create = async ({ data }: { data: Record<string, unknown> }) => {
      captured.data = data as CapturedAuditData
      return { id: "audit-login-success", ...data, createdAt: new Date() }
    }

    try {
      const req = new Request("https://example.com/api/admin/auth/login", {
        headers: {
          "x-forwarded-for": "198.51.100.12",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        },
      })

      const result = await recordAuditLog({
        action: "LOGIN",
        entityType: "SYSTEM",
        entityName: "Admin Session (admin@quotzen.com)",
        adminId: "32f7b57c-970b-43f7-a703-a27f50ef34a4",
        adminEmail: "admin@quotzen.com",
        adminName: "Chief Curator",
        details: {
          status: "SUCCESS",
          role: "SUPER_ADMIN",
          method: "password",
        },
        req,
      })

      assert.ok(result !== null)
      assert.equal(captured.data?.action, "LOGIN")
      assert.equal(captured.data?.entityType, "SYSTEM")
      assert.equal(captured.data?.entityName, "Admin Session (admin@quotzen.com)")
      assert.equal(captured.data?.adminId, "32f7b57c-970b-43f7-a703-a27f50ef34a4")
      assert.equal(captured.data?.adminEmail, "admin@quotzen.com")
      assert.equal(captured.data?.adminName, "Chief Curator")
      assert.equal(captured.data?.ipAddress, "198.51.100.12")
      assert.equal(captured.data?.userAgent, "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
      assert.deepEqual(JSON.parse(captured.data?.details || "{}"), {
        status: "SUCCESS",
        role: "SUPER_ADMIN",
        method: "password",
      })
    } finally {
      prisma.adminAuditLog.create = originalCreate
    }
  })

  it("records failed admin LOGIN audit log with reason and IP metadata", async () => {
    const captured: { data: CapturedAuditData | null } = { data: null }
    const originalCreate = prisma.adminAuditLog.create
    // @ts-expect-error Mocking Prisma create for test isolation
    prisma.adminAuditLog.create = async ({ data }: { data: Record<string, unknown> }) => {
      captured.data = data as CapturedAuditData
      return { id: "audit-login-fail", ...data, createdAt: new Date() }
    }

    try {
      const req = new Request("https://example.com/api/admin/auth/login", {
        headers: {
          "x-real-ip": "203.0.113.88",
          "user-agent": "UnknownBot/2.0",
        },
      })

      const result = await recordAuditLog({
        action: "LOGIN",
        entityType: "SYSTEM",
        entityName: "Failed Login (attacker@example.com)",
        adminEmail: "attacker@example.com",
        details: {
          status: "FAILED",
          reason: "Invalid login credentials",
        },
        req,
      })

      assert.ok(result !== null)
      assert.equal(captured.data?.action, "LOGIN")
      assert.equal(captured.data?.entityType, "SYSTEM")
      assert.equal(captured.data?.entityName, "Failed Login (attacker@example.com)")
      assert.equal(captured.data?.adminEmail, "attacker@example.com")
      assert.equal(captured.data?.adminId, null)
      assert.equal(captured.data?.ipAddress, "203.0.113.88")
      assert.equal(captured.data?.userAgent, "UnknownBot/2.0")
      assert.deepEqual(JSON.parse(captured.data?.details || "{}"), {
        status: "FAILED",
        reason: "Invalid login credentials",
      })
    } finally {
      prisma.adminAuditLog.create = originalCreate
    }
  })
})

describe("Activity Query Filters (buildActivityQueryWhere)", () => {
  it("returns empty where clause when no filters or defaults are provided", () => {
    const where = buildActivityQueryWhere({})
    assert.deepEqual(where, {})
  })

  it("validates and filters by valid action, ignoring invalid action or ALL", () => {
    for (const action of VALID_AUDIT_ACTIONS) {
      const where = buildActivityQueryWhere({ action })
      assert.equal(where.action, action)
    }

    const whereAll = buildActivityQueryWhere({ action: "ALL" })
    assert.equal(whereAll.action, undefined)

    const whereInvalid = buildActivityQueryWhere({ action: "INJECT_DROP_TABLE" })
    assert.equal(whereInvalid.action, undefined)
  })

  it("validates and filters by valid entityType, ignoring invalid entityType or ALL", () => {
    for (const entityType of VALID_AUDIT_ENTITY_TYPES) {
      const where = buildActivityQueryWhere({ entityType })
      assert.equal(where.entityType, entityType)
    }

    const whereAll = buildActivityQueryWhere({ entityType: "ALL" })
    assert.equal(whereAll.entityType, undefined)

    const whereInvalid = buildActivityQueryWhere({ entityType: "UNKNOWN_TABLE" })
    assert.equal(whereInvalid.entityType, undefined)
  })

  it("filters by adminId when UUID is passed, and by adminEmail when email is passed", () => {
    const uuid = "a1b2c3d4-e5f6-4a1b-8c2d-123456789abc"
    const whereUuid = buildActivityQueryWhere({ admin: uuid })
    assert.equal(whereUuid.adminId, uuid)
    assert.equal(whereUuid.adminEmail, undefined)

    const email = "curator@quotzen.com"
    const whereEmail = buildActivityQueryWhere({ admin: email })
    assert.equal(whereEmail.adminId, undefined)
    assert.deepEqual(whereEmail.adminEmail, { equals: email, mode: "insensitive" })

    const whereAll = buildActivityQueryWhere({ admin: "ALL" })
    assert.equal(whereAll.adminId, undefined)
    assert.equal(whereAll.adminEmail, undefined)
  })

  it("constructs custom date range with start-of-day and end-of-day normalization", () => {
    const whereRange = buildActivityQueryWhere({
      startDate: "2026-11-01",
      endDate: "2026-11-10",
    })

    assert.ok(whereRange.createdAt)
    const createdAtFilter = whereRange.createdAt as { gte?: Date; lte?: Date }
    assert.ok(createdAtFilter.gte instanceof Date)
    assert.ok(createdAtFilter.lte instanceof Date)

    // Start date should be normalized to 00:00:00.000 local
    assert.equal(createdAtFilter.gte?.getHours(), 0)
    assert.equal(createdAtFilter.gte?.getMinutes(), 0)
    assert.equal(createdAtFilter.gte?.getSeconds(), 0)

    // End date should be normalized to 23:59:59.999 local
    assert.equal(createdAtFilter.lte?.getHours(), 23)
    assert.equal(createdAtFilter.lte?.getMinutes(), 59)
    assert.equal(createdAtFilter.lte?.getSeconds(), 59)
  })

  it("falls back to relative days cutoff when custom date range is not specified", () => {
    const beforeMs = Date.now()
    const whereDays = buildActivityQueryWhere({ days: 7 })
    const afterMs = Date.now()

    assert.ok(whereDays.createdAt)
    const filter = whereDays.createdAt as { gte: Date }
    assert.ok(filter.gte instanceof Date)

    const expectedCutoffMin = beforeMs - 7 * 24 * 60 * 60 * 1000
    const expectedCutoffMax = afterMs - 7 * 24 * 60 * 60 * 1000
    assert.ok(filter.gte.getTime() >= expectedCutoffMin)
    assert.ok(filter.gte.getTime() <= expectedCutoffMax)
  })

  it("constructs multi-field OR search matching entityName, adminEmail, adminName, and details", () => {
    const where = buildActivityQueryWhere({ search: "Marcus Aurelius" })

    assert.ok(Array.isArray(where.AND))
    assert.equal(where.AND?.length, 1)

    const andClause = (where.AND as Array<{ OR: unknown[] }>)[0]
    assert.ok(Array.isArray(andClause.OR))
    assert.equal(andClause.OR.length, 4)

    assert.deepEqual(andClause.OR, [
      { entityName: { contains: "Marcus Aurelius", mode: "insensitive" } },
      { adminEmail: { contains: "Marcus Aurelius", mode: "insensitive" } },
      { adminName: { contains: "Marcus Aurelius", mode: "insensitive" } },
      { details: { contains: "Marcus Aurelius", mode: "insensitive" } },
    ])
  })

  it("works identically with both URLSearchParams and plain ActivityQueryParams object", () => {
    const params = new URLSearchParams({
      action: "UPDATE",
      entityType: "QUOTE",
      admin: "admin@quotzen.com",
      search: "Stoicism",
    })

    const fromParams = buildActivityQueryWhere(params)
    const fromObject = buildActivityQueryWhere({
      action: "UPDATE",
      entityType: "QUOTE",
      admin: "admin@quotzen.com",
      search: "Stoicism",
    })

    assert.deepEqual(fromParams, fromObject)
  })
})

