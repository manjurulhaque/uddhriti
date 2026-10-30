"use client"

import * as React from "react"
import Image from "next/image"
import { Modal } from "../ui/modal"
import { generateQuoteCardBlob } from "@/lib/quote-image"
import { getWhatsAppShareUrl } from "@/lib/share"

export interface QuoteShareModalProps {
  isOpen: boolean
  onClose: () => void
  content: string
  authorName?: string | null
  sourceTitle?: string | null
  quoteUrl?: string
}

export function QuoteShareModal({
  isOpen,
  onClose,
  content,
  authorName,
  sourceTitle,
  quoteUrl,
}: QuoteShareModalProps) {
  const [theme, setTheme] = React.useState<"cream" | "dark">("cream")
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [currentBlob, setCurrentBlob] = React.useState<Blob | null>(null)
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [copiedImage, setCopiedImage] = React.useState(false)

  // Generate image whenever open or theme changes
  React.useEffect(() => {
    if (!isOpen) return

    let isSubscribed = true
    let createdUrl: string | null = null
    const abortController = new AbortController()

    generateQuoteCardBlob({
      content,
      authorName,
      sourceTitle,
      theme,
    })
      .then((blob) => {
        if (!isSubscribed || abortController.signal.aborted) return
        setCurrentBlob(blob)
        createdUrl = URL.createObjectURL(blob)
        setPreviewUrl(createdUrl)
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          console.error("Failed to generate quote image:", err)
        }
      })
      .finally(() => {
        if (isSubscribed && !abortController.signal.aborted) {
          setIsGenerating(false)
        }
      })

    return () => {
      isSubscribed = false
      abortController.abort()
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl)
      }
    }
  }, [isOpen, theme, content, authorName, sourceTitle])

  function handleClose() {
    setPreviewUrl(null)
    setCurrentBlob(null)
    onClose()
  }

  function handleDownload() {
    if (!currentBlob) return
    const authorSlug = (authorName || "quote")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 30)
    const fileName = `quotzen-${authorSlug}.png`

    const a = document.createElement("a")
    a.href = URL.createObjectURL(currentBlob)
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  async function handleShareApp() {
    if (!currentBlob || typeof navigator === "undefined" || !navigator.share) return

    const author = authorName || "Unknown"
    const file = new File([currentBlob], `quote-${author}.png`, {
      type: "image/png",
    })

    try {
      const shareData: ShareData = {
        title: `Quote by ${author}`,
        text: `“${content}” — ${author}`,
      }

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        shareData.files = [file]
      } else if (quoteUrl) {
        shareData.url = quoteUrl
      }

      await navigator.share(shareData)
    } catch {
      // User cancelled or share dismissed
    }
  }

  async function handleCopyImage() {
    if (!currentBlob || typeof navigator === "undefined" || !navigator.clipboard) return

    try {
      if (typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": currentBlob,
          }),
        ])
        setCopiedImage(true)
        setTimeout(() => setCopiedImage(false), 2000)
      } else {
        // Fallback to text copy
        await navigator.clipboard.writeText(`“${content}” — ${authorName || "Unknown"}`)
        setCopiedImage(true)
        setTimeout(() => setCopiedImage(false), 2000)
      }
    } catch (err) {
      console.warn("Clipboard write failed:", err)
    }
  }

  function handleWhatsAppShare() {
    const url = quoteUrl || (typeof window !== "undefined" ? window.location.href : "")
    const shareUrl = getWhatsAppShareUrl({
      content,
      authorName,
      sourceTitle,
      quoteUrl: url,
    })
    window.open(shareUrl, "_blank", "noopener,noreferrer")
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Share as Image Card"
      description="Export an editorial quotation card designed for Instagram, Twitter, or personal notes."
      maxWidth="md"
    >
      <div className="space-y-5">
        {/* Theme Selector */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Card Palette
          </span>
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-stone-100 border border-stone-200">
            <button
              type="button"
              onClick={() => setTheme("cream")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                theme === "cream"
                  ? "bg-white text-stone-900 shadow-2xs font-semibold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Paper Cream
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                theme === "dark"
                  ? "bg-[var(--ink-900)] text-white shadow-2xs font-semibold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Midnight
            </button>
          </div>
        </div>

        {/* Card Preview Container */}
        <div className="relative aspect-square w-full max-w-[340px] mx-auto overflow-hidden rounded-2xl border border-stone-200/80 shadow-md bg-stone-50 flex items-center justify-center">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt="Quote card preview"
              fill
              unoptimized
              className="object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-stone-400">
              <svg
                className="w-6 h-6 animate-spin text-[var(--accent-rust)]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
              <span className="text-xs font-serif italic">Crafting editorial card...</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!previewUrl || isGenerating}
            className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-[var(--accent-rust)] text-white hover:opacity-90 transition-opacity shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Download</span>
          </button>

          <button
            type="button"
            onClick={handleCopyImage}
            disabled={!previewUrl || isGenerating}
            className="px-3 py-2.5 rounded-xl text-xs font-semibold border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 transition-colors shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <span>{copiedImage ? "Copied!" : "Copy Image"}</span>
          </button>

          {/* WhatsApp Direct Share */}
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            title="Share quote to WhatsApp"
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
            <span>WhatsApp</span>
          </button>

          {typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
            <button
              type="button"
              onClick={handleShareApp}
              disabled={!previewUrl || isGenerating}
              className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-[var(--ink-900)] text-white hover:bg-black transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              <span>Share to Apps</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleClose}
              className="px-3 py-2.5 rounded-xl text-xs font-semibold border border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
