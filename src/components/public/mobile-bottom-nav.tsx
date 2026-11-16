"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { HomeIcon, SearchIcon, BookmarkIcon, DiceIcon } from "@/components/ui/icons"
import { useSavedQuotes } from "@/lib/saved-quotes"
import { openCommandPalette } from "./command-palette"

export function MobileBottomNav() {
  const pathname = usePathname()
  const { count: savedCount } = useSavedQuotes()

  const isHome = pathname === "/"
  const isSaved = pathname === "/saved"

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--page-cream)]/95 backdrop-blur-md border-t border-stone-900/10 shadow-[0_-4px_24px_rgba(33,37,41,0.06)] pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-2">
        {/* 1. Home */}
        <Link
          href="/"
          className={`flex-1 h-full flex flex-col items-center justify-center gap-1 text-[11px] transition-colors ${
            isHome
              ? "text-[var(--accent-rust)] font-semibold"
              : "text-stone-500 hover:text-stone-900"
          }`}
          aria-current={isHome ? "page" : undefined}
        >
          <HomeIcon className={`h-5 w-5 ${isHome ? "stroke-[2.5]" : ""}`} />
          <span>Home</span>
        </Link>

        {/* 2. Search / Quick Palette */}
        <button
          type="button"
          onClick={() => openCommandPalette()}
          className="flex-1 h-full flex flex-col items-center justify-center gap-1 text-[11px] text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
          aria-label="Open search dialog"
        >
          <SearchIcon className="h-5 w-5" />
          <span>Search</span>
        </button>

        {/* 3. Saved Quotes Notebook */}
        <Link
          href="/saved"
          className={`flex-1 h-full flex flex-col items-center justify-center gap-1 text-[11px] relative transition-colors ${
            isSaved
              ? "text-[var(--accent-rust)] font-semibold"
              : "text-stone-500 hover:text-stone-900"
          }`}
          aria-current={isSaved ? "page" : undefined}
          aria-label={`Saved Notebook (${savedCount} quotes)`}
        >
          <div className="relative">
            <BookmarkIcon
              filled={isSaved || savedCount > 0}
              className={`h-5 w-5 ${
                isSaved || savedCount > 0 ? "text-[var(--accent-rust)] fill-current" : ""
              }`}
            />
            {savedCount > 0 && (
              <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent-rust)] px-1 text-[9px] font-bold text-white shadow-2xs">
                {savedCount > 99 ? "99+" : savedCount}
              </span>
            )}
          </div>
          <span>Saved</span>
        </Link>

        {/* 4. Random Discovery */}
        <Link
          href="/quotes/random"
          prefetch={false}
          className="flex-1 h-full flex flex-col items-center justify-center gap-1 text-[11px] text-stone-500 hover:text-stone-900 transition-colors"
          title="Explore a random quotation"
          aria-label="Discover random quote"
        >
          <DiceIcon className="h-5 w-5" />
          <span>Random</span>
        </Link>
      </div>
    </nav>
  )
}
