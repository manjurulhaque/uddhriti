import * as React from "react"

export interface AdminBulkActionBarProps {
  selectedCount: number
  entityLabel?: string
  entityLabelPlural?: string
  onDeselectAll: () => void
  onDelete?: () => void
  isDeleting?: boolean
  deleteLabel?: string
  children?: React.ReactNode
  className?: string
}

export function AdminBulkActionBar({
  selectedCount,
  entityLabel = "item",
  entityLabelPlural,
  onDeselectAll,
  onDelete,
  isDeleting = false,
  deleteLabel = "Delete Selected",
  children,
  className = "",
}: AdminBulkActionBarProps) {
  if (selectedCount <= 0) return null

  const pluralLabel =
    entityLabelPlural ||
    (entityLabel.endsWith("y")
      ? `${entityLabel.slice(0, -1)}ies`
      : entityLabel.endsWith("s")
        ? `${entityLabel}es`
        : `${entityLabel}s`)

  return (
    <div
      className={`sticky top-2 z-20 backdrop-blur-md bg-stone-900/95 text-white border border-stone-800 shadow-xl rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 transition-all duration-150 animate-in fade-in slide-in-from-top-2 ${className}`}
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-800 text-stone-200 border border-stone-700">
          {selectedCount} {selectedCount === 1 ? entityLabel : pluralLabel} selected
        </span>
        <button
          type="button"
          onClick={onDeselectAll}
          className="text-xs text-stone-400 hover:text-stone-200 underline transition cursor-pointer"
        >
          Deselect all
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {children}

        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            className="bg-red-600/90 text-white font-medium text-xs px-3 py-1.5 rounded-lg hover:bg-red-600 disabled:opacity-50 transition cursor-pointer"
          >
            {isDeleting ? "Deleting..." : deleteLabel}
          </button>
        )}
      </div>
    </div>
  )
}

