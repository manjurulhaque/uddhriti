"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSavedQuotes } from "@/lib/saved-quotes"

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

export function HeroSearch({ totalQuotes }: HeroSearchProps) {
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const [isMac, setIsMac] = React.useState(false)

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMac(/(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent))
    }
  }, [])

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

  const placeholderCount = totalQuotes ? `${totalQuotes.toLocaleString()}+` : "1,200+"

  return (
    <div className="space-y-4">
      {/* Search Input Bar */}
      <form
        onSubmit={handleSubmit}
        className="group relative flex items-center rounded-2xl border border-white/18 bg-white/8 p-1.5 backdrop-blur-md transition-all duration-200 focus-within:border-[var(--accent-gold)] focus-within:bg-white/14 focus-within:ring-4 focus-within:ring-[var(--accent-gold)]/20 hover:border-white/28 hover:bg-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.2)]"
      >
        {/* Search Icon */}
        <div className="flex pl-3.5 pr-2 text-white/50 transition-colors group-focus-within:text-[var(--accent-gold)]">
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Text Input */}
        <input
          type="text"
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${placeholderCount} reflections by thinker, passage, or theme...`}
          aria-label="Search quotations"
          className="w-full bg-transparent py-2.5 text-sm sm:text-base text-white placeholder:text-white/45 focus:outline-none"
        />

        {/* Keyboard shortcut hint */}
        <div className="hidden sm:flex items-center gap-1 pr-2 text-xs text-white/40 font-mono">
          <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-[11px] text-white/60">
            {isMac ? "⌘" : "Ctrl"}
          </kbd>
          <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-[11px] text-white/60">
            K
          </kbd>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--accent-rust)] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition-all duration-200 hover:bg-[#b55d32] hover:shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <span>Search</span>
          <svg
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </form>

      {/* Suggested Explorations */}
      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-white/65">
        <span className="font-medium text-[var(--accent-sand)]/90 tracking-wide">
          Popular themes:
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

export function HeroSavedBadge() {
  const { count } = useSavedQuotes()

  return (
    <Link
      href="/saved"
      className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/8 px-3.5 py-1.5 text-xs font-medium text-white/90 backdrop-blur-xs transition hover:bg-white/16 hover:border-white/30 hover:text-white"
      title="Open your saved quotes notebook"
    >
      <svg
        className="h-3.5 w-3.5 text-[var(--accent-sand)]"
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
      </svg>
      <span>Saved Notebook</span>
      {count > 0 ? (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent-rust)] px-1 text-[10px] font-bold text-white">
          {count}
        </span>
      ) : null}
    </Link>
  )
}
