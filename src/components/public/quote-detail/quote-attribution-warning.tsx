import * as React from "react"

export interface QuoteAttributionWarningProps {
  attributionStatus?: string | null
  isVerified?: boolean
  authorName: string
  verificationNote?: string | null
  className?: string
}

export function QuoteAttributionWarning({
  attributionStatus,
  isVerified,
  authorName,
  verificationNote,
  className = "",
}: QuoteAttributionWarningProps) {
  const isMisattributed = attributionStatus === "MISATTRIBUTED"
  const isDisputed = attributionStatus === "DISPUTED"
  const isConfirmed = attributionStatus === "CONFIRMED" && isVerified

  if (!isMisattributed && !isDisputed && !isConfirmed) {
    return null
  }

  if (isConfirmed) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50/70 px-3 py-1 text-xs font-semibold text-emerald-800 ${className}`}
        role="status"
        aria-label="Verified primary citation"
      >
        <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        <span>Verified Primary Citation</span>
      </div>
    )
  }

  return (
    <aside
      className={`rounded-2xl border p-4 sm:p-5 transition-all shadow-2xs space-y-2.5 ${
        isMisattributed
          ? "border-amber-300 bg-amber-50/70 text-amber-950"
          : "border-stone-300 bg-stone-50/90 text-stone-900"
      } ${className}`}
      role="note"
      aria-label="Scholarly attribution notice"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-200/80 text-amber-900 text-xs font-bold">
          {isMisattributed ? "⚠️" : "⚖️"}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
            {isMisattributed ? "Common Misattribution" : "Disputed Historical Provenance"}
          </span>
          <span className="rounded-full bg-white/80 border border-amber-300/60 px-2 py-0.2 text-[10px] font-mono font-bold text-amber-800">
            Scholarly Note
          </span>
        </div>
      </div>

      <div className="text-xs sm:text-sm leading-relaxed space-y-2">
        <p>
          {isMisattributed ? (
            <>
              This quotation is frequently popularized as being by{" "}
              <strong className="font-semibold text-stone-900">{authorName}</strong>, but
              historical archives and primary sources indicate it was not said or written by them.
            </>
          ) : (
            <>
              The attribution of this quote to{" "}
              <strong className="font-semibold text-stone-900">{authorName}</strong> is
              contested by scholars or lacks contemporary primary documentation.
            </>
          )}
        </p>

        {verificationNote && (
          <div className="rounded-xl border border-amber-200/80 bg-white/90 p-3 text-xs text-stone-700 font-sans leading-normal">
            <span className="font-semibold text-stone-900 block mb-0.5">
              Historical Origin &amp; Primary Citation:
            </span>
            <p className="font-serif italic text-stone-800">{verificationNote}</p>
          </div>
        )}
      </div>
    </aside>
  )
}
