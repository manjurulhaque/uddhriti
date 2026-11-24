import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { isValidVerificationCitation } from "../../src/components/public/quote-detail/quote-primary-source"

describe("Quote Primary Source Verification Guard", () => {
  it("rejects null, undefined, and empty string notes", () => {
    assert.equal(isValidVerificationCitation(null), false)
    assert.equal(isValidVerificationCitation(undefined), false)
    assert.equal(isValidVerificationCitation(""), false)
  })

  it("filters out generic pending verification concordance placeholders", () => {
    const pendingNote =
      "Pending primary source verification. Cross-referencing against standard literary concordance for James K. Polk recommended."
    assert.equal(isValidVerificationCitation(pendingNote), false)
  })

  it("filters out citation check warning placeholders", () => {
    const checkNote = "No verified primary publication citation found. Requires primary citation check."
    assert.equal(isValidVerificationCitation(checkNote), false)

    const invalidNote = "Author is anonymous or unspecified; primary citation cannot be validated."
    assert.equal(isValidVerificationCitation(invalidNote), false)
  })

  it("allows genuine verified primary source references and citations", () => {
    const genuineNote1 =
      "Inaugural Address delivered in Washington, D.C. (March 4, 1845). Published in A Compilation of the Messages and Papers of the Presidents (Vol. 4); verified via U.S. Congressional Serial Set."
    assert.equal(isValidVerificationCitation(genuineNote1), true)

    const genuineNote2 = "Walden (1854), Chapter 18 ('Conclusion')."
    assert.equal(isValidVerificationCitation(genuineNote2), true)

    const genuineNote3 = "Strength to Love (1963), Chapter 3 ('On Being a Good Neighbor')."
    assert.equal(isValidVerificationCitation(genuineNote3), true)
  })
})
