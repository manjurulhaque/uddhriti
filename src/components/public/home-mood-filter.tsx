"use client"

import * as React from "react"
import Link from "next/link"
import { useSavedQuotes } from "@/lib/saved-quotes"

export interface MoodItem {
  id: string
  label: string
  tagline: string
  icon: string
  categorySlug: string
  searchQuery?: string
  accentColor: string
  accentBg: string
  accentBorder: string
  accentText: string
  quote: {
    content: string
    author: string
    source?: string
    year?: string
  }
}

const MOODS: MoodItem[] = [
  {
    id: "stillness",
    label: "Stillness & Peace",
    tagline: "Calming the racing mind and finding quiet center",
    icon: "🌿",
    categorySlug: "philosophical",
    searchQuery: "peace",
    accentColor: "#2d6a4f",
    accentBg: "bg-emerald-500/10",
    accentBorder: "border-emerald-500/30",
    accentText: "text-emerald-800",
    quote: {
      content:
        "Silence is an ocean. Speech is a river. When the ocean is searching for you, don't walk into the river.",
      author: "Rumi",
      source: "The Masnavi",
    },
  },
  {
    id: "grit",
    label: "Grit & Resilience",
    tagline: "Standing tall when tested and pushing past setbacks",
    icon: "⚡",
    categorySlug: "failure",
    searchQuery: "perseverance",
    accentColor: "#b45309",
    accentBg: "bg-amber-500/10",
    accentBorder: "border-amber-500/30",
    accentText: "text-amber-800",
    quote: {
      content:
        "Failure after long perseverance is much grander than never to have a striving good enough to be called a failure.",
      author: "George Eliot",
      source: "Middlemarch",
      year: "1871",
    },
  },
  {
    id: "solace",
    label: "Solace & Comfort",
    tagline: "Gentle perspectives for heavy days and quiet sorrow",
    icon: "🕯️",
    categorySlug: "sad",
    searchQuery: "solace",
    accentColor: "#475569",
    accentBg: "bg-slate-500/10",
    accentBorder: "border-slate-500/30",
    accentText: "text-slate-800",
    quote: {
      content: "We suffer more often in imagination than in reality.",
      author: "Seneca",
      source: "Letters from a Stoic",
      year: "c. 65 AD",
    },
  },
  {
    id: "wonder",
    label: "Wonder & Philosophy",
    tagline: "Deep contemplation, existential awe, and timeless questions",
    icon: "🌌",
    categorySlug: "philosophical",
    accentColor: "#312e81",
    accentBg: "bg-indigo-500/10",
    accentBorder: "border-indigo-500/30",
    accentText: "text-indigo-800",
    quote: {
      content:
        "You have power over your mind - not outside events. Realize this, and you will find strength.",
      author: "Marcus Aurelius",
      source: "Meditations",
      year: "c. 180 AD",
    },
  },
  {
    id: "focus",
    label: "Focus & Ambition",
    tagline: "Purposeful drive, mastery, and bold momentum",
    icon: "🎯",
    categorySlug: "success",
    searchQuery: "focus",
    accentColor: "#c76b3e",
    accentBg: "bg-orange-500/10",
    accentBorder: "border-orange-500/30",
    accentText: "text-orange-800",
    quote: {
      content: "Nature does not hurry, yet everything is accomplished.",
      author: "Lao Tzu",
      source: "Tao Te Ching",
      year: "c. 4th Century BC",
    },
  },
  {
    id: "connection",
    label: "Love & Connection",
    tagline: "Kindred spirits, deep bonds, and enduring empathy",
    icon: "🤍",
    categorySlug: "love",
    accentColor: "#be185d",
    accentBg: "bg-pink-500/10",
    accentBorder: "border-pink-500/30",
    accentText: "text-pink-800",
    quote: {
      content:
        "In the sweetness of friendship let there be laughter, and sharing of pleasures. For in the dew of little things the heart finds its morning and is refreshed.",
      author: "Kahlil Gibran",
      source: "The Prophet",
      year: "1923",
    },
  },
  {
    id: "hope",
    label: "Hope & New Dawn",
    tagline: "Fresh chapters, renewed faith, and the light ahead",
    icon: "🌅",
    categorySlug: "positive",
    searchQuery: "hope",
    accentColor: "#d97706",
    accentBg: "bg-yellow-500/10",
    accentBorder: "border-yellow-500/30",
    accentText: "text-yellow-800",
    quote: {
      content:
        "Hope is the thing with feathers that perches in the soul - and sings the tune without the words - and never stops at all.",
      author: "Emily Dickinson",
      year: "1861",
    },
  },
  {
    id: "time",
    label: "Time & Impermanence",
    tagline: "Living awake to the fleeting beauty of the present moment",
    icon: "⏳",
    categorySlug: "time",
    accentColor: "#78350f",
    accentBg: "bg-amber-700/10",
    accentBorder: "border-amber-700/30",
    accentText: "text-amber-900",
    quote: {
      content:
        "Clouds come floating into my life, no longer to carry rain or usher storm, but to add color to my sunset sky.",
      author: "Rabindranath Tagore",
      source: "Stray Birds",
      year: "1916",
    },
  },
]

export function HomeMoodFilter() {
  const [selectedMoodId, setSelectedMoodId] = React.useState<string>("stillness")
  const [copied, setCopied] = React.useState(false)
  const { isSaved, toggleSave } = useSavedQuotes()

  const activeMood = MOODS.find((m) => m.id === selectedMoodId) || MOODS[0]
  const quoteKey = `mood-${activeMood.id}-${activeMood.quote.author}`
  const saved = isSaved(quoteKey)

  async function handleCopy() {
    const text = `“${activeMood.quote.content}”\n— ${activeMood.quote.author}${
      activeMood.quote.source ? ` (${activeMood.quote.source})` : ""
    }\n\nVia Uddhriti Quotations`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  function handleSave() {
    toggleSave({
      id: quoteKey,
      content: activeMood.quote.content,
      authorName: activeMood.quote.author,
      sourceTitle: activeMood.quote.source,
      year: activeMood.quote.year,
      category: activeMood.label,
    })
  }

  const exploreHref = activeMood.searchQuery
    ? `/quotes?q=${encodeURIComponent(activeMood.searchQuery)}`
    : `/categories/${activeMood.categorySlug}`

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
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-rust)]" />
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
                <span>{activeMood.icon}</span>
                <span>{activeMood.label}</span>
              </span>
              <span className="text-xs text-stone-500 italic">
                {activeMood.tagline}
              </span>
            </div>

            <blockquote className="font-serif text-xl sm:text-2xl lg:text-3xl text-[var(--ink-900)] leading-relaxed font-normal">
              “{activeMood.quote.content}”
            </blockquote>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--ink-700)]">
              <span className="font-serif font-bold text-stone-900">
                — {activeMood.quote.author}
              </span>
              {activeMood.quote.source && (
                <span className="text-stone-500">
                  in <em className="text-stone-700">{activeMood.quote.source}</em>
                </span>
              )}
              {activeMood.quote.year && (
                <span className="text-xs text-stone-400">({activeMood.quote.year})</span>
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
              <svg
                className={`h-4 w-4 ${saved ? "fill-white text-white" : "fill-none text-stone-500"}`}
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
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
