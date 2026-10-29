"use client"

import * as React from "react"
import Link from "next/link"
import { BookmarkIcon } from "@/components/ui"
import { PublicLayout, QuoteCard } from "@/components/public"
import { useSavedQuotes, exportSavedQuotesAsMarkdown } from "@/lib/saved-quotes"

function SavedQuotesContent() {
  const { savedQuotes, count } = useSavedQuotes()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [copiedAll, setCopiedAll] = React.useState(false)

  const filteredQuotes = React.useMemo(() => {
    if (!searchQuery.trim()) return savedQuotes
    const query = searchQuery.toLowerCase().trim()
    return savedQuotes.filter((q) => {
      const matchContent = q.content.toLowerCase().includes(query)
      const matchAuthor = (q.authorName || "").toLowerCase().includes(query)
      const matchCategory = (q.category || "").toLowerCase().includes(query)
      const matchTag = (q.tags || []).some((t) => t.toLowerCase().includes(query))
      return matchContent || matchAuthor || matchCategory || matchTag
    })
  }, [savedQuotes, searchQuery])

  function handleDownloadMarkdown() {
    if (savedQuotes.length === 0) return
    const md = exportSavedQuotesAsMarkdown(savedQuotes)
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `quotzen-saved-reflections-${new Date().toISOString().slice(0, 10)}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handleDownloadJson() {
    if (savedQuotes.length === 0) return
    const json = JSON.stringify(savedQuotes, null, 2)
    const blob = new Blob([json], { type: "application/json;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `quotzen-saved-reflections-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function handleCopyMarkdown() {
    if (savedQuotes.length === 0) return
    const md = exportSavedQuotesAsMarkdown(savedQuotes)
    try {
      await navigator.clipboard.writeText(md)
      setCopiedAll(true)
      setTimeout(() => setCopiedAll(false), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12 space-y-10 font-sans">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="text-xs text-stone-500 flex items-center gap-2">
          <Link href="/" className="hover:text-stone-900 transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-stone-900 font-medium">Saved Quotes</span>
        </nav>

        {/* Hero Banner */}
        <div className="border-b border-stone-200/80 pb-8 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-[var(--accent-rust)] bg-[#c76b3e]/10 border border-[#c76b3e]/20">
            <span>✦ Personal Notebook</span>
            <span>•</span>
            <span>100% Offline Accessible</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--ink-900)]">
            Saved Reflections
          </h1>
          <p className="max-w-2xl text-sm sm:text-base text-stone-600 leading-relaxed">
            Words you have collected to ponder. Stored securely on your device, these reflections remain available anytime—even on flights, commutes, or when totally disconnected.
          </p>
        </div>

        {/* Controls Toolbar */}
        {count > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
            {/* Search within saved */}
            <div className="relative flex-1 max-w-md">
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search saved quotes, authors, tags..."
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-rust)] text-stone-800 transition-all placeholder:text-stone-400"
              />
            </div>

            {/* Actions / Export row */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-stone-500 font-mono pr-2 border-r border-stone-200">
                {filteredQuotes.length} of {count} saved
              </span>

              <button
                type="button"
                onClick={handleCopyMarkdown}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 transition-colors shadow-2xs cursor-pointer"
              >
                {copiedAll ? "Copied Markdown!" : "Copy as MD"}
              </button>

              <button
                type="button"
                onClick={handleDownloadMarkdown}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--ink-900)] text-white hover:bg-black transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Export .md</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadJson}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 transition-colors shadow-2xs cursor-pointer"
              >
                JSON
              </button>
            </div>
          </div>
        )}

        {/* Quotes Display */}
        {count === 0 ? (
          /* Empty Sanctuary State */
          <div className="py-20 flex flex-col items-center justify-center text-center max-w-lg mx-auto">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-stone-200/80 text-[var(--accent-gold)] shadow-xs mb-6">
              <BookmarkIcon
                className="h-8 w-8 text-[var(--accent-rust)]"
                strokeWidth={1.5}
              />
            </div>

            <h2 className="font-serif text-2xl font-bold text-[var(--ink-900)] tracking-tight">
              Your Sanctuary is Currently Quiet
            </h2>
            <p className="text-stone-600 text-xs sm:text-sm mt-3 leading-relaxed">
              Whenever you encounter an idea or quotation that resonates with you, tap the bookmark icon to collect it here. Your saved quotes are always available offline.
            </p>

            <div className="mt-8 flex items-center gap-3">
              <Link
                href="/quotes"
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[var(--accent-rust)] text-white hover:opacity-90 transition-opacity shadow-sm"
              >
                Explore Quotes
              </Link>
              <Link
                href="/authors"
                className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 transition-colors shadow-2xs"
              >
                Browse Authors
              </Link>
            </div>
          </div>
        ) : filteredQuotes.length === 0 ? (
          /* No search results */
          <div className="py-16 text-center space-y-3">
            <p className="font-serif text-lg text-stone-800">
              No saved quotes matched &ldquo;{searchQuery}&rdquo;
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-xs font-semibold text-[var(--accent-rust)] hover:underline cursor-pointer"
            >
              Clear search filter
            </button>
          </div>
        ) : (
          /* Quotes Grid */
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredQuotes.map((q) => (
              <div key={q.id || q.slug} className="relative group/card">
                <QuoteCard
                  id={q.id}
                  slug={q.slug}
                  content={q.content}
                  authorName={q.authorName}
                  authorSlug={q.authorSlug}
                  category={q.category}
                  categorySlug={q.categorySlug}
                  sourceTitle={q.sourceTitle}
                  year={q.year}
                  tags={q.tags}
                  variant="paper"
                />
              </div>
            ))}
          </div>
        )}
      </div>
  )
}

export default function SavedQuotesPage() {
  return (
    <PublicLayout>
      <SavedQuotesContent />
    </PublicLayout>
  )
}
