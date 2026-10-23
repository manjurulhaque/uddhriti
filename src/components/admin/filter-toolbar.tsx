"use client"

import * as React from "react"
import { Input } from "../ui/input"
import { Select } from "../ui/select"
import { Button } from "../ui/button"

export interface FilterToolbarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  sortValue?: string
  onSortChange?: (value: string) => void
  sortOptions?: { value: string; label: string }[]
  filters?: React.ReactNode
  visibleCount?: number
  totalCount?: number
  itemLabel?: string
  hasActiveFilters?: boolean
  onClearFilters?: () => void
  extraActions?: React.ReactNode
  className?: string
}

export function FilterToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  sortValue,
  onSortChange,
  sortOptions,
  filters,
  visibleCount,
  totalCount,
  itemLabel = "items",
  hasActiveFilters = false,
  onClearFilters,
  extraActions,
  className = "",
}: FilterToolbarProps) {
  return (
    <div className={`space-y-3 font-sans ${className}`}>
      {/* Top Search & Sort Row */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            type="search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            onClear={() => onSearchChange("")}
            placeholder={searchPlaceholder}
            leftIcon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            }
          />
        </div>

        {sortOptions && sortValue !== undefined && onSortChange && (
          <div className="sm:w-56">
            <Select
              value={sortValue}
              onChange={(e) => onSortChange(e.target.value)}
              options={sortOptions}
            />
          </div>
        )}

        {extraActions && <div className="flex items-center gap-2">{extraActions}</div>}
      </div>

      {/* Filter Options & Results Count */}
      {(filters || visibleCount !== undefined) && (
        <div className="rounded-2xl border border-stone-200/80 bg-stone-50/80 p-3.5 shadow-xs">
          <div className="flex flex-col gap-3">
            {filters && (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {filters}
              </div>
            )}

            <div className="flex flex-col gap-2 text-xs text-stone-600 sm:flex-row sm:items-center sm:justify-between pt-1">
              {visibleCount !== undefined && totalCount !== undefined && (
                <div>
                  Showing <span className="font-semibold text-stone-900">{visibleCount}</span> of{" "}
                  <span className="font-semibold text-stone-900">{totalCount}</span> {itemLabel}
                </div>
              )}

              {hasActiveFilters && onClearFilters && (
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  onClick={onClearFilters}
                  className="self-start sm:self-auto"
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
