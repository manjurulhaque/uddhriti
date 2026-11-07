"use client"

import * as React from "react"
import { BookmarkIcon } from "@/components/ui"
import { useCopyToClipboard } from "@/hooks"
import { useSavedQuotes } from "@/lib/saved-quotes"
import { getWhatsAppShareUrl, getXShareUrl } from "@/lib/share"
import { QuoteShareModal } from "./quote-share-modal"
import { QuoteZenMode } from "./quote-zen-mode"

interface QuoteActionsProps {
  id?: string
  slug?: string
  content: string
  authorName?: string | null
  authorSlug?: string | null
  category?: string | null
  categorySlug?: string | null
  sourceTitle?: string | null
  year?: string | null
  tags?: string[]
  quoteUrl?: string
  views?: number
}

export function QuoteActions({
  id,
  slug,
  content,
  authorName,
  authorSlug,
  category,
  categorySlug,
  sourceTitle,
  year,
  tags,
  quoteUrl,
  views,
}: QuoteActionsProps) {
  const { copied, copyQuote } = useCopyToClipboard()
  const [shareModalOpen, setShareModalOpen] = React.useState(false)
  const [zenModeOpen, setZenModeOpen] = React.useState(false)
  const [overrideViews, setOverrideViews] = React.useState<number | null>(null)
  const { isSaved, toggleSave } = useSavedQuotes()

  // Listen for keyboard 'Z' to enter Zen Focus Mode
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (zenModeOpen || shareModalOpen) return
      const target = e.target as HTMLElement | null
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return
      if (e.key === "z" || e.key === "Z") {
        e.preventDefault()
        setZenModeOpen(true)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [zenModeOpen, shareModalOpen])

  const displayViews = overrideViews ?? views

  // Automatically record view count on mount with session-level deduplication
  React.useEffect(() => {
    const targetKey = id || slug
    if (!targetKey) return

    const sessionKey = `quotzen_viewed_${targetKey}`
    try {
      if (sessionStorage.getItem(sessionKey)) {
        return
      }
      sessionStorage.setItem(sessionKey, "1")
    } catch {
      // Ignore sessionStorage availability errors
    }

    fetch(`/api/quotes/${encodeURIComponent(targetKey)}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.views === "number") {
          setOverrideViews(data.views)
        }
      })
      .catch(() => {
        // Non-blocking fail-safe
      })
  }, [id, slug])

  const quoteKey = id || slug || content
  const saved = isSaved(quoteKey)

  function recordShare() {
    const targetKey = id || slug
    if (!targetKey) return
    fetch(`/api/quotes/${encodeURIComponent(targetKey)}/share`, {
      method: "POST",
      keepalive: true,
    }).catch(() => {})
  }

  function handleCopy() {
    copyQuote({ content, authorName, sourceTitle })
  }

  function handleXShare() {
    const url = quoteUrl || (typeof window !== "undefined" ? window.location.href : "")
    const xUrl = getXShareUrl({
      content,
      authorName,
      sourceTitle,
      year,
      quoteUrl: url,
    })
    recordShare()
    window.open(xUrl, "_blank", "noopener,noreferrer")
  }

  function handleWhatsAppShare() {
    const url = quoteUrl || (typeof window !== "undefined" ? window.location.href : "")
    const whatsappUrl = getWhatsAppShareUrl({
      content,
      authorName,
      sourceTitle,
      year,
      quoteUrl: url,
    })
    recordShare()
    window.open(whatsappUrl, "_blank", "noopener,noreferrer")
  }

  function handleToggleSave() {
    toggleSave({
      id: quoteKey,
      slug,
      content,
      authorName,
      authorSlug,
      category,
      categorySlug,
      sourceTitle,
      year,
      tags,
    })
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-stone-200/80 font-sans">
        <div className="flex flex-wrap items-center gap-2">
          {/* Copy Text Button */}
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
                <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Copied!</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Copy Quote</span>
              </>
            )}
          </button>

          {/* Share as Image Card Button */}
          <button
            type="button"
            onClick={() => {
              recordShare()
              setShareModalOpen(true)
            }}
            className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-stone-800 hover:border-stone-900 hover:bg-stone-50 shadow-2xs transition-all cursor-pointer"
            aria-label="Export quotation as image card"
          >
            <svg className="h-4 w-4 text-[var(--accent-rust)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Card Image</span>
          </button>

          {/* WhatsApp Direct Share Button */}
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-300/80 bg-emerald-50/80 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-emerald-950 hover:border-emerald-500 hover:bg-emerald-100/90 shadow-2xs transition-all cursor-pointer group"
            aria-label="Share quotation on WhatsApp"
            title="Share quote on WhatsApp"
          >
            <svg
              className="h-4 w-4 text-emerald-600 transition-transform group-hover:scale-110"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
            <span>WhatsApp</span>
          </button>

          {/* Share on X Button */}
          <button
            type="button"
            onClick={handleXShare}
            className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-stone-800 hover:border-stone-900 hover:bg-stone-50 shadow-2xs transition-all cursor-pointer group"
            aria-label="Share quotation on X"
            title="Share quote on X"
          >
            <svg
              className="h-3.5 w-3.5 text-stone-700 transition-transform group-hover:scale-110"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span>X</span>
          </button>

          {/* Save / Bookmark Button */}
          <button
            type="button"
            onClick={handleToggleSave}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              saved
                ? "border-[var(--accent-rust)] bg-[#c76b3e]/10 text-[var(--accent-rust)]"
                : "border-stone-300 bg-white text-stone-800 hover:border-stone-900 hover:bg-stone-50 shadow-2xs"
            }`}
            aria-label={saved ? "Remove quote from saved notebook" : "Save quote for offline reading"}
          >
            <BookmarkIcon
              filled={saved}
              className={`h-4 w-4 transition-transform active:scale-125 ${
                saved ? "text-[var(--accent-rust)] fill-current" : "text-stone-500"
              }`}
            />
            <span>{saved ? "Saved" : "Save Quote"}</span>
          </button>

          {/* Zen Contemplation Mode Button */}
          <button
            type="button"
            onClick={() => setZenModeOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-amber-300/80 bg-gradient-to-r from-amber-50/90 to-orange-50/70 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-amber-950 hover:border-amber-400 hover:bg-amber-100/80 shadow-2xs transition-all cursor-pointer group"
            aria-label="Enter distraction-free Zen contemplation mode (Press Z)"
            title="Distraction-Free Zen Contemplation (Shortcut: Z)"
          >
            <svg
              className="h-4 w-4 text-[var(--accent-rust)] transition-transform group-hover:scale-110"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" strokeWidth="2" />
              <circle cx="12" cy="12" r="8" strokeWidth="1.5" strokeDasharray="3 3" />
            </svg>
            <span>Zen Mode</span>
            <kbd className="hidden sm:inline-block rounded bg-amber-200/60 px-1 py-0.2 text-[9px] font-mono font-bold text-amber-900">
              Z
            </kbd>
          </button>
        </div>

        {typeof displayViews === "number" && (
          <div className="flex items-center gap-1.5 text-xs text-stone-400 font-mono">
            <svg className="h-3.5 w-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>{displayViews.toLocaleString()} views</span>
          </div>
        )}
      </div>

      {/* Quote Card Image Export Modal */}
      <QuoteShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        content={content}
        authorName={authorName}
        sourceTitle={sourceTitle}
        quoteUrl={quoteUrl}
      />

      {/* Zen Contemplation Mode Overlay */}
      <QuoteZenMode
        isOpen={zenModeOpen}
        onClose={() => setZenModeOpen(false)}
        id={id}
        slug={slug}
        content={content}
        authorName={authorName}
        authorSlug={authorSlug}
        category={category}
        categorySlug={categorySlug}
        sourceTitle={sourceTitle}
        year={year}
        tags={tags}
        quoteUrl={quoteUrl}
      />
    </>
  )
}
