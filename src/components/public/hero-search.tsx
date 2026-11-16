"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { SearchIcon } from "@/components/ui/icons"
import { openCommandPalette } from "./command-palette"

export interface HeroSearchProps {
  totalQuotes?: number
}

const SUGGESTED_SEARCHES = [
  { label: "Marcus Aurelius", icon: "🏛️" },
  { label: "Stillness", icon: "🌿" },
  { label: "Courage", icon: "⚡" },
  { label: "Rumi", icon: "📜" },
  { label: "Solitude", icon: "🕯️" },
  { label: "Perseverance", icon: "⛰️" },
  { label: "Hope", icon: "✨" },
]

const emptySubscribe = () => () => {}

export function HeroSearch() {
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const isMac = React.useSyncExternalStore(
    emptySubscribe,
    () => /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent),
    () => false
  )

  const placeholder = "Search reflections by thinker, passage, or theme..."

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (trimmed) {
      router.push(`/quotes?q=${encodeURIComponent(trimmed)}`)
    } else {
      router.push("/quotes")
    }
  }

  function handlePillClick(term: string) {
    router.push(`/quotes?q=${encodeURIComponent(term)}`)
  }

  return (
    <div className="space-y-4">
      {/* Search Input Bar */}
      <form
        onSubmit={handleSubmit}
        className="group relative flex items-center rounded-2xl border border-white/18 bg-white/8 p-1.5 backdrop-blur-md transition-all duration-200 focus-within:border-[var(--accent-gold)] focus-within:bg-white/14 focus-within:ring-4 focus-within:ring-[var(--accent-gold)]/20 hover:border-white/28 hover:bg-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.2)]"
      >
        {/* Search Icon */}
        <div className="flex pl-3.5 pr-2 text-white/50 transition-colors group-focus-within:text-[var(--accent-gold)]">
          <SearchIcon className="h-4 w-4" />
        </div>

        {/* Text Input */}
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label="Search quotations by author or keyword"
          className="w-full bg-transparent px-2 py-2 text-base text-white placeholder-white/50 outline-none"
        />

        {/* Keyboard Shortcut Indicator */}
        <div className="hidden sm:flex items-center pr-2">
          <button
            type="button"
            onClick={() => openCommandPalette(query.trim() || undefined)}
            className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-[11px] font-mono text-white/60 hover:text-white hover:bg-white/20 hover:border-white/30 transition-colors cursor-pointer"
            title={`Open Command Palette (${isMac ? "⌘K" : "Ctrl+K"})`}
            aria-label="Open Command Palette"
          >
            {isMac ? "⌘K" : "Ctrl+K"}
          </button>
        </div>

        {/* Submit Search Button */}
        <button
          type="submit"
          className="ml-2 inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-gold)] px-4 py-2 text-xs sm:text-sm font-semibold text-[var(--ink-900)] shadow-xs transition hover:bg-[#e2b765] hover:scale-[1.02] active:scale-[0.98] shrink-0 cursor-pointer"
        >
          <span>Search</span>
          <span aria-hidden="true">&rarr;</span>
        </button>
      </form>

      {/* Suggested Search Pills */}
      <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-white/70">
        <span className="font-serif italic text-white/50 text-[11px]">
          Curated pathways:
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {SUGGESTED_SEARCHES.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handlePillClick(item.label)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/14 bg-white/6 px-3 py-1 text-xs text-white/80 transition-all duration-150 hover:border-[var(--accent-gold)]/50 hover:bg-white/14 hover:text-white hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span className="text-[11px] opacity-80">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
