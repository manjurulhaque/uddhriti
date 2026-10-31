import * as React from "react"
import Link from "next/link"
import { Panel } from "../ui/card"
import { CuratorFolioTabs } from "./curator-folio-tabs"

export interface HomeHighlightsProps {
  errorMessage?: string | null
}

const PHILOSOPHICAL_TRADITIONS = [
  {
    icon: "🏛️",
    name: "Classical & Stoic Virtue",
    description: "Reflections on duty, inner fortitude, and tranquil reason from Marcus Aurelius, Epictetus, and Seneca.",
  },
  {
    icon: "🕯️",
    name: "Eastern Contemplation",
    description: "Upanishadic insight, Taoist harmony, and Sufi poetics exploring the stillness behind spoken words.",
  },
  {
    icon: "📜",
    name: "Enlightenment & Reason",
    description: "Foundational treatises on individual freedom, human rights, and the boundless courage to think.",
  },
  {
    icon: "🌿",
    name: "Romantic & Existential Wonder",
    description: "The arrest of beauty, melancholy, moral choice, and the deep mystery of the human condition.",
  },
] as const

const HISTORICAL_EPOCHS = [
  {
    icon: "🏛️",
    name: "Classical Antiquity",
    period: "c. 800 BC – 500 AD",
    description: "Greco-Roman thinkers, Vedic sages, and foundational dialogues on virtue and life.",
  },
  {
    icon: "🕯️",
    name: "Renaissance & Enlightenment",
    period: "c. 1400 – 1800",
    description: "Humanism, early scientific inquiry, and revolutionary discourses on human liberty.",
  },
  {
    icon: "📜",
    name: "The 19th Century",
    period: "c. 1800 – 1900",
    description: "Romanticism, Transcendentalism, realism, and existential philosophical questioning.",
  },
  {
    icon: "🌐",
    name: "20th Century & Beyond",
    period: "1900 – Present",
    description: "Voices of moral courage, civil reformers, Nobel laureates, and modern literary masters.",
  },
] as const

export function HomeHighlights({ errorMessage }: HomeHighlightsProps = {}) {
  return (
    <section
      id="highlights"
      className="scroll-mt-20 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"
      aria-label="Curator Highlights"
    >
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
        <div className="space-y-3 max-w-2xl">
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

          {/* Verification Guarantee Strip */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-stone-700 border-t border-amber-900/8 pt-3">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="text-emerald-700 font-bold" aria-hidden="true">✓</span>
              <span>Primary source verified</span>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="text-emerald-700 font-bold" aria-hidden="true">✓</span>
              <span>Historical context cited</span>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="text-emerald-700 font-bold" aria-hidden="true">✓</span>
              <span>Distraction-free sanctuary</span>
            </span>
          </div>
        </div>

        {/* Interactive Folio Switcher & Cards */}
        <CuratorFolioTabs />

        {/* Footer Marginalia Callout */}
        <div className="rounded-2xl border border-amber-900/10 bg-amber-800/4 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 mt-auto">
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

      {/* Right: Traditions & Historical Horizons */}
      <section className="flex flex-col gap-6">
        {/* Philosophical Traditions Panel */}
        <Panel
          title="Philosophical Traditions"
          subtitle="Enduring schools of reflection that have shaped human wisdom."
          tone="sand"
        >
          <div className="space-y-2.5">
            {PHILOSOPHICAL_TRADITIONS.map((tradition) => (
              <div
                key={tradition.name}
                className="rounded-2xl border border-stone-200/80 bg-white/90 p-3.5 shadow-2xs transition-all hover:border-amber-800/30 hover:bg-white"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base" aria-hidden="true">{tradition.icon}</span>
                  <h3 className="font-serif font-bold text-xs sm:text-sm text-stone-900">
                    {tradition.name}
                  </h3>
                </div>
                <p className="text-[11px] text-stone-600 mt-1 leading-relaxed">
                  {tradition.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-3 text-right">
            <Link
              href="/categories"
              className="text-xs font-semibold text-[var(--accent-rust)] hover:underline inline-flex items-center gap-1"
            >
              <span>Explore all thematic horizons</span>
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
                    <h3 className="font-serif font-bold text-xs text-stone-900">
                      {epoch.name}
                    </h3>
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
