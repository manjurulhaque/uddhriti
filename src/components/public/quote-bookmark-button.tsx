"use client"

import * as React from "react"
import { BookmarkIcon } from "@/components/ui"
import { useSavedQuotes } from "@/lib/saved-quotes"

export interface QuoteBookmarkButtonProps {
  id?: string
  slug?: string
  content: string
  authorName?: string | null
  authorSlug?: string | null
  category?: string | null
  categorySlug?: string | null
  sourceTitle?: string | null
  year?: string | null
  tags?: string[]
  isVerified?: boolean
  variant?: "paper" | "dark" | "featured"
  className?: string
}

export function QuoteBookmarkButton({
  id,
  slug,
  content,
  authorName,
  authorSlug,
  category,
  categorySlug,
  sourceTitle,
  year,
  tags = [],
  isVerified,
  variant = "paper",
  className = "",
}: QuoteBookmarkButtonProps) {
  const isDark = variant === "dark"
  const isFeatured = variant === "featured"
  const { isSaved, toggleSave } = useSavedQuotes()

  const quoteKey = id || slug || content
  const saved = isSaved(quoteKey)

  function handleBookmark(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    toggleSave({
      id: quoteKey,
      slug,
      content,
      authorName,
      authorSlug,
      category,
      categorySlug,
      sourceTitle,
      year,
      tags,
      isVerified,
    })
  }

  return (
    <button
      type="button"
      onClick={handleBookmark}
      aria-label={saved ? "Remove from saved quotes" : "Save quote for offline reading"}
      className={`p-1.5 rounded-full transition-all cursor-pointer ${
        saved
          ? isDark || isFeatured
            ? "text-[var(--accent-gold)] bg-white/15"
            : "text-[var(--accent-rust)] bg-[#c76b3e]/15 shadow-2xs"
          : isDark || isFeatured
          ? "text-white/40 hover:text-white hover:bg-white/10"
          : "text-amber-800/35 hover:text-amber-900 hover:bg-amber-800/10"
      } ${className}`}
    >
      <BookmarkIcon
        filled={saved}
        className="h-4 w-4 transition-transform active:scale-125"
      />
    </button>
  )
}

