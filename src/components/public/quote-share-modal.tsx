"use client"

import * as React from "react"
import Image from "next/image"
import { Modal } from "../ui/modal"
import {
  CopyIcon,
  DownloadIcon,
  ShareIcon,
  SpinnerIcon,
  WhatsAppIcon,
} from "@/components/ui/icons"
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
              <SpinnerIcon className="w-6 h-6 animate-spin text-[var(--accent-rust)]" />
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
            <DownloadIcon className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>

          <button
            type="button"
            onClick={handleCopyImage}
            disabled={!previewUrl || isGenerating}
            className="px-3 py-2.5 rounded-xl text-xs font-semibold border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 transition-colors shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <CopyIcon className="w-3.5 h-3.5" />
            <span>{copiedImage ? "Copied!" : "Copy Image"}</span>
          </button>

          {/* WhatsApp Direct Share */}
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            title="Share quote to WhatsApp"
          >
            <WhatsAppIcon className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>

          {typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
            <button
              type="button"
              onClick={handleShareApp}
              disabled={!previewUrl || isGenerating}
              className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-[var(--ink-900)] text-white hover:bg-black transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <ShareIcon className="w-3.5 h-3.5" />
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
