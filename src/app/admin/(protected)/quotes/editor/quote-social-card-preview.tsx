"use client"

import * as React from "react"

export type SocialCardTheme = "noir" | "alabaster" | "emerald" | "monochrome"
export type FontScaleOption = "auto" | "display" | "editorial" | "compact"

export interface QuoteSocialCardPreviewProps {
  content: string
  authorName: string
  categoryName: string
  sourceTitle?: string | null
  isVerified?: boolean
  tags?: string[]
  quoteId?: string
}

interface ThemeConfig {
  id: SocialCardTheme
  label: string
  accentColor: string
  previewBgClass: string
  previewBorderClass: string
  previewPillClass: string
  previewBrandClass: string
  previewQuoteMarkClass: string
  previewQuoteTextClass: string
  previewAuthorClass: string
  previewCitationClass: string
  previewVerifiedClass: string
  previewWatermarkClass: string
  previewDividerClass: string
  canvas: {
    bgSolid: string
    gradStart: string
    gradEnd: string
    categoryPillBg: string
    categoryPillBorder: string
    categoryPillText: string
    brandText: string
    brandDot: string
    quoteMark: string
    quoteText: string
    authorText: string
    sourceText: string
    verifiedBg: string
    verifiedBorder: string
    verifiedText: string
    watermarkText: string
    dividerColor: string
  }
}

