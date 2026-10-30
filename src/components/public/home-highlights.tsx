import * as React from "react"
import Link from "next/link"
import { Panel } from "../ui/card"
import { formatNumber } from "@/lib/formatters"
import { CuratorFolioTabs } from "./curator-folio-tabs"

export interface RankedCategoryItem {
  id: string
  name: string
  slug?: string | null
  description?: string | null
  quoteCount: number
}

export interface RankedAuthorItem {
  id: string
  name: string
  slug?: string | null
  birthYear?: number | null
  deathYear?: number | null
  profession?: string | null
  nationality?: string | null
  quoteCount: number
}

export interface HomeHighlightsProps {
  topCategories?: RankedCategoryItem[]
  recentAuthors?: RankedAuthorItem[]
  totalPublishedQuotes?: number
  totalAuthors?: number
  quotesLast7Days: number
  verifiedQuotesCount?: number
  errorMessage?: string | null
}

const HISTORICAL_EPOCHS = [
  {
    icon: "🏛️",
    name: "Classical Antiquity",
    period: "c. 800 BC – 500 AD",
    description: "Stoic emperors, Upanishadic sages, and Greek dialogues on virtue and courage.",
  },
  {
    icon: "🕯️",
    name: "Renaissance & Enlightenment",
    period: "c. 1400 – 1800",
    description: "Humanism, the birth of modern science, and foundational treatises on freedom.",
  },
  {
    icon: "📜",
    name: "The 19th Century",
    period: "c. 1800 – 1900",
    description: "Romanticism, Transcendentalism, realism, and existential self-interrogation.",
  },
  {
    icon: "🌐",
    name: "20th Century & Beyond",
    period: "1900 – Present",
    description: "Voices of resilience, civil reformers, Nobel laureates, and poetic innovators.",
  },
] as const

