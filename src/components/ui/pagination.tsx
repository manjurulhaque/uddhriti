import * as React from "react"
import Link from "next/link"

export interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems?: number
  pageSize?: number
  buildHref?: (page: number) => string
  onPageChange?: (page: number) => void
  className?: string
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  buildHref,
  onPageChange,
  className = "",
}: PaginationProps) {
  if (totalPages <= 1) return null

  const hasPrevious = currentPage > 1
  const hasNext = currentPage < totalPages

  // Generate visible page numbers (e.g. 1 ... 4 5 6 ... 10)
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = []
    const delta = 1 // how many pages around current page

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        pages.push(i)
      } else if (pages[pages.length - 1] !== "ellipsis") {
        pages.push("ellipsis")
      }
    }

    return pages
  }

  const renderPageItem = (pageNum: number) => {
    const isActive = pageNum === currentPage
    const activeClasses = isActive
      ? "bg-[var(--ink-900)] text-white font-semibold border-[var(--ink-900)] shadow-sm"
      : "bg-white text-[var(--ink-700)] border-[var(--ink-900)]/12 hover:bg-[var(--page-cream)] hover:text-[var(--ink-900)]"

    const baseClass =
      "inline-flex h-9 w-9 items-center justify-center rounded-xl border text-xs transition duration-150 ease-out"

    if (buildHref) {
      return (
        <Link
          key={pageNum}
          href={buildHref(pageNum)}
          className={`${baseClass} ${activeClasses}`}
          aria-current={isActive ? "page" : undefined}
        >
          {pageNum}
        </Link>
      )
    }

    return (
      <button
        key={pageNum}
        type="button"
        onClick={onPageChange ? () => onPageChange(pageNum) : undefined}
        className={`${baseClass} ${activeClasses}`}
        aria-current={isActive ? "page" : undefined}
      >
        {pageNum}
      </button>
    )
  }

  const renderNavButton = (
    label: string,
    targetPage: number,
    enabled: boolean,
    direction: "prev" | "next"
  ) => {
    const classes = `inline-flex items-center gap-1.5 rounded-xl border border-[var(--ink-900)]/12 px-3.5 py-2 text-xs font-medium transition duration-150 ease-out ${
      enabled
        ? "bg-white text-[var(--ink-900)] hover:bg-[var(--page-cream)] cursor-pointer"
        : "opacity-40 cursor-not-allowed bg-stone-50 text-[var(--ink-700)] select-none"
    }`

    const content = (
      <>
        {direction === "prev" && (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        )}
        <span>{label}</span>
        {direction === "next" && (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </>
    )

    if (enabled && buildHref) {
      return (
        <Link href={buildHref(targetPage)} className={classes}>
          {content}
        </Link>
      )
    }

    if (!enabled) {
      return (
        <span aria-disabled="true" className={classes}>
          {content}
        </span>
      )
    }

    return (
      <button
        type="button"
        onClick={onPageChange ? () => onPageChange(targetPage) : undefined}
        className={classes}
      >
        {content}
      </button>
    )
  }

  const startItem = totalItems && pageSize ? (currentPage - 1) * pageSize + 1 : null
  const endItem =
    totalItems && pageSize ? Math.min(currentPage * pageSize, totalItems) : null

  return (
    <div
      className={`flex flex-col items-center justify-between gap-4 border-t border-[var(--ink-900)]/8 pt-5 sm:flex-row ${className}`}
    >
      <div className="text-xs text-[var(--ink-700)]/80">
        {startItem && endItem && totalItems ? (
          <span>
            Showing <strong className="text-[var(--ink-900)]">{startItem}</strong> to{" "}
            <strong className="text-[var(--ink-900)]">{endItem}</strong> of{" "}
            <strong className="text-[var(--ink-900)]">{totalItems}</strong> entries
          </span>
        ) : (
          <span>
            Page <strong className="text-[var(--ink-900)]">{currentPage}</strong> of{" "}
            <strong className="text-[var(--ink-900)]">{totalPages}</strong>
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {renderNavButton("Previous", currentPage - 1, hasPrevious, "prev")}

        <div className="hidden sm:flex sm:items-center sm:gap-1.5">
          {getPageNumbers().map((item, idx) =>
            item === "ellipsis" ? (
              <span
                key={`ellipsis-${idx}`}
                className="inline-flex h-9 w-9 items-center justify-center text-xs text-stone-400"
              >
                ...
              </span>
            ) : (
              renderPageItem(item)
            )
          )}
        </div>

        {renderNavButton("Next", currentPage + 1, hasNext, "next")}
      </div>
    </div>
  )
}