const THEMES: Record<SocialCardTheme, ThemeConfig> = {
  noir: {
    id: "noir",
    label: "Noir Obsidian",
    accentColor: "#c76b3e",
    previewBgClass: "bg-[#161311] [background-image:radial-gradient(circle_at_15%_15%,#2c211b_0%,#161311_75%)] text-[#f5efe6]",
    previewBorderClass: "border-stone-800",
    previewPillClass: "bg-[#c76b3e]/20 border border-[#c76b3e]/40 text-[#f4c78b]",
    previewBrandClass: "text-[#f5efe6]",
    previewQuoteMarkClass: "text-[#c76b3e]",
    previewQuoteTextClass: "text-[#fcfbf9]",
    previewAuthorClass: "text-[#e9c46a]",
    previewCitationClass: "text-[#a8a29e]",
    previewVerifiedClass: "bg-emerald-500/15 border border-emerald-500/35 text-emerald-300",
    previewWatermarkClass: "text-stone-400/60",
    previewDividerClass: "border-stone-800/80",
    canvas: {
      bgSolid: "#161311",
      gradStart: "#2c211b",
      gradEnd: "#161311",
      categoryPillBg: "rgba(199, 107, 62, 0.22)",
      categoryPillBorder: "rgba(199, 107, 62, 0.45)",
      categoryPillText: "#f4c78b",
      brandText: "#f5efe6",
      brandDot: "#c76b3e",
      quoteMark: "#c76b3e",
      quoteText: "#fcfbf9",
      authorText: "#e9c46a",
      sourceText: "#a8a29e",
      verifiedBg: "rgba(52, 211, 153, 0.15)",
      verifiedBorder: "rgba(52, 211, 153, 0.35)",
      verifiedText: "#34d399",
      watermarkText: "rgba(245, 239, 230, 0.5)",
      dividerColor: "rgba(245, 239, 230, 0.12)",
    },
  },
  alabaster: {
    id: "alabaster",
    label: "Warm Alabaster",
    accentColor: "#b45309",
    previewBgClass: "bg-[#faf7f2] [background-image:radial-gradient(circle_at_20%_20%,#fffdfa_0%,#ede6da_85%)] text-stone-900",
    previewBorderClass: "border-stone-300",
    previewPillClass: "bg-amber-900/10 border border-amber-900/25 text-amber-950 font-semibold",
    previewBrandClass: "text-stone-900",
    previewQuoteMarkClass: "text-amber-700",
    previewQuoteTextClass: "text-stone-900",
    previewAuthorClass: "text-amber-900 font-bold",
    previewCitationClass: "text-stone-600",
    previewVerifiedClass: "bg-emerald-600/10 border border-emerald-600/30 text-emerald-800",
    previewWatermarkClass: "text-stone-600/70",
    previewDividerClass: "border-stone-300/80",
    canvas: {
      bgSolid: "#faf7f2",
      gradStart: "#fffdfa",
      gradEnd: "#ede6da",
      categoryPillBg: "rgba(180, 83, 9, 0.12)",
      categoryPillBorder: "rgba(180, 83, 9, 0.3)",
      categoryPillText: "#78350f",
      brandText: "#1c1917",
      brandDot: "#c2410c",
      quoteMark: "#c2410c",
      quoteText: "#1c1917",
      authorText: "#78350f",
      sourceText: "#78716c",
      verifiedBg: "rgba(5, 150, 105, 0.12)",
      verifiedBorder: "rgba(5, 150, 105, 0.35)",
      verifiedText: "#047857",
      watermarkText: "rgba(41, 37, 36, 0.5)",
      dividerColor: "rgba(41, 37, 36, 0.15)",
    },
  },
  emerald: {
    id: "emerald",
    label: "Literary Emerald",
    accentColor: "#10b981",
    previewBgClass: "bg-[#0c1a17] [background-image:radial-gradient(circle_at_15%_15%,#143329_0%,#0c1a17_80%)] text-emerald-50",
    previewBorderClass: "border-emerald-950",
    previewPillClass: "bg-emerald-500/15 border border-emerald-500/35 text-emerald-200",
    previewBrandClass: "text-emerald-50",
    previewQuoteMarkClass: "text-emerald-400",
    previewQuoteTextClass: "text-[#f8fafc]",
    previewAuthorClass: "text-amber-300 font-bold",
    previewCitationClass: "text-emerald-300/80",
    previewVerifiedClass: "bg-emerald-400/15 border border-emerald-400/35 text-emerald-200",
    previewWatermarkClass: "text-emerald-300/60",
    previewDividerClass: "border-emerald-900/60",
    canvas: {
      bgSolid: "#0c1a17",
      gradStart: "#143329",
      gradEnd: "#0c1a17",
      categoryPillBg: "rgba(52, 211, 153, 0.15)",
      categoryPillBorder: "rgba(52, 211, 153, 0.35)",
      categoryPillText: "#a7f3d0",
      brandText: "#f0fdf4",
      brandDot: "#34d399",
      quoteMark: "#34d399",
      quoteText: "#f8fafc",
      authorText: "#fcd34d",
      sourceText: "#94a3b8",
      verifiedBg: "rgba(52, 211, 153, 0.15)",
      verifiedBorder: "rgba(52, 211, 153, 0.35)",
      verifiedText: "#34d399",
      watermarkText: "rgba(240, 253, 244, 0.5)",
      dividerColor: "rgba(240, 253, 244, 0.15)",
    },
  },
  monochrome: {
    id: "monochrome",
    label: "Monochrome Noir",
    accentColor: "#a1a1aa",
    previewBgClass: "bg-[#09090b] [background-image:radial-gradient(circle_at_20%_20%,#18181b_0%,#09090b_85%)] text-zinc-100",
    previewBorderClass: "border-zinc-800",
    previewPillClass: "bg-white/10 border border-white/20 text-white font-medium",
    previewBrandClass: "text-white",
    previewQuoteMarkClass: "text-zinc-400",
    previewQuoteTextClass: "text-zinc-50",
    previewAuthorClass: "text-white font-bold",
    previewCitationClass: "text-zinc-400",
    previewVerifiedClass: "bg-zinc-800 border border-zinc-700 text-zinc-300",
    previewWatermarkClass: "text-zinc-500",
    previewDividerClass: "border-zinc-800",
    canvas: {
      bgSolid: "#09090b",
      gradStart: "#1c1917",
      gradEnd: "#09090b",
      categoryPillBg: "rgba(255, 255, 255, 0.08)",
      categoryPillBorder: "rgba(255, 255, 255, 0.25)",
      categoryPillText: "#ffffff",
      brandText: "#ffffff",
      brandDot: "#a1a1aa",
      quoteMark: "#d4d4d8",
      quoteText: "#fafafa",
      authorText: "#ffffff",
      sourceText: "#a1a1aa",
      verifiedBg: "rgba(255, 255, 255, 0.08)",
      verifiedBorder: "rgba(255, 255, 255, 0.25)",
      verifiedText: "#f4f4f5",
      watermarkText: "rgba(255, 255, 255, 0.45)",
      dividerColor: "rgba(255, 255, 255, 0.12)",
    },
  },
}

