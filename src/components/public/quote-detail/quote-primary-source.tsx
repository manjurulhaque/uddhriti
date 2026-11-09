import * as React from "react"
import { isSafeExternalUrl } from "@/lib/security/input"

export interface QuoteSourceInfo {
  id?: string
  title: string
  year?: number | null
  type: string
  publisher?: string | null
  description?: string | null
  externalUrl?: string | null
}

export interface QuotePrimarySourceProps {
  source: QuoteSourceInfo
  verificationNote?: string | null
  className?: string
}

export function QuotePrimarySource({
  source,
  verificationNote,
  className = "",
}: QuotePrimarySourceProps) {
  if (!source) return null

  return (
    <section
      className={`rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-2xs space-y-4 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-rust)]/10 text-[var(--accent-rust)] text-base">
            📖
          </span>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-rust)] block">
              Primary Literary Source
            </span>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-stone-900">
              {source.title} {source.year ? `(${source.year})` : ""}
            </h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-stone-100 border border-stone-200 px-3 py-0.5 font-semibold text-stone-700 uppercase text-[10px] tracking-wider">
            {source.type.toLowerCase()}
          </span>
          {source.publisher && (
            <span className="text-stone-500 text-xs">
              Published by {source.publisher}
            </span>
          )}
        </div>
      </div>

      {source.description && (
        <p className="font-serif text-xs sm:text-sm text-stone-700 leading-relaxed italic">
          {source.description}
        </p>
      )}

      {verificationNote && (
        <div className="rounded-xl bg-stone-50 border border-stone-200/80 p-3 text-xs text-stone-700 flex items-start gap-2">
          <span className="font-bold text-stone-900 shrink-0">Verification Reference:</span>
          <span className="font-mono text-stone-600">{verificationNote}</span>
        </div>
      )}

      {isSafeExternalUrl(source.externalUrl) && (
        <div className="pt-1">
          <a
            href={source.externalUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-rust)] hover:underline"
          >
            <span>Examine primary text in historical library catalog</span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      )}
    </section>
  )
}

