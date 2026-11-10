import { describe, it } from "node:test"
import assert from "node:assert/strict"

(process.env as Record<string, string | undefined>).NODE_ENV = "test"

import { prisma } from "../../src/lib/prisma"
import { recordAuditLog } from "../../src/lib/audit"

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
})
