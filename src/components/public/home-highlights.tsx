import * as React from "react"
import Link from "next/link"
import { Panel } from "../ui/card"
import { CuratorFolioTabs } from "./curator-folio-tabs"
import { PHILOSOPHICAL_TRADITIONS, HISTORICAL_EPOCHS } from "@/data/home-highlights"

export interface HomeHighlightsProps {
  errorMessage?: string | null
}

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
      <section className="animate-rise relative isolate flex flex-col justify-between gap-5 overflow-hidden rounded-[2rem] border border-amber-900/10 bg-gradient-to-br from-white via-[#faf6f0] to-[#f4ede2] p-6 sm:p-8 lg:p-10 shadow-[0_20px_60px_rgba(33,37,41,0.08)]">
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

        {/* Scholarly Provenance & Textual Integrity Block */}
        <div className="rounded-2xl border border-amber-900/12 bg-white/80 p-5 backdrop-blur-xs shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-amber-900/10 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-800/15 text-xs" aria-hidden="true">
                📜
              </span>
              <h3 className="font-serif text-xs sm:text-sm font-bold uppercase tracking-[0.16em] text-[var(--accent-rust)]">
                Textual Provenance &amp; Verification Standard
              </h3>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-900/70 bg-amber-800/8 px-2.5 py-0.5 rounded-full font-medium">
              Primary Edition Guarantee
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 text-xs text-[var(--ink-700)]">
            <div className="rounded-xl border border-amber-900/8 bg-amber-50/50 p-3">
              <div className="font-semibold text-stone-900 flex items-center gap-1.5 font-serif">
                <span className="text-emerald-700 font-bold" aria-hidden="true">✓</span>
                <span>Original Editions &amp; Translations</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-stone-600 font-sans">
                Every quote is matched against authorized critical editions (Loeb Classical Library, Oxford World’s Classics, Cambridge) to purge misattributed internet apocrypha.
              </p>
            </div>

            <div className="rounded-xl border border-amber-900/8 bg-amber-50/50 p-3">
              <div className="font-semibold text-stone-900 flex items-center gap-1.5 font-serif">
                <span className="text-emerald-700 font-bold" aria-hidden="true">✓</span>
                <span>Contextual Milieu &amp; Timestamps</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-stone-600 font-sans">
                Passages retain authorial context, composition year, and original thematic lineage so wisdom is never severed from its historical grounding.
              </p>
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

      {/* Right: Traditions & Historical Horizons */}
      <section className="flex flex-col gap-5 justify-between">
        {/* Philosophical Traditions Panel */}
        <Panel
          title="Philosophical Traditions"
          subtitle="Enduring schools of reflection that have shaped human wisdom."
          tone="sand"
        >
          <div className="space-y-2">
            {PHILOSOPHICAL_TRADITIONS.map((tradition) => (
              <div
                key={tradition.name}
                className="rounded-2xl border border-stone-200/80 bg-white/90 p-3 shadow-2xs transition-all hover:border-amber-800/30 hover:bg-white"
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
          <div className="space-y-2">
            {HISTORICAL_EPOCHS.map((epoch) => (
              <div
                key={epoch.name}
                className="rounded-2xl border border-stone-200/80 bg-white/90 p-2.5 sm:p-3 shadow-2xs transition-all hover:border-amber-800/30 hover:bg-white"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base sm:text-lg" aria-hidden="true">{epoch.icon}</span>
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
