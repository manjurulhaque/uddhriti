import * as React from "react"

export interface QuoteCuratorialNotesProps {
  meaning?: string | null
  historicalContext?: string | null
  modernRelevance?: string | null
  className?: string
}

export function QuoteCuratorialNotes({
  meaning,
  historicalContext,
  modernRelevance,
  className = "",
}: QuoteCuratorialNotesProps) {
  if (!meaning && !historicalContext && !modernRelevance) return null

  return (
    <section className={`space-y-6 ${className}`}>
      <div className="border-b border-stone-900/10 pb-3">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-rust)]">
          Curatorial Notes
        </span>
        <h2 className="font-serif text-2xl font-bold tracking-tight text-[var(--ink-900)] mt-0.5">
          Meaning &amp; Historical Context
        </h2>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {meaning && (
          <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-2xs space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
              <span aria-hidden="true">💡</span> Philosophical Meaning
            </span>
            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-serif">
              {meaning}
            </p>
          </div>
        )}

        {historicalContext && (
          <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-2xs space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
              <span aria-hidden="true">📜</span> Historical Context
            </span>
            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-serif">
              {historicalContext}
            </p>
          </div>
        )}

        {modernRelevance && (
          <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-2xs space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
              <span aria-hidden="true">🌱</span> Modern Relevance
            </span>
            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-serif">
              {modernRelevance}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