function resolveFontSize(textLength: number, scale: FontScaleOption): number {
  if (scale === "display") return 44
  if (scale === "editorial") return 34
  if (scale === "compact") return 26

  // Auto mode matching server og-image generator
  if (textLength <= 90) return 42
  if (textLength <= 180) return 34
  if (textLength <= 280) return 28
  return 24
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, r)
  } else {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let currentLine = ""

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const width = ctx.measureText(testLine).width
    if (width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) {
    lines.push(currentLine)
  }
  return lines
}

function renderCardToCanvas(
  theme: ThemeConfig,
  content: string,
  authorName: string,
  categoryName: string,
  sourceTitle: string | null | undefined,
  isVerified: boolean,
  fontScale: FontScaleOption,
  tags: string[] = []
): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = 1200
  canvas.height = 630
  const ctx = canvas.getContext("2d")
  if (!ctx) return canvas

  const cleanContent = content.trim() || "A great mind once shared words that continue to echo across generations..."
  const fontSize = resolveFontSize(cleanContent.length, fontScale)
  const lineHeight = Math.round(fontSize * 1.38)
  const paddingX = 72
  const maxContentWidth = 1200 - paddingX * 2

  // 1. Background Fill & Gradient
  const grad = ctx.createRadialGradient(180, 94, 0, 180, 94, 950)
  grad.addColorStop(0, theme.canvas.gradStart)
  grad.addColorStop(1, theme.canvas.gradEnd)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 1200, 630)

  // 2. Top Header - Category Pill
  const categoryText = (categoryName || "PHILOSOPHY").toUpperCase()
  ctx.font = "bold 15px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  const catMetrics = ctx.measureText(categoryText)
  const pillW = catMetrics.width + 40
  const pillH = 34
  const pillX = paddingX
  const pillY = 56

  ctx.fillStyle = theme.canvas.categoryPillBg
  drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 17)
  ctx.fill()

  ctx.strokeStyle = theme.canvas.categoryPillBorder
  ctx.lineWidth = 1.5
  drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 17)
  ctx.stroke()

  ctx.fillStyle = theme.canvas.categoryPillText
  ctx.fillText(categoryText, pillX + 20, pillY + 22)

  // Top Header - Tags
  if (tags && tags.length > 0) {
    const tagString = tags.slice(0, 3).map((t) => `#${t}`).join(" ")
    ctx.font = "italic 14px Georgia, serif"
    ctx.fillStyle = theme.canvas.sourceText
    ctx.fillText(tagString, pillX + pillW + 16, pillY + 22)
  }

  // Top Header - Quotzen Brand
  const brandX = 1200 - paddingX
  ctx.font = "800 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  ctx.textAlign = "right"
  ctx.fillStyle = theme.canvas.brandText
  ctx.fillText("QUOTZEN", brandX - 16, pillY + 24)

  ctx.fillStyle = theme.canvas.brandDot
  ctx.font = "900 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  ctx.fillText("•", brandX, pillY + 24)
  ctx.textAlign = "left"

  // 3. Center Quotation
  ctx.font = "italic 68px Georgia, serif"
  ctx.fillStyle = theme.canvas.quoteMark
  const quoteMarkY = 160
  ctx.fillText("“", paddingX, quoteMarkY)

  // Text Lines Wrapping
  ctx.font = `italic ${fontSize}px Georgia, serif`
  ctx.fillStyle = theme.canvas.quoteText
  const lines = wrapText(ctx, cleanContent, maxContentWidth)
  const textBlockHeight = lines.length * lineHeight

  // Vertically position quote inside available area (approx y: 190 to 480)
  const availableMidpoint = 330
  const quoteStartY = Math.max(200, Math.floor(availableMidpoint - textBlockHeight / 2 + fontSize / 2))

  for (let i = 0; i < lines.length; i++) {
    // Prevent overflow below bottom boundary
    if (quoteStartY + i * lineHeight > 480) {
      if (i > 0) {
        ctx.fillText("…", paddingX, quoteStartY + i * lineHeight)
      }
      break
    }
    ctx.fillText(lines[i], paddingX, quoteStartY + i * lineHeight)
  }

  // 4. Footer Divider
  const footerDividerY = 520
  ctx.strokeStyle = theme.canvas.dividerColor
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(paddingX, footerDividerY)
  ctx.lineTo(1200 - paddingX, footerDividerY)
  ctx.stroke()

  // 5. Footer Left - Author & Source
  ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  ctx.fillStyle = theme.canvas.authorText
  const authorString = `— ${authorName || "Unknown"}`
  ctx.fillText(authorString, paddingX, 560)

  if (sourceTitle) {
    ctx.font = "italic 16px Georgia, serif"
    ctx.fillStyle = theme.canvas.sourceText
    ctx.fillText(sourceTitle, paddingX, 588)
  }

  // 6. Footer Right - Verified Badge & Domain
  if (isVerified) {
    const verifiedText = "✓ Verified Citation"
    ctx.font = "600 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    const verifiedMetrics = ctx.measureText(verifiedText)
    const vPillW = verifiedMetrics.width + 28
    const vPillH = 30
    const vPillX = 1200 - paddingX - 140 - vPillW
    const vPillY = 545

    ctx.fillStyle = theme.canvas.verifiedBg
    drawRoundedRect(ctx, vPillX, vPillY, vPillW, vPillH, 15)
    ctx.fill()

    ctx.strokeStyle = theme.canvas.verifiedBorder
    ctx.lineWidth = 1
    drawRoundedRect(ctx, vPillX, vPillY, vPillW, vPillH, 15)
    ctx.stroke()

    ctx.fillStyle = theme.canvas.verifiedText
    ctx.fillText(verifiedText, vPillX + 14, vPillY + 20)
  }

  ctx.font = "15px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  ctx.fillStyle = theme.canvas.watermarkText
  ctx.textAlign = "right"
  ctx.fillText("quotzen.com", 1200 - paddingX, 565)
  ctx.textAlign = "left"

  return canvas
}

