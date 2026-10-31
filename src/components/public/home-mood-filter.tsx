"use client"

import * as React from "react"
import Link from "next/link"
import { BookmarkIcon } from "@/components/ui"
import { useCopyToClipboard } from "@/hooks"
import { useSavedQuotes } from "@/lib/saved-quotes"
import { MOODS, type MoodItem } from "@/data/home-moods"

export type { MoodItem }

export interface DynamicMoodQuote {
  id?: string
  content: string
  author: string
  authorSlug?: string | null
  source?: string | null
  year?: string | null
}

export interface HomeMoodFilterProps {
  initialMoodQuotes?: Record<string, DynamicMoodQuote>
}

export function HomeMoodFilter({ initialMoodQuotes = {} }: HomeMoodFilterProps = {}) {
  const [selectedMoodId, setSelectedMoodId] = React.useState<string>("stillness")
  const { copied, copyQuote } = useCopyToClipboard()
  const { isSaved, toggleSave } = useSavedQuotes()

  const activeMoodBase = MOODS.find((m) => m.id === selectedMoodId) || MOODS[0]
  const currentQuote = initialMoodQuotes[activeMoodBase.id] || activeMoodBase.quote
  const quoteKey = initialMoodQuotes[activeMoodBase.id]?.id || `mood-${activeMoodBase.id}-${currentQuote.author}`
  const saved = isSaved(quoteKey)

  function handleCopy() {
    copyQuote({
      content: currentQuote.content,
      author: currentQuote.author,
      source: currentQuote.source ?? undefined,
    })
  }

  function handleSave() {
    toggleSave({
      id: quoteKey,
      content: currentQuote.content,
      authorName: currentQuote.author,
      authorSlug: currentQuote.authorSlug ?? undefined,
      sourceTitle: currentQuote.source ?? undefined,
      year: currentQuote.year ?? undefined,
      category: activeMoodBase.label,
    })
  }

  const exploreHref = activeMoodBase.searchQuery
    ? `/quotes?q=${encodeURIComponent(activeMoodBase.searchQuery)}`
    : `/categories/${activeMoodBase.categorySlug}`

  return (
    <section
      id="mood-filter"
      className="scroll-mt-20 overflow-hidden rounded-[2rem] border border-[var(--ink-900)]/10 bg-white p-6 sm:p-8 lg:p-10 shadow-[0_16px_50px_rgba(33,37,41,0.06)]"
      aria-label="Reflect by Feeling"
    >
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-rust)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-rust)]" aria-hidden="true" />
            Reflect by Feeling
          </div>
          <h2 className="mt-2 text-2xl font-serif font-bold text-[var(--ink-900)] sm:text-3xl">
            What are you seeking today?
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-700)] max-w-xl">
            Words resonate differently depending on where your heart is. Choose a state of mind
            to surface quotes calibrated to your current moment.
          </p>
        </div>

        <Link
          href="/categories"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--accent-rust)] hover:underline self-start sm:self-auto pt-2 sm:pt-0"
        >
          <span>Explore All Categories</span>
          <span>&rarr;</span>
        </Link>
      </div>

      {/* Mood Selector Carousel / Pills Grid */}
      <div className="flex gap-2.5 overflow-x-auto pb-3 pt-1 scrollbar-none -mx-2 px-2 sm:grid sm:grid-cols-4 lg:grid-cols-8 sm:overflow-visible sm:pb-0">
        {MOODS.map((mood) => {
          const isSelected = mood.id === selectedMoodId
          return (
            <button
              key={mood.id}
              type="button"
              onClick={() => setSelectedMoodId(mood.id)}
              className={`group flex shrink-0 sm:shrink items-center sm:flex-col sm:text-center gap-2 rounded-2xl px-3.5 py-3 text-left sm:text-center transition-all duration-200 cursor-pointer border ${
                isSelected
                  ? `border-[var(--ink-900)] bg-[var(--ink-900)] text-white shadow-md scale-[1.02]`
                  : `border-stone-200/90 bg-stone-50/70 text-stone-700 hover:border-stone-300 hover:bg-stone-100 hover:text-stone-900`
              }`}
              aria-pressed={isSelected}
            >
              <span className="text-xl sm:text-2xl transition-transform group-hover:scale-110">
                {mood.icon}
              </span>
              <div className="min-w-0">
                <div
                  className={`text-xs font-semibold leading-snug whitespace-nowrap sm:whitespace-normal ${
                    isSelected ? "text-white" : "text-stone-800"
                  }`}
                >
                  {mood.label.split(" & ")[0]}
                </div>
                <div
                  className={`hidden sm:block text-[10px] truncate ${
                    isSelected ? "text-white/60" : "text-stone-400"
                  }`}
                >
                  {mood.label.split(" & ")[1] ? `& ${mood.label.split(" & ")[1]}` : ""}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Active Mood Showcase Card */}
      <div className="mt-6 rounded-2xl border border-stone-200/80 bg-[var(--page-cream)]/60 p-6 sm:p-8 transition-all animate-rise">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          {/* Quote Body */}
          <div className="space-y-4 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border border-stone-300/80 bg-white text-stone-800 shadow-2xs">
                <span>{activeMoodBase.icon}</span>
                <span>{activeMoodBase.label}</span>
              </span>
              <span className="text-xs text-stone-500 italic">
                {activeMoodBase.tagline}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-stone-600 bg-white/80 px-2.5 py-0.5 rounded-full border border-stone-200/80 shadow-2xs">
                <span>✦</span>
                <span>Daily Calendar Rotation</span>
              </span>
            </div>

            <blockquote className="font-serif text-xl sm:text-2xl lg:text-3xl text-[var(--ink-900)] leading-relaxed font-normal">
              “{currentQuote.content}”
            </blockquote>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--ink-700)]">
              <span className="font-serif font-bold text-stone-900">
                —{" "}
                {currentQuote.authorSlug ? (
                  <Link
                    href={`/authors/${currentQuote.authorSlug}`}
                    className="hover:text-[var(--accent-rust)] hover:underline transition-colors"
                  >
                    {currentQuote.author}
                  </Link>
                ) : (
                  currentQuote.author
                )}
              </span>
              {currentQuote.source && (
                <span className="text-stone-500">
                  in <em className="text-stone-700">{currentQuote.source}</em>
                </span>
              )}
              {currentQuote.year && (
                <span className="text-xs text-stone-400">({currentQuote.year})</span>
              )}
            </div>
          </div>

          {/* Action Hub */}
          <div className="flex lg:flex-col items-center lg:items-stretch gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 lg:border-l border-stone-200/80 lg:pl-6">
            <Link
              href={exploreHref}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--ink-900)] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-black hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Explore Collection</span>
              <span>&rarr;</span>
            </Link>

            <button
              type="button"
              onClick={handleSave}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 text-xs font-medium transition cursor-pointer ${
                saved
                  ? "border-[var(--accent-rust)] bg-[var(--accent-rust)] text-white shadow-xs"
                  : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50 hover:text-stone-900"
              }`}
              title={saved ? "Saved in notebook" : "Save reflection"}
            >
              <BookmarkIcon
                filled={saved}
                className={`h-4 w-4 ${saved ? "fill-white text-white" : "fill-none text-stone-500"}`}
              />
              <span>{saved ? "Saved" : "Bookmark"}</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition cursor-pointer"
              title="Copy quote to clipboard"
            >
              <svg
                className="h-4 w-4 text-stone-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                {copied ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                )}
              </svg>
              <span>{copied ? "Copied!" : "Copy"}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
