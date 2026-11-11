"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import {
  BookmarkIcon,
  CheckIcon,
  CopyIcon,
  EyeIcon,
  FacebookIcon,
  InstagramIcon,
  PhotoIcon,
  WhatsAppIcon,
  XIcon,
  ZenRingIcon,
} from "@/components/ui/icons"
import { useCopyToClipboard } from "@/hooks"
import { useSavedQuotes } from "@/lib/saved-quotes"
import { getWhatsAppShareUrl, getXShareUrl, getFacebookShareUrl, getInstagramShareUrl } from "@/lib/share"

const QuoteShareModal = dynamic(
  () => import("./quote-share-modal").then((mod) => mod.QuoteShareModal),
  { ssr: false }
)

const QuoteZenMode = dynamic(
  () => import("./quote-zen-mode").then((mod) => mod.QuoteZenMode),
  { ssr: false }
)

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
  showViews?: boolean
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
  showViews = false,
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

  function handleFacebookShare() {
    const url = quoteUrl || (typeof window !== "undefined" ? window.location.href : "")
    const fbUrl = getFacebookShareUrl({ quoteUrl: url })
    recordShare()
    window.open(fbUrl, "_blank", "noopener,noreferrer")
  }

  function handleInstagramShare() {
    recordShare()
    const url = quoteUrl || (typeof window !== "undefined" ? window.location.href : "")
    const author = authorName ? ` — ${authorName}` : ""
    const shareText = `“${content}”${author}`

    const isMobile =
      typeof navigator !== "undefined" &&
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

    if (isMobile && typeof navigator.share === "function") {
      navigator
        .share({
          title: authorName ? `Quote by ${authorName}` : "Quote from Quotzen",
          text: shareText,
          url,
        })
        .catch(() => {
          window.open(getInstagramShareUrl(), "_blank", "noopener,noreferrer")
        })
      return
    }

    copyQuote({ content, authorName, sourceTitle })
    window.open(getInstagramShareUrl(), "_blank", "noopener,noreferrer")
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
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Copy Text Button */}
          <button
            type="button"
            onClick={handleCopy}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              copied
                ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                : "border-stone-300 bg-white text-stone-800 hover:border-stone-900 hover:bg-stone-50 shadow-2xs"
            }`}
            aria-label="Copy quote to clipboard"
          >
            {copied ? (
              <>
                <CheckIcon className="h-3.5 w-3.5 text-emerald-600" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <CopyIcon className="h-3.5 w-3.5 text-stone-500" />
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
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-800 hover:border-stone-900 hover:bg-stone-50 shadow-2xs transition-all cursor-pointer"
            aria-label="Export quotation as image card"
          >
            <PhotoIcon className="h-3.5 w-3.5 text-[var(--accent-rust)]" />
            <span>Card Image</span>
          </button>

          {/* WhatsApp Direct Share Button */}
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/80 bg-emerald-50/80 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-950 hover:border-emerald-500 hover:bg-emerald-100/90 shadow-2xs transition-all cursor-pointer group"
            aria-label="Share quotation on WhatsApp"
            title="Share quote on WhatsApp"
          >
            <WhatsAppIcon className="h-3.5 w-3.5 text-emerald-600 transition-transform group-hover:scale-110" />
            <span>WhatsApp</span>
          </button>

          {/* Share on X Button */}
          <button
            type="button"
            onClick={handleXShare}
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-800 hover:border-stone-900 hover:bg-stone-50 shadow-2xs transition-all cursor-pointer group"
            aria-label="Share quotation on X"
            title="Share quote on X"
          >
            <XIcon className="h-3 w-3 text-stone-700 transition-transform group-hover:scale-110" />
            <span>X</span>
          </button>

          {/* Share on Facebook Button */}
          <button
            type="button"
            onClick={handleFacebookShare}
            className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/80 bg-blue-50/60 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-blue-950 hover:border-blue-400 hover:bg-blue-100/80 shadow-2xs transition-all cursor-pointer group"
            aria-label="Share quotation on Facebook"
            title="Share quote on Facebook"
          >
            <FacebookIcon className="h-3.5 w-3.5 text-[#1877F2] transition-transform group-hover:scale-110" />
            <span>Facebook</span>
          </button>

          {/* Share on Instagram Button */}
          <button
            type="button"
            onClick={handleInstagramShare}
            className="inline-flex items-center gap-1.5 rounded-full border border-pink-200/80 bg-pink-50/60 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-pink-950 hover:border-pink-400 hover:bg-pink-100/80 shadow-2xs transition-all cursor-pointer group"
            aria-label="Share quotation on Instagram"
            title="Share quote on Instagram"
          >
            <InstagramIcon className="h-3.5 w-3.5 text-[#E4405F] transition-transform group-hover:scale-110" />
            <span>Instagram</span>
          </button>

          {/* Save / Bookmark Button */}
          <button
            type="button"
            onClick={handleToggleSave}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              saved
                ? "border-[var(--accent-rust)] bg-[#c76b3e]/10 text-[var(--accent-rust)]"
                : "border-stone-300 bg-white text-stone-800 hover:border-stone-900 hover:bg-stone-50 shadow-2xs"
            }`}
            aria-label={saved ? "Remove quote from saved notebook" : "Save quote for offline reading"}
          >
            <BookmarkIcon
              filled={saved}
              className={`h-3.5 w-3.5 transition-transform active:scale-125 ${
                saved ? "text-[var(--accent-rust)] fill-current" : "text-stone-500"
              }`}
            />
            <span>{saved ? "Saved" : "Save Quote"}</span>
          </button>

          {/* Zen Contemplation Mode Button */}
          <button
            type="button"
            onClick={() => setZenModeOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-gradient-to-r from-amber-50/90 to-orange-50/70 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-950 hover:border-amber-400 hover:bg-amber-100/80 shadow-2xs transition-all cursor-pointer group"
            aria-label="Enter distraction-free Zen contemplation mode (Press Z)"
            title="Distraction-Free Zen Contemplation (Shortcut: Z)"
          >
            <ZenRingIcon className="h-3.5 w-3.5 text-[var(--accent-rust)] transition-transform group-hover:scale-110" />
            <span>Zen Mode</span>
            <kbd className="hidden sm:inline-block rounded bg-amber-200/60 px-1 py-0.2 text-[8px] font-mono font-bold text-amber-900">
              Z
            </kbd>
          </button>
        </div>

        {showViews && typeof displayViews === "number" && (
          <div className="flex items-center gap-1.5 text-xs text-stone-400 font-mono">
            <EyeIcon className="h-3.5 w-3.5 opacity-60" />
            <span>{displayViews.toLocaleString()} views</span>
          </div>
        )}
      </div>

      {/* Quote Card Image Export Modal (Lazy-Loaded) */}
      {shareModalOpen && (
        <QuoteShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          content={content}
          authorName={authorName}
          sourceTitle={sourceTitle}
          quoteUrl={quoteUrl}
        />
      )}

      {/* Zen Contemplation Mode Overlay (Lazy-Loaded) */}
      {zenModeOpen && (
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
      )}
    </>
  )
}
