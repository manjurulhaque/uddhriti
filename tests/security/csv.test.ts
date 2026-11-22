import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  isPotentialFormulaInjection,
  sanitizeSpreadsheetCell,
  escapeCsvCell,
} from "../../src/lib/security/csv"

describe("Security: CSV Formula Injection (CWE-1236)", () => {
  it("detects dangerous formula triggers starting with =, @, or %", () => {
    assert.equal(isPotentialFormulaInjection("=1+1"), true)
    assert.equal(isPotentialFormulaInjection("=SUM(A1:A10)"), true)
    assert.equal(isPotentialFormulaInjection("@SUM(A1:B2)"), true)
    assert.equal(isPotentialFormulaInjection("%VARIABLE%"), true)
  })

  it("detects dangerous DDE pipe commands", () => {
    assert.equal(isPotentialFormulaInjection("cmd|' /C calc'!A0"), true)
  })

  it("detects formula function calls starting with + or -", () => {
    assert.equal(isPotentialFormulaInjection("+SUM(1,2)"), true)
    assert.equal(isPotentialFormulaInjection("-HYPERLINK(\"http://evil.com\")"), true)
  })

  it("allows safe signed numbers and BCE historical years", () => {
    assert.equal(isPotentialFormulaInjection("-450"), false)
    assert.equal(isPotentialFormulaInjection("+1984"), false)
    assert.equal(isPotentialFormulaInjection("3.14159"), false)
  })

  it("disarms formula cells by prefixing with apostrophe", () => {
    assert.equal(sanitizeSpreadsheetCell("=cmd|' /C calc'!A0"), "'=cmd|' /C calc'!A0")
    assert.equal(sanitizeSpreadsheetCell("@SUM(A1)"), "'@SUM(A1)")
  })

  it("leaves normal quote content and authors intact", () => {
    const quote = "The only true wisdom is in knowing you know nothing."
    assert.equal(sanitizeSpreadsheetCell(quote), quote)
    assert.equal(sanitizeSpreadsheetCell("Socrates"), "Socrates")
  })

  it("escapes CSV cells with quotes and handles internal double quotes", () => {
    assert.equal(escapeCsvCell('Hello "World"'), '"Hello ""World"""')
    assert.equal(escapeCsvCell("Quote, with comma"), '"Quote, with comma"')
    assert.equal(escapeCsvCell("Simple text"), "Simple text")
  })
})
