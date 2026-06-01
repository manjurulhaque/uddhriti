export type CsvRow = Record<string, string>

function parseDelimitedLine(line: string, delimiter: "," | "\t") {
  const cells: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim())
      current = ""
      continue
    }

    current += char
  }

  cells.push(current.trim())
  return cells
}

function parseDelimitedRows(text: string, delimiter: "," | "\t"): CsvRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) return []

  const headers = parseDelimitedLine(lines[0], delimiter).map((h) => h.trim())
  const rows: CsvRow[] = []

  for (let i = 1; i < lines.length; i += 1) {
    const values = parseDelimitedLine(lines[i], delimiter)
    const row: CsvRow = {}
    for (let j = 0; j < headers.length; j += 1) {
      row[headers[j]] = values[j] ?? ""
    }
    rows.push(row)
  }

  return rows
}

export function parseCsvRows(text: string): CsvRow[] {
  return parseDelimitedRows(text, ",")
}

export function parseTabularRows(text: string): CsvRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) return []

  const firstLine = lines[0]
  const delimiter: "," | "\t" = firstLine.includes("\t") ? "\t" : ","
  return parseDelimitedRows(text, delimiter)
}

export function readItemsFromJsonOrCsvText(text: string): unknown[] {
  const trimmed = text.trim()
  if (!trimmed) {
    throw new Error("Paste JSON or CSV content first.")
  }

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) return parsed
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as { items?: unknown[] }).items)) {
      return (parsed as { items: unknown[] }).items
    }

    throw new Error('JSON must be an array or an object shaped like { "items": [...] }.')
  }

  const rows = parseTabularRows(trimmed)
  if (rows.length === 0) {
    throw new Error("CSV or pasted table data must include a header row and at least one data row.")
  }

  return rows
}

export async function readItemsFromJsonOrCsv(file: File): Promise<unknown[]> {
  const text = await file.text()
  const name = file.name.toLowerCase()
  const type = (file.type || "").toLowerCase()
  const isCsv = name.endsWith(".csv") || type.includes("csv")

  if (isCsv) {
    return parseCsvRows(text)
  }

  return readItemsFromJsonOrCsvText(text)
}

export function getRowValue(row: unknown, key: string) {
  if (!row || typeof row !== "object") return ""
  const obj = row as Record<string, unknown>
  const direct = obj[key]
  if (typeof direct === "string") return direct
  if (typeof direct === "number" || typeof direct === "boolean") return String(direct)

  const lowerKey = key.toLowerCase()
  for (const [k, v] of Object.entries(obj)) {
    if (k.toLowerCase() === lowerKey) {
      if (typeof v === "string") return v
      if (typeof v === "number" || typeof v === "boolean") return String(v)
      return ""
    }
  }

  return ""
}
