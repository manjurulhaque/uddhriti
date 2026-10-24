import * as React from "react"
import { Badge } from "@/components/ui/badge"

export interface BulkImportResultData {
  received?: number
  totalReceived?: number
  created: number
  skipped?: number
  failed: number
  errors?: string[]
}

export interface BulkImportResultCardProps {
  result: BulkImportResultData | null
  onDismiss?: () => void
  className?: string
}

export function BulkImportResultCard({
  result,
  onDismiss,
  className = "",
}: BulkImportResultCardProps) {
  if (!result) return null

  const totalReceived = result.totalReceived ?? result.received ?? (result.created + (result.skipped ?? 0) + result.failed)
  const isPartial = result.failed > 0 && result.created > 0
  const isCompleteFailure = result.failed > 0 && result.created === 0

  return (
    <section
      className={`rounded-2xl border p-5 sm:p-6 transition-all duration-200 shadow-2xs space-y-4 ${
        isCompleteFailure
          ? "border-red-200 bg-red-50/40"
          : isPartial
          ? "border-amber-200 bg-amber-50/30"
          : "border-emerald-200/90 bg-emerald-50/30"
      } ${className}`}
      role="region"
      aria-label="Bulk import outcome"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-xl text-base ${
              isCompleteFailure
                ? "bg-red-100 text-red-700"
                : isPartial
                ? "bg-amber-100 text-amber-800"
                : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {isCompleteFailure ? "✕" : isPartial ? "!" : "✓"}
          </span>
          <div>
            <h3 className="text-sm font-bold tracking-tight uppercase text-stone-900">
              {isCompleteFailure
                ? "Import Failed"
                : isPartial
                ? "Import Completed with Warnings"
                : "Import Completed Successfully"}
            </h3>
            <p className="text-xs text-stone-500">
              Processed {totalReceived} incoming records
            </p>
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-black/5 hover:text-stone-700 transition-colors"
            aria-label="Dismiss results"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        <div className="rounded-xl border border-stone-200/80 bg-white p-3 shadow-2xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            Received
          </div>
          <div className="mt-1 text-xl font-bold text-stone-900">{totalReceived}</div>
        </div>

        <div className="rounded-xl border border-emerald-200/80 bg-white p-3 shadow-2xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
            Created
          </div>
          <div className="mt-1 text-xl font-bold text-emerald-700">{result.created}</div>
        </div>

        <div className="rounded-xl border border-stone-200/80 bg-white p-3 shadow-2xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            Skipped
          </div>
          <div className="mt-1 text-xl font-bold text-stone-700">{result.skipped ?? 0}</div>
        </div>

        <div className="rounded-xl border border-red-200/80 bg-white p-3 shadow-2xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-red-700">
            Failed
          </div>
          <div className="mt-1 text-xl font-bold text-red-700">{result.failed}</div>
        </div>
      </div>

      {result.errors && result.errors.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-white p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-800">
              Error Details ({result.errors.length})
            </span>
            <Badge variant="danger" size="xs">
              Action Required
            </Badge>
          </div>
          <ul className="max-h-48 overflow-y-auto space-y-1.5 text-xs text-red-700 list-disc pl-4 font-mono">
            {result.errors.map((msg, idx) => (
              <li key={`${idx}-${msg}`} className="break-all">
                {msg}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

export interface BulkImportFormatGuideProps {
  format: string
  notes?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function BulkImportFormatGuide({
  format,
  notes,
  actions,
  className = "",
}: BulkImportFormatGuideProps) {
  return (
    <div
      className={`rounded-2xl border border-stone-200/90 bg-stone-50/70 p-4 sm:p-5 space-y-3 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
            Line-Delimited Syntax
          </span>
          <p className="text-xs text-stone-500 mt-0.5">
            One record per row. Use pipe delimiter (<code className="font-bold text-stone-800">|</code>) to separate attributes.
          </p>
        </div>

        {actions && <div className="shrink-0">{actions}</div>}
      </div>

      <div className="rounded-xl border border-stone-200 bg-white px-3.5 py-2 font-mono text-xs text-stone-800 overflow-x-auto">
        <code>{format}</code>
      </div>

      {notes && <div className="text-xs text-stone-600 space-y-1">{notes}</div>}
    </div>
  )
}

export interface BulkFileUploadInputProps {
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  loadedCount?: number | null
  accept?: string
  label?: string
  className?: string
}

export function BulkFileUploadInput({
  onFileChange,
  loadedCount,
  accept = ".json,.csv,application/json,text/csv",
  label = "Upload JSON or CSV file",
  className = "",
}: BulkFileUploadInputProps) {
  return (
    <div className={`space-y-1.5 font-sans ${className}`}>
      <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-700)]">
        {label}
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept={accept}
          onChange={onFileChange}
          className="text-xs text-stone-600 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border file:border-stone-200/90 file:text-xs file:font-semibold file:bg-white file:text-stone-700 hover:file:bg-stone-50 file:cursor-pointer cursor-pointer"
        />

        {typeof loadedCount === "number" && loadedCount > 0 && (
          <Badge variant="success" size="sm" dot>
            Loaded {loadedCount} row{loadedCount === 1 ? "" : "s"} from file
          </Badge>
        )}
      </div>
    </div>
  )
}
