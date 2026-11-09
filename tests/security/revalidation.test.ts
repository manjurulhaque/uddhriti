import { describe, it } from "node:test"
import assert from "node:assert/strict"

(process.env as Record<string, string | undefined>).NODE_ENV = "test"

import {
  registerPublicDataInvalidator,
  registerDashboardInvalidator,
  revalidatePublicSurfaces,
  revalidateDashboardMetrics,
  revalidateQuote,
  revalidateAuthor,
  revalidateCategory,
  revalidateTagPage,
} from "../../src/lib/revalidation"

describe("Cache Revalidation & Invalidator Registry", () => {
  it("executes all registered public data invalidators on revalidation", () => {
    let calledA = false
    let calledB = false

    const unregA = registerPublicDataInvalidator(() => {
      calledA = true
    })
    const unregB = registerPublicDataInvalidator(() => {
      calledB = true
    })

    revalidatePublicSurfaces()

    assert.equal(calledA, true)
    assert.equal(calledB, true)

    unregA()
    unregB()
  })

  it("supports unregistering invalidators cleanly", () => {
    let callCount = 0

    const unregister = registerPublicDataInvalidator(() => {
      callCount += 1
    })

    revalidatePublicSurfaces()
    assert.equal(callCount, 1)

    unregister()

    revalidatePublicSurfaces()
    assert.equal(callCount, 1) // Did not increment after unregister
  })

  it("handles throwing invalidators without breaking subsequent listeners", () => {
    let secondCalled = false

    const unregFaulty = registerPublicDataInvalidator(() => {
      throw new Error("Simulated listener crash")
    })
    const unregHealthy = registerPublicDataInvalidator(() => {
      secondCalled = true
    })

    assert.doesNotThrow(() => {
      revalidatePublicSurfaces()
    })

    assert.equal(secondCalled, true)

    unregFaulty()
    unregHealthy()
  })

  it("executes registered dashboard invalidators", () => {
    let dashboardCalled = false

    const unreg = registerDashboardInvalidator(() => {
      dashboardCalled = true
    })

    revalidateDashboardMetrics()
    assert.equal(dashboardCalled, true)

    unreg()
  })

  it("safely handles entity-level revalidation calls outside active request context", () => {
    assert.doesNotThrow(() => {
      revalidateQuote("to-be-or-not-to-be", {
        oldSlug: "to-be-old",
        authorSlug: "william-shakespeare",
        categorySlug: "existence",
        tagSlugs: ["theatre", "philosophy"],
      })
      revalidateAuthor("william-shakespeare", "william-shakespeare-old")
      revalidateCategory("philosophy", "philosophy-old")
      revalidateTagPage("wisdom", "wisdom-old")
    })
  })
})