export function QuoteSocialCardPreview({
  content,
  authorName,
  categoryName,
  sourceTitle,
  isVerified = false,
  tags = [],
  quoteId,
}: QuoteSocialCardPreviewProps) {
  const [selectedTheme, setSelectedTheme] = React.useState<SocialCardTheme>("noir")
  const [fontScale, setFontScale] = React.useState<FontScaleOption>("auto")
  const [isExporting, setIsExporting] = React.useState(false)
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)

  const activeTheme = THEMES[selectedTheme]
  const cleanContent = content.trim() || "The mind is everything. What you think you become."
  const effectiveFontSize = resolveFontSize(cleanContent.length, fontScale)

  function showToast(msg: string) {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 3200)
  }

  async function handleDownloadPng() {
    setIsExporting(true)
    try {
      const canvas = renderCardToCanvas(
        activeTheme,
        content,
        authorName,
        categoryName,
        sourceTitle,
        isVerified,
        fontScale,
        tags
      )

      canvas.toBlob((blob) => {
        if (!blob) {
          showToast("Failed to generate image blob")
          return
        }
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        const slugAuthor = (authorName || "quote").toLowerCase().replace(/[^a-z0-9]+/g, "-")
        a.href = url
        a.download = `quotzen-${slugAuthor}-social-1200x630.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        showToast("✓ 1200×630 PNG downloaded successfully!")
      }, "image/png")
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Error generating image")
    } finally {
      setIsExporting(false)
    }
  }

  async function handleCopyImage() {
    setIsExporting(true)
    try {
      const canvas = renderCardToCanvas(
        activeTheme,
        content,
        authorName,
        categoryName,
        sourceTitle,
        isVerified,
        fontScale,
        tags
      )

      canvas.toBlob(async (blob) => {
        if (!blob) {
          showToast("Failed to render card")
          return
        }
        if (typeof ClipboardItem !== "undefined" && navigator.clipboard && navigator.clipboard.write) {
          try {
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
            showToast("✓ High-res card copied to clipboard! Ready to paste.")
            return
          } catch {
            // Fallback to file download if clipboard permission was denied
          }
        }
        // Fallback
        handleDownloadPng()
      }, "image/png")
    } catch {
      handleDownloadPng()
    } finally {
      setIsExporting(false)
    }
  }

  function handleCopyCitationText() {
    const citation = `“${cleanContent}” — ${authorName}${sourceTitle ? ` (${sourceTitle})` : ""} #Quotzen`
    navigator.clipboard.writeText(citation).then(() => {
      showToast("✓ Quote text citation copied to clipboard!")
    })
  }

  return (
    <div className="space-y-4">
      {/* Control Bar: Themes, Font Scale, Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-stone-50/90 rounded-xl p-3 border border-stone-200/80">
        {/* Left: Theme Switcher */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mr-1">
            Theme:
          </span>
          {(Object.keys(THEMES) as SocialCardTheme[]).map((themeKey) => {
            const theme = THEMES[themeKey]
            const isSelected = selectedTheme === themeKey
            return (
              <button
                key={themeKey}
                type="button"
                onClick={() => setSelectedTheme(themeKey)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  isSelected
                    ? "bg-white text-stone-900 shadow-2xs font-semibold border border-stone-300"
                    : "text-stone-600 hover:text-stone-900 border border-transparent"
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                  style={{ backgroundColor: theme.accentColor }}
                />
                <span>{theme.label}</span>
              </button>
            )
          })}
        </div>

        {/* Right: Scale & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Font scale selector */}
          <div className="inline-flex items-center rounded-lg bg-stone-200/70 p-0.5 text-xs">
            <span className="text-[10px] font-semibold text-stone-500 px-1.5 uppercase">Size:</span>
            {(["auto", "display", "editorial", "compact"] as FontScaleOption[]).map((scale) => (
              <button
                key={scale}
                type="button"
                onClick={() => setFontScale(scale)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer capitalize ${
                  fontScale === scale ? "bg-white text-stone-900 shadow-2xs font-semibold" : "text-stone-600"
                }`}
              >
                {scale}
              </button>
            ))}
          </div>

          {/* Action: Copy Image */}
          <button
            type="button"
            onClick={handleCopyImage}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-stone-300 text-stone-800 hover:bg-stone-50 text-xs font-medium shadow-2xs transition cursor-pointer disabled:opacity-50"
            title="Copy 1200×630 PNG directly to clipboard"
          >
            <svg className="w-3.5 h-3.5 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>Copy Card</span>
          </button>

          {/* Action: Download PNG */}
          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 text-white hover:bg-stone-800 text-xs font-medium shadow-2xs transition cursor-pointer disabled:opacity-50"
            title="Download full-resolution 1200×630 PNG card"
          >
            <svg className="w-3.5 h-3.5 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Download PNG</span>
          </button>
        </div>
      </div>

      {/* Floating Feedback Notification */}
      {toastMessage && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-900 shadow-2xs animate-in fade-in slide-in-from-top-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Live 1200×630 Canvas Preview (Scalable Aspect Ratio 1.905:1) */}
      <div className="relative group">
        <div
          className={`relative w-full aspect-[1200/630] rounded-2xl overflow-hidden border shadow-md flex flex-col justify-between p-[4.8%] select-none transition-all duration-300 ${activeTheme.previewBgClass} ${activeTheme.previewBorderClass}`}
        >
          {/* Top Bar: Category Pill + Quotzen Brand */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-[2%]">
              <div
                className={`inline-flex items-center rounded-full px-[2%] py-[0.8%] text-[clamp(9px,1.2vw,14px)] font-bold tracking-[0.14em] uppercase transition shadow-2xs ${activeTheme.previewPillClass}`}
              >
                {categoryName || "PHILOSOPHY"}
              </div>

              {tags.length > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 opacity-65">
                  {tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-[clamp(9px,1.1vw,12px)] font-mono italic">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <span
                className={`font-black tracking-[0.15em] text-[clamp(11px,1.5vw,18px)] ${activeTheme.previewBrandClass}`}
              >
                QUOTZEN
              </span>
              <span className="text-[clamp(11px,1.5vw,18px)] font-black text-[#c76b3e]">•</span>
            </div>
          </div>

          {/* Center Quotation */}
          <div className="my-auto py-[1%] flex flex-col justify-center">
            <div
              className={`font-serif text-[clamp(28px,4.5vw,56px)] leading-none -mb-[1%] select-none ${activeTheme.previewQuoteMarkClass}`}
            >
              “
            </div>
            <p
              className={`font-serif italic leading-[1.38] tracking-[-0.01em] transition-all line-clamp-6 ${activeTheme.previewQuoteTextClass}`}
              style={{
                fontSize: `clamp(13px, ${(effectiveFontSize / 1200) * 100}vw, ${effectiveFontSize}px)`,
              }}
            >
              {cleanContent}
            </p>
          </div>

          {/* Bottom Attribution Bar */}
          <div
            className={`flex items-end justify-between w-full pt-[2%] border-t ${activeTheme.previewDividerClass}`}
          >
            <div className="flex flex-col gap-[0.2%]">
              <div
                className={`font-bold tracking-tight text-[clamp(11px,1.7vw,22px)] ${activeTheme.previewAuthorClass}`}
              >
                — {authorName || "Unknown"}
              </div>
              {sourceTitle ? (
                <div
                  className={`font-serif italic text-[clamp(9px,1.1vw,14px)] ${activeTheme.previewCitationClass}`}
                >
                  {sourceTitle}
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-[2%] shrink-0">
              {isVerified ? (
                <div
                  className={`inline-flex items-center rounded-full px-[2%] py-[0.5%] text-[clamp(8px,1vw,12px)] font-semibold transition ${activeTheme.previewVerifiedClass}`}
                >
                  ✓ Verified Citation
                </div>
              ) : null}

              <div
                className={`text-[clamp(8px,1.1vw,13px)] tracking-wider font-mono ${activeTheme.previewWatermarkClass}`}
              >
                quotzen.com
              </div>
            </div>
          </div>
        </div>

        {/* Hover Dimension Tag */}
        <div className="absolute bottom-2 right-2 bg-black/75 backdrop-blur-xs text-white/90 text-[10px] font-mono px-2 py-0.5 rounded-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          1200 × 630 px (1.91:1 standard OG card)
        </div>
      </div>

      {/* Social Media Preview Insights & Fast Citation Helpers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-stone-600">
        <div className="rounded-xl border border-stone-200/80 bg-stone-50/50 p-3 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-stone-800">
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            <span>Twitter / X Card</span>
          </div>
          <p className="text-[11px] text-stone-500">
            Matches <code className="font-mono text-stone-700">summary_large_image</code> standard. Perfectly fits timeline posts without cropping.
          </p>
        </div>

        <div className="rounded-xl border border-stone-200/80 bg-stone-50/50 p-3 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-stone-800">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>OpenGraph &amp; LinkedIn</span>
          </div>
          <p className="text-[11px] text-stone-500">
            Rendered at 1200×630px high resolution for Facebook, LinkedIn, iMessage, and Slack unfurls.
          </p>
        </div>

        <div className="rounded-xl border border-stone-200/80 bg-stone-50/50 p-3 space-y-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-stone-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Direct Fast Citation</span>
            </div>
            <p className="text-[11px] text-stone-500">
              Copy formatted quote with attribution &amp; hashtag for immediate social posting.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyCitationText}
            className="mt-1 text-[11px] text-stone-700 hover:text-stone-900 font-semibold underline underline-offset-2 text-left cursor-pointer"
          >
            Copy text citation →
          </button>
        </div>
      </div>

      {/* Live Server OG Image link if editing an existing quote */}
      {quoteId ? (
        <div className="flex items-center justify-between text-xs text-stone-500 bg-stone-50/60 rounded-lg px-3 py-1.5 border border-stone-200/60">
          <span className="font-mono text-[11px]">
            Server Dynamic OG: <span className="text-stone-800">/quotes/[slug]/opengraph-image</span>
          </span>
          <span className="text-[11px] text-emerald-700 font-medium">
            Active on published quotes
          </span>
        </div>
      ) : null}
    </div>
  )
}