export function HomeHighlights({
  totalPublishedQuotes = 0,
  totalAuthors = 0,
  quotesLast7Days,
  errorMessage,
}: HomeHighlightsProps) {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]" aria-label="Curator Highlights">
      {errorMessage ? (
        <div className="lg:col-span-2 rounded-[1.4rem] border border-amber-300/60 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-[0_10px_30px_rgba(120,53,15,0.08)]">
          {errorMessage}
        </div>
      ) : null}

      {/* Left: The Literary Sanctuary Parchment */}
      <section className="animate-rise relative isolate flex flex-col justify-start gap-6 overflow-hidden rounded-[2rem] border border-amber-900/10 bg-gradient-to-br from-white via-[#faf6f0] to-[#f4ede2] p-6 sm:p-8 lg:p-10 shadow-[0_20px_60px_rgba(33,37,41,0.08)]">
        {/* Subtle Watermark Seal */}
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full border-[12px] border-amber-800/5 bg-radial from-amber-600/5 to-transparent blur-xs select-none"
          aria-hidden="true"
        />

        {/* Header & Pillar Badge */}
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-800/15 bg-amber-800/6 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-rust)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-rust)] animate-pulse" />
            The Curator’s Parchment
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--ink-900)] leading-tight">
            Where ancient reflections meet living contemplations.
          </h2>
          <p className="text-sm leading-relaxed text-[var(--ink-700)]">
            Quotzen is a quiet sanctuary dedicated to the enduring resonance of language.
            Here, passages are gathered with scholarly care—treated not as disposable internet
            snippets, but as living cultural monuments.
          </p>
        </div>

        {/* Interactive Folio Switcher & Cards */}
        <CuratorFolioTabs quotesLast7Days={quotesLast7Days} />

        {/* Curatorial Charter & Textual Oath Seal */}
        <div className="rounded-2xl border border-amber-900/12 bg-white/80 p-5 shadow-2xs backdrop-blur-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-900/8 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-base" aria-hidden="true">📜</span>
              <span className="text-xs font-serif font-bold uppercase tracking-[0.16em] text-[var(--ink-900)]">
                The Curatorial Charter &amp; Textual Oath
              </span>
            </div>
            <span className="rounded-full bg-amber-800/8 px-2.5 py-0.5 text-[10px] font-semibold text-[var(--accent-rust)] uppercase tracking-wider">
              Scholarly Rigor
            </span>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-[var(--ink-700)]/90 font-serif italic">
            “We reject the ephemeral speed and algorithmic noise of modern feeds. Every quotation in this archive is cross-checked against primary texts, preserved in full historical context, and made freely available for unhurried contemplation.”
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-amber-900/10 pt-3 text-xs text-stone-700">
            <div className="flex items-center gap-2">
              <span className="text-emerald-700 font-bold" aria-hidden="true">✓</span>
              <span className="font-serif">Primary Source Verified</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-700 font-bold" aria-hidden="true">✓</span>
              <span className="font-serif">Preserved in Historical Context</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-700 font-bold" aria-hidden="true">✓</span>
              <span className="font-serif">Distraction-Free Sanctuary</span>
            </div>
          </div>
        </div>

        {/* Footer Marginalia Callout */}
        <div className="rounded-2xl border border-amber-900/10 bg-amber-800/4 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-800/10 text-amber-900 text-lg" aria-hidden="true">
              ✒️
            </span>
            <p className="font-serif italic text-xs sm:text-sm text-stone-800">
              “Words outlive the hands that wrote them and the stone temples that housed them.”
            </p>
          </div>

          <Link
            href="/quotes"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--accent-rust)] hover:underline"
          >
            <span>Explore Complete Archive</span>
            <span>&rarr;</span>
          </Link>
        </div>
      </section>

      {/* Right: Sanctuary Scope & Historical Horizons */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
        {/* Sanctuary Vitality Panel */}
        <Panel
          title="Sanctuary Scope & Vitality"
          subtitle="A living treasury curated for unhurried study and contemplation."
          tone="sand"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-stone-200/80 bg-white/90 p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-2xl" aria-hidden="true">🏛️</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-rust)]">Preserved</span>
              </div>
              <div className="mt-2 text-xl font-bold font-serif text-stone-900">
                {formatNumber(totalPublishedQuotes || 0)}
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">Verified passages</div>
            </div>

            <div className="rounded-2xl border border-stone-200/80 bg-white/90 p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-2xl" aria-hidden="true">✒️</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-rust)]">Thinkers</span>
              </div>
              <div className="mt-2 text-xl font-bold font-serif text-stone-900">
                {formatNumber(totalAuthors || 0)}
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">Across civilizations</div>
            </div>

            <div className="rounded-2xl border border-stone-200/80 bg-white/90 p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-2xl" aria-hidden="true">📜</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Vitality</span>
              </div>
              <div className="mt-2 text-xl font-bold font-serif text-stone-900">
                +{formatNumber(quotesLast7Days || 0)}
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">Added this week</div>
            </div>

            <div className="rounded-2xl border border-stone-200/80 bg-white/90 p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-2xl" aria-hidden="true">🔍</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">Standard</span>
              </div>
              <div className="mt-2 text-xl font-bold font-serif text-stone-900">
                100%
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">Primary editions</div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-amber-900/10 flex items-center justify-between text-xs">
            <span className="text-stone-600 font-serif italic text-[11px]">Free open knowledge for all readers</span>
            <Link
              href="/quotes"
              className="font-semibold text-[var(--accent-rust)] hover:underline inline-flex items-center gap-1"
            >
              <span>Search all quotes</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </Panel>

        {/* Epochs of Human Thought Panel */}
        <Panel
          title="Epochs of Human Inquiry"
          subtitle="Trace the evolution of contemplation across three thousand years."
          tone="mist"
        >
          <div className="space-y-2.5">
            {HISTORICAL_EPOCHS.map((epoch) => (
              <div
                key={epoch.name}
                className="rounded-2xl border border-stone-200/80 bg-white/90 p-3 shadow-2xs transition-all hover:border-amber-800/30 hover:bg-white"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg" aria-hidden="true">{epoch.icon}</span>
                    <span className="font-serif font-bold text-xs text-stone-900">
                      {epoch.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                    {epoch.period}
                  </span>
                </div>
                <p className="text-[11px] text-stone-600 mt-1 line-clamp-1">
                  {epoch.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-3 text-right">
            <Link
              href="/authors"
              className="text-xs font-semibold text-[var(--accent-rust)] hover:underline inline-flex items-center gap-1"
            >
              <span>Explore all thinkers across eras</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </Panel>
      </section>
    </section>
  )
}
