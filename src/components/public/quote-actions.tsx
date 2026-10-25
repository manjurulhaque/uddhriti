"use client"

import * as React from "react"

interface QuoteActionsProps {
  content: string
  authorName?: string | null
  quoteUrl?: string
  views?: number
}

export function QuoteActions({
  content,
  authorName,
  quoteUrl,
  views,
}: QuoteActionsProps) {
  const [copied, setCopied] = React.useState(false)

  async function handleCopy() {
    const textToCopy = `“${content}”\n— ${authorName || "Unknown"}\n\nVia Uddhriti Quotations`
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  async function handleShare() {
    const url = quoteUrl || (typeof window !== "undefined" ? window.location.href : "")
    const shareText = `“${content}” — ${authorName || "Unknown"}`

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Quote by ${authorName || "Uddhriti"}`,
          text: shareText,
          url,
        })
        return
      } catch {
        // User cancelled or share failed, fallback to twitter intent
      }
    }

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      shareText
    )}&url=${encodeURIComponent(url)}`
    window.open(twitterUrl, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-stone-200/80 font-sans">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
            copied
              ? "border-emerald-500 bg-emerald-50 text-emerald-800"
              : "border-stone-300 bg-white text-stone-800 hover:border-stone-900 hover:bg-stone-50 shadow-2xs"
          }`}
          aria-label="Copy quote to clipboard"
        >
          {copied ? (
            <>
              <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <svg className="h-4 w-4 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy Quote</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-stone-800 hover:border-stone-900 hover:bg-stone-50 shadow-2xs transition-all cursor-pointer"
          aria-label="Share quote"
        >
          <svg className="h-4 w-4 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span>Share</span>
        </button>
      </div>

      {typeof views === "number" && (
        <div className="flex items-center gap-1.5 text-xs text-stone-400 font-mono">
          <svg className="h-3.5 w-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>{views.toLocaleString()} views</span>
        </div>
      )}
    </div>
  )
}
