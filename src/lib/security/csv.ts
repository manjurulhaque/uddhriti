/**
 * CSV / Spreadsheet Formula Injection (CWE-1236) Protection
 *
 * Spreadsheet applications (Microsoft Excel, LibreOffice Calc, Google Sheets, Apple Numbers)
 * treat cells starting with '=', '@', or dangerous '+' / '-' formula patterns as executable
 * expressions or Dynamic Data Exchange (DDE) commands.
 *
 * This module provides sanitization and escaping utilities to disarm potential formula injection
 * vectors on both data import and future data export.
 */

const DANGEROUS_FORMULA_PREFIX_REGEX = /^[=@%]/
const DANGEROUS_DDE_PIPE_REGEX = /\|[\s]*['"]?[\s]*[A-Za-z0-9_.-]+/
const FUNCTION_CALL_REGEX = /^[-+][\s]*[A-Za-z_][A-Za-z0-9_.]*[\s]*\(/
const EXTERNAL_REFERENCE_REGEX = /^[-+][\s]*['"]?[\s]*[A-Za-z0-9_.\\]+!/
const NUMERIC_REGEX = /^[-+]?\d+(\.\d+)?$/

/**
 * Detects whether a string begins with or contains formula execution triggers.
 */
export function isPotentialFormulaInjection(value: string): boolean {
  if (!value || typeof value !== "string") return false

  // Strip leading and trailing whitespace/tabs/newlines
  const trimmed = value.trim()
  if (!trimmed) return false

  // Check for leading formula symbols: '=', '@', '%'
  if (DANGEROUS_FORMULA_PREFIX_REGEX.test(trimmed)) {
    return true
  }

  // Check for DDE command pipes (e.g. cmd|' /C calc'!A0)
  if (DANGEROUS_DDE_PIPE_REGEX.test(trimmed)) {
    return true
  }

  // Signed numbers (e.g. -450 BCE, +1984) are safe numbers, not formulas
  if (NUMERIC_REGEX.test(trimmed)) {
    return false
  }

  // Formula function calls starting with + or - (e.g. +SUM(...), -HYPERLINK(...))
  if (FUNCTION_CALL_REGEX.test(trimmed)) {
    return true
  }

  // External file/workbook references starting with + or - (e.g. +[workbook.xlsx]!)
  if (EXTERNAL_REFERENCE_REGEX.test(trimmed)) {
    return true
  }

  return false
}

/**
 * Neutralizes formula triggers by prepending an apostrophe (') as recommended
 * by OWASP. When opened in Excel or Google Sheets, the apostrophe forces the engine
 * to treat the cell strictly as literal text, disabling formula execution.
 */
export function sanitizeSpreadsheetCell(value: string): string {
  if (!value || typeof value !== "string") return ""

  const trimmed = value.trim()
  if (!trimmed) return ""

  if (isPotentialFormulaInjection(trimmed)) {
    // Avoid double apostrophe if already escaped
    if (trimmed.startsWith("'")) {
      return trimmed
    }
    return `'${trimmed}`
  }

  return trimmed
}

/**
 * Formats a value for standard RFC 4180 CSV output while neutralizing formula injection.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return ""

  let stringValue = String(value)

  // Disarm formula injection
  stringValue = sanitizeSpreadsheetCell(stringValue)

  // If the cell contains quotes, commas, or newlines, escape quotes and wrap in quotes
  if (/[",\r\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}

