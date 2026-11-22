"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Input, Button } from "@/components/ui"
import { normalizeWikimediaThumbnailUrl } from "@/lib/formatters"

interface AuthorRichMediaStudioProps {
  imageUrl: string
  authorName: string
  profession?: string
  nationality?: string
  onChange: (url: string) => void
}

type ImageStatus = "idle" | "loading" | "valid" | "error"

type VerifiedState = {
  url: string
  status: "valid" | "error"
  dimensions?: { width: number; height: number }
}

export function AuthorRichMediaStudio({
  imageUrl,
  authorName,
  profession,
  nationality,
  onChange,
}: AuthorRichMediaStudioProps) {
  const [verifiedState, setVerifiedState] = useState<VerifiedState | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const trimmedUrl = imageUrl.trim()

  const status: ImageStatus = !trimmedUrl
    ? "idle"
    : verifiedState?.url === trimmedUrl
    ? verifiedState.status
    : "loading"

  const dimensions =
    verifiedState?.url === trimmedUrl && verifiedState.status === "valid"
      ? verifiedState.dimensions || null
      : null

  useEffect(() => {
    if (!trimmedUrl) return

    let isCancelled = false

    const img = new window.Image()
    img.src = trimmedUrl

    img.onload = () => {
      if (!isCancelled) {
        setVerifiedState({
          url: trimmedUrl,
          status: "valid",
          dimensions: { width: img.naturalWidth, height: img.naturalHeight },
        })
      }
    }

    img.onerror = () => {
      if (isCancelled) return

      // Attempt normalized URL if different (e.g. thumb.wikimedia -> upload.wikimedia or tiff bucket size)
      const normalized = normalizeWikimediaThumbnailUrl(trimmedUrl)
      if (normalized && normalized !== trimmedUrl) {
        const retryImg = new window.Image()
        retryImg.src = normalized
        retryImg.onload = () => {
          if (!isCancelled) {
            onChange(normalized)
            setVerifiedState({
              url: normalized,
              status: "valid",
              dimensions: { width: retryImg.naturalWidth, height: retryImg.naturalHeight },
            })
          }
        }
        retryImg.onerror = () => {
          if (!isCancelled) {
            setVerifiedState({
              url: trimmedUrl,
              status: "error",
            })
          }
        }
        return
      }

      setVerifiedState({
        url: trimmedUrl,
        status: "error",
      })
    }

    return () => {
      isCancelled = true
    }
  }, [trimmedUrl, onChange])

  const isInsecure = trimmedUrl.startsWith("http://")

  return (
    <div className="space-y-4">
      {/* URL Input & Controls */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
            Portrait Image URL
          </label>
          {trimmedUrl && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-[11px] text-stone-500 hover:text-stone-900 underline underline-offset-2 cursor-pointer"
            >
              Clear Image
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              name="imageUrl"
              value={imageUrl}
              onChange={(e) => onChange(e.target.value)}
              onBlur={() => {
                const normalized = normalizeWikimediaThumbnailUrl(imageUrl)
                if (normalized && normalized !== imageUrl) {
                  onChange(normalized)
                }
              }}
              placeholder="https://upload.wikimedia.org/... or public CDN image URL"
            />
          </div>

          {trimmedUrl && status === "valid" && (
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setIsPreviewOpen(true)}
              className="shrink-0"
            >
              Full-res Preview
            </Button>
          )}
        </div>

        {/* Real-Time Health & Diagnostic Badges */}
        {trimmedUrl && (
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            {status === "loading" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-stone-100 text-stone-600 animate-pulse border border-stone-200">
                <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                Testing image accessibility...
              </span>
            )}

            {status === "valid" && dimensions && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Valid Portrait ({dimensions.width} × {dimensions.height}px)
              </span>
            )}

            {status === "error" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Image unreachable or blocked by CORS
              </span>
            )}

            {status === "error" && normalizeWikimediaThumbnailUrl(trimmedUrl) !== trimmedUrl && (
              <button
                type="button"
                onClick={() => onChange(normalizeWikimediaThumbnailUrl(trimmedUrl)!)}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition cursor-pointer"
              >
                🪄 Auto-convert to canonical Wikimedia URL
              </button>
            )}

            {isInsecure && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                ⚠️ Insecure HTTP (recommend HTTPS)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Multi-Surface Live Previews Container */}
      <div className="rounded-2xl border border-stone-200/90 bg-stone-50/60 p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-stone-200/70 pb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-700">
            Multi-Surface Rendering Preview
          </span>
          <span className="text-[10px] text-stone-400">Quotzen Responsive Design</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          {/* Surface 1: Circular Avatar (Used on Quote Cards) */}
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-stone-200/70 text-center space-y-2">
            <span className="text-[10px] uppercase font-bold text-stone-400">
              Avatar (Quote Card)
            </span>
            <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-stone-200 bg-stone-100 shadow-2xs">
              {trimmedUrl && status === "valid" ? (
                <Image
                  src={trimmedUrl}
                  alt={authorName || "Author"}
                  fill
                  sizes="64px"
                  unoptimized
                  loading="eager"
                  priority
                  referrerPolicy="no-referrer"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-400 font-bold text-lg">
                  {(authorName || "A").slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <span className="text-[10px] text-stone-500">64 × 64 circle</span>
          </div>

          {/* Surface 2: Hero Profile Card (Used on /authors/[slug] header) */}
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-stone-200/70 text-center space-y-2">
            <span className="text-[10px] uppercase font-bold text-stone-400">
              Hero Landing Card
            </span>
            <div className="relative w-24 h-28 rounded-xl overflow-hidden border border-stone-300 bg-stone-900 shadow-sm flex flex-col justify-end p-2 text-left">
              {trimmedUrl && status === "valid" ? (
                <>
                  <Image
                    src={trimmedUrl}
                    alt={authorName || "Author"}
                    fill
                    sizes="120px"
                    unoptimized
                    loading="eager"
                    priority
                    referrerPolicy="no-referrer"
                    className="object-cover opacity-85"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-stone-500 font-bold text-2xl">
                  {(authorName || "A").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="relative z-10 text-[9px] text-white/90 truncate font-semibold">
                {authorName || "Author"}
              </div>
            </div>
            <span className="text-[10px] text-stone-500">4:5 portrait banner</span>
          </div>

          {/* Surface 3: Catalog Grid Item (Used on /authors catalog) */}
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-stone-200/70 text-center space-y-2">
            <span className="text-[10px] uppercase font-bold text-stone-400">
              Directory Square
            </span>
            <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-stone-200 bg-stone-100 shadow-2xs">
              {trimmedUrl && status === "valid" ? (
                <Image
                  src={trimmedUrl}
                  alt={authorName || "Author"}
                  fill
                  sizes="64px"
                  unoptimized
                  loading="eager"
                  priority
                  referrerPolicy="no-referrer"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-400 font-bold text-sm">
                  {(authorName || "A").slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <span className="text-[10px] text-stone-500">1:1 square rounded</span>
          </div>
        </div>

        {/* Informative attribution note */}
        <p className="text-[11px] text-stone-500 italic pt-1">
          {profession || nationality ? `${[profession, nationality].filter(Boolean).join(" • ")}` : "Historical portrait will be used for attribution across all public surfaces."}
        </p>
      </div>

      {/* Full-Res Lightbox Modal */}
      {isPreviewOpen && trimmedUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="relative bg-white rounded-2xl overflow-hidden max-w-lg w-full max-h-[85vh] p-4 flex flex-col items-center space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full border-b border-stone-100 pb-2">
              <span className="font-bold text-xs text-stone-900 truncate">
                {authorName}: Full-Resolution Portrait Preview
              </span>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="relative w-full h-96 rounded-xl overflow-hidden bg-stone-100">
              <Image
                src={trimmedUrl}
                alt={authorName}
                fill
                sizes="500px"
                unoptimized
                referrerPolicy="no-referrer"
                className="object-contain"
              />
            </div>

            <div className="flex items-center justify-between w-full text-xs text-stone-500 pt-1">
              <span>{dimensions ? `${dimensions.width} × ${dimensions.height} px` : ""}</span>
              <a
                href={trimmedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-stone-700 font-semibold hover:underline"
              >
                Open original image →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
