"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { BookmarkIcon } from "@/components/ui"
import { useCopyToClipboard, formatQuoteCopyText } from "@/hooks"
import { useSavedQuotes } from "@/lib/saved-quotes"

export type ZenTheme = "parchment" | "sand" | "obsidian" | "forest" | "twilight"
export type ZenFontSize = "sm" | "md" | "lg" | "xl"
export type ZenFontFamily = "serif" | "sans"

export interface QuoteZenModeProps {
  isOpen: boolean
  onClose: () => void
  content: string
  authorName?: string | null
  authorSlug?: string | null
  sourceTitle?: string | null
  year?: string | null
  category?: string | null
  categorySlug?: string | null
  id?: string
  slug?: string
  tags?: string[]
  quoteUrl?: string
}

const THEME_STYLES: Record<
  ZenTheme,
  {
    name: string
    bgClass: string
    textClass: string
    mutedClass: string
    accentColor: string
    panelBg: string
    panelBorder: string
    buttonClass: string
    activeButtonClass: string
    glowClass: string
  }
> = {
  parchment: {
    name: "Warm Parchment",
    bgClass: "bg-[#eddcc4]",
    textClass: "text-[#271a0e]",
    mutedClass: "text-[#6e5640]",
    accentColor: "#b8531d",
    panelBg: "bg-[#dfccb0]/85 backdrop-blur-md",
    panelBorder: "border-[#271a0e]/15",
    buttonClass: "text-[#5c4632] hover:text-[#271a0e] hover:bg-[#271a0e]/10",
    activeButtonClass: "bg-[#271a0e] text-[#eddcc4] shadow-sm font-semibold",
    glowClass: "bg-amber-600/15",
  },
  sand: {
    name: "Clean Linen",
    bgClass: "bg-[#fbfbf9]",
    textClass: "text-[#111827]",
    mutedClass: "text-[#6b7280]",
    accentColor: "#0d9488",
    panelBg: "bg-[#f0f0ee]/85 backdrop-blur-md",
    panelBorder: "border-[#111827]/10",
    buttonClass: "text-[#4b5563] hover:text-[#111827] hover:bg-[#111827]/5",
    activeButtonClass: "bg-[#111827] text-[#fbfbf9] shadow-sm font-semibold",
    glowClass: "bg-teal-500/10",
  },
  obsidian: {
    name: "Deep Obsidian",
    bgClass: "bg-[#0a0b0e]",
    textClass: "text-[#f1ede7]",
    mutedClass: "text-[#8e8a83]",
    accentColor: "#f4c78b",
    panelBg: "bg-[#16171d]/85 backdrop-blur-md",
    panelBorder: "border-white/10",
    buttonClass: "text-[#9ca3af] hover:text-[#f1ede7] hover:bg-white/5",
    activeButtonClass: "bg-white text-[#0a0b0e] shadow-sm font-semibold",
    glowClass: "bg-amber-300/10",
  },
  forest: {
    name: "Forest Moss",
    bgClass: "bg-[#0c1611]",
    textClass: "text-[#e5efe8]",
    mutedClass: "text-[#769180]",
    accentColor: "#68c491",
    panelBg: "bg-[#14231b]/85 backdrop-blur-md",
    panelBorder: "border-white/10",
    buttonClass: "text-[#8fa897] hover:text-[#e5efe8] hover:bg-white/5",
    activeButtonClass: "bg-[#68c491] text-[#0c1611] shadow-sm font-semibold",
    glowClass: "bg-emerald-400/10",
  },
  twilight: {
    name: "Midnight Twilight",
    bgClass: "bg-[#0a1122]",
    textClass: "text-[#e2e8f0]",
    mutedClass: "text-[#8595ad]",
    accentColor: "#38bdf8",
    panelBg: "bg-[#131d36]/85 backdrop-blur-md",
    panelBorder: "border-white/10",
    buttonClass: "text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-white/5",
    activeButtonClass: "bg-[#38bdf8] text-[#0a1122] shadow-sm font-semibold",
    glowClass: "bg-sky-400/10",
  },
}

const FONT_SIZE_CLASSES: Record<ZenFontSize, { quote: string; author: string }> = {
  sm: {
    quote: "text-xl sm:text-2xl md:text-3xl leading-relaxed sm:leading-relaxed",
    author: "text-base sm:text-lg",
  },
  md: {
    quote: "text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-relaxed sm:leading-relaxed",
    author: "text-lg sm:text-xl",
  },
  lg: {
    quote: "text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-relaxed sm:leading-relaxed",
    author: "text-xl sm:text-2xl",
  },
  xl: {
    quote: "text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-relaxed sm:leading-relaxed font-light",
    author: "text-2xl sm:text-3xl",
  },
}

interface BreathPhase {
  name: "inhale" | "hold-in" | "exhale" | "hold-out"
  label: string
  sublabel: string
  duration: number
  scale: number
  opacity: number
}

const BREATH_PHASES: BreathPhase[] = [
  {
    name: "inhale",
    label: "Breathe In",
    sublabel: "Draw breath slowly and deeply...",
    duration: 4,
    scale: 1.25,
    opacity: 0.95,
  },
  {
    name: "hold-in",
    label: "Hold Breath",
    sublabel: "Remain still and mindful in the pause...",
    duration: 4,
    scale: 1.25,
    opacity: 0.85,
  },
  {
    name: "exhale",
    label: "Breathe Out",
    sublabel: "Gently release all tension and sound...",
    duration: 4,
    scale: 0.82,
    opacity: 0.5,
  },
  {
    name: "hold-out",
    label: "Rest in Stillness",
    sublabel: "Rest quietly before the next breath...",
    duration: 2,
    scale: 0.82,
    opacity: 0.35,
  },
]

function emptySubscribe() {
  return () => {}
}

export function QuoteZenMode({
  isOpen,
  onClose,
  content,
  authorName,
  authorSlug,
  sourceTitle,
  year,
  category,
  categorySlug,
  id,
  slug,
  tags,
  quoteUrl,
}: QuoteZenModeProps) {
  const isMounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
  const [theme, setTheme] = React.useState<ZenTheme>("parchment")
  const [fontSize, setFontSize] = React.useState<ZenFontSize>("md")
  const [fontFamily, setFontFamily] = React.useState<ZenFontFamily>("serif")
  const [breathingGuide, setBreathingGuide] = React.useState(false)
  const [breathPhaseIndex, setBreathPhaseIndex] = React.useState(0)
  const [secondsInPhase, setSecondsInPhase] = React.useState(0)
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [controlsVisible, setControlsVisible] = React.useState(true)
  const [lockControls, setLockControls] = React.useState(false)
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0)
  const [showHelpModal, setShowHelpModal] = React.useState(false)

  const { copied, copy } = useCopyToClipboard()
  const { isSaved, toggleSave } = useSavedQuotes()

  const quoteKey = id || slug || content
  const saved = isSaved(quoteKey)
  const currentTheme = THEME_STYLES[theme]
  const effectiveControlsVisible = lockControls || controlsVisible

  const currentBreathPhase = BREATH_PHASES[breathPhaseIndex]
  const breathCountdown = Math.max(1, currentBreathPhase.duration - secondsInPhase)

  function handleToggleBreathing() {
    setBreathingGuide((prev) => {
      if (!prev) {
        setBreathPhaseIndex(0)
        setSecondsInPhase(0)
      }
      return !prev
    })
  }

  // Lock body scroll while Zen Mode is open
  React.useEffect(() => {
    if (!isOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  // Contemplation time tracking (seconds elapsed)
  React.useEffect(() => {
    if (!isOpen) return
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)
    return () => {
      clearInterval(timer)
      setElapsedSeconds(0)
    }
  }, [isOpen])

  // Fullscreen state listener
  React.useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  // Auto-hide controls after 3.5s of mouse/touch inactivity (unless locked)
  React.useEffect(() => {
    if (!isOpen || lockControls) return

    let hideTimeout = setTimeout(() => {
      setControlsVisible(false)
    }, 3500)

    function resetActivityTimer() {
      setControlsVisible(true)
      clearTimeout(hideTimeout)
      hideTimeout = setTimeout(() => {
        setControlsVisible(false)
      }, 3500)
    }

    window.addEventListener("mousemove", resetActivityTimer)
    window.addEventListener("touchstart", resetActivityTimer)
    window.addEventListener("keydown", resetActivityTimer)

    return () => {
      clearTimeout(hideTimeout)
      window.removeEventListener("mousemove", resetActivityTimer)
      window.removeEventListener("touchstart", resetActivityTimer)
      window.removeEventListener("keydown", resetActivityTimer)
    }
  }, [isOpen, lockControls])

  // Breathing guide cyclical progression synchronized per second
  React.useEffect(() => {
    if (!isOpen || !breathingGuide) return

    const timer = setInterval(() => {
      setSecondsInPhase((prevSec) => {
        const currentDuration = BREATH_PHASES[breathPhaseIndex].duration
        if (prevSec + 1 >= currentDuration) {
          setBreathPhaseIndex((currIdx) => (currIdx + 1) % BREATH_PHASES.length)
          return 0
        }
        return prevSec + 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen, breathingGuide, breathPhaseIndex])

  // Toggle fullscreen
  const toggleFullscreen = React.useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch {
      // Fullscreen not permitted or cancelled by user
    }
  }, [])

  // Cycle themes
  const cycleTheme = React.useCallback(() => {
    const order: ZenTheme[] = ["parchment", "sand", "obsidian", "forest", "twilight"]
    setTheme((prev) => {
      const idx = order.indexOf(prev)
      return order[(idx + 1) % order.length]
    })
  }, [])

  // Font scale helpers
  const increaseFontSize = React.useCallback(() => {
    setFontSize((prev) => {
      if (prev === "sm") return "md"
      if (prev === "md") return "lg"
      if (prev === "lg") return "xl"
      return "xl"
    })
  }, [])

  const decreaseFontSize = React.useCallback(() => {
    setFontSize((prev) => {
      if (prev === "xl") return "lg"
      if (prev === "lg") return "md"
      if (prev === "md") return "sm"
      return "sm"
    })
  }, [])

  // Keyboard shortcut listener
  React.useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger if user is interacting with an input
      const target = e.target as HTMLElement | null
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return

      if (e.key === "Escape") {
        e.preventDefault()
        if (showHelpModal) {
          setShowHelpModal(false)
        } else {
          onClose()
        }
      } else if (e.key.toLowerCase() === "f") {
        e.preventDefault()
        toggleFullscreen()
      } else if (e.key.toLowerCase() === "b") {
        e.preventDefault()
        handleToggleBreathing()
      } else if (e.key.toLowerCase() === "t") {
        e.preventDefault()
        cycleTheme()
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault()
        setFontFamily((prev) => (prev === "serif" ? "sans" : "serif"))
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault()
        increaseFontSize()
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault()
        decreaseFontSize()
      } else if (e.key.toLowerCase() === "c") {
        e.preventDefault()
        const text = formatQuoteCopyText({
          content,
          authorName,
          sourceTitle,
        })
        copy(text)
      } else if (e.key === "?" || e.key.toLowerCase() === "h") {
        e.preventDefault()
        setShowHelpModal((prev) => !prev)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    isOpen,
    showHelpModal,
    onClose,
    toggleFullscreen,
    cycleTheme,
    increaseFontSize,
    decreaseFontSize,
    content,
    authorName,
    sourceTitle,
    copy,
  ])

  function handleCopy() {
    const text = formatQuoteCopyText({
      content,
      authorName,
      sourceTitle,
    })
    copy(text)
  }

  function handleToggleBookmark() {
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

  async function handleShare() {
    const url = quoteUrl || (typeof window !== "undefined" ? window.location.href : "")
    const shareText = `“${content}” — ${authorName || "Quotzen"}`

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Quote by ${authorName || "Quotzen"}`,
          text: shareText,
          url,
        })
        return
      } catch {
        // Fallback
      }
    }

    handleCopy()
  }

  // Format contemplation time
  const minutes = Math.floor(elapsedSeconds / 60)
  const seconds = elapsedSeconds % 60
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`

  if (!isOpen || !isMounted) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Distraction-Free Zen Contemplation Mode"
      className={`fixed inset-0 z-[9999] flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden transition-colors duration-700 ${currentTheme.bgClass} ${currentTheme.textClass}`}
    >
      {/* Ambient Radial Soft Glow */}
      <div
        className={`pointer-events-none absolute -inset-24 rounded-full blur-3xl opacity-70 transition-all duration-1000 ${currentTheme.glowClass}`}
        aria-hidden="true"
      />

      {/* Top Floating Control Bar */}
      <header
        className={`relative z-10 flex items-center justify-between gap-4 transition-opacity duration-500 ${
          effectiveControlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Left: Brand & Reflection Timer */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-mono border ${currentTheme.panelBg} ${currentTheme.panelBorder} ${currentTheme.mutedClass}`}
          >
            <span
              className="inline-block h-2 w-2 rounded-full animate-ping"
              style={{ backgroundColor: currentTheme.accentColor }}
            />
            <span>Contemplating</span>
            <span className={`font-semibold ${currentTheme.textClass}`}>{formattedTime}</span>
          </div>

          {category && (
            <span
              className={`hidden md:inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border ${currentTheme.panelBg} ${currentTheme.panelBorder} ${currentTheme.mutedClass}`}
            >
              Theme: {category}
            </span>
          )}
        </div>

        {/* Center: Theme Selector Pills */}
        <div
          className={`hidden sm:flex items-center gap-1 p-1 rounded-full border shadow-2xs ${currentTheme.panelBg} ${currentTheme.panelBorder}`}
        >
          {(Object.keys(THEME_STYLES) as ZenTheme[]).map((tKey) => {
            const isSelected = theme === tKey
            return (
              <button
                key={tKey}
                type="button"
                onClick={() => setTheme(tKey)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all cursor-pointer ${
                  isSelected ? currentTheme.activeButtonClass : currentTheme.buttonClass
                }`}
                title={`Switch to ${THEME_STYLES[tKey].name}`}
              >
                {THEME_STYLES[tKey].name}
              </button>
            )
          })}
        </div>

        {/* Right: Ambient Controls & Close */}
        <div className="flex items-center gap-2">
          {/* Breathing Guide Toggle */}
          <button
            type="button"
            onClick={handleToggleBreathing}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-all cursor-pointer ${
              breathingGuide
                ? currentTheme.activeButtonClass
                : `${currentTheme.panelBg} ${currentTheme.panelBorder} ${currentTheme.buttonClass}`
            }`}
            title="Toggle Mindful Breathing Guide (Shortcut: B)"
            aria-label="Toggle Mindful Breathing Guide"
          >
            <span
              className={`h-2 w-2 rounded-full transition-transform ${
                breathingGuide ? "bg-amber-400 scale-125 animate-pulse" : "bg-current opacity-40"
              }`}
            />
            <span className="hidden sm:inline">{breathingGuide ? "Breath On" : "Breath"}</span>
            <kbd className="hidden md:inline rounded bg-black/10 px-1 py-0.2 text-[9px] font-mono">
              B
            </kbd>
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`rounded-full p-2 border transition-all cursor-pointer ${currentTheme.panelBg} ${currentTheme.panelBorder} ${currentTheme.buttonClass}`}
            title={isFullscreen ? "Exit Fullscreen (F)" : "Enter Fullscreen (F)"}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            )}
          </button>

          {/* Keyboard Shortcuts Help */}
          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className={`hidden sm:inline-flex rounded-full p-2 border transition-all cursor-pointer ${currentTheme.panelBg} ${currentTheme.panelBorder} ${currentTheme.buttonClass}`}
            title="Keyboard Shortcuts (?)"
            aria-label="Keyboard Shortcuts"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>

          {/* Close / Exit Button */}
          <button
            type="button"
            onClick={onClose}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider border transition-all cursor-pointer ${currentTheme.panelBg} ${currentTheme.panelBorder} ${currentTheme.buttonClass}`}
            aria-label="Exit Zen Focus Mode"
          >
            <span>Exit</span>
            <kbd className="hidden sm:inline rounded bg-black/10 px-1 py-0.5 text-[10px] font-mono">
              ESC
            </kbd>
          </button>
        </div>
      </header>

      {/* Main Contemplation Sanctuary Canvas */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full text-center px-4 py-6 overflow-y-auto min-h-0">
        {/* Subtle Decorative Opening Glyph */}
        <div
          className="text-4xl sm:text-5xl opacity-40 select-none mb-3 font-serif"
          style={{ color: currentTheme.accentColor }}
          aria-hidden="true"
        >
          &ldquo;
        </div>

        {/* Master Quotation Text */}
        <blockquote
          className={`font-normal transition-all duration-300 ${
            fontFamily === "serif" ? "font-serif" : "font-sans"
          } ${FONT_SIZE_CLASSES[fontSize].quote}`}
        >
          {content}
        </blockquote>

        {/* Attribution & Provenance */}
        <div className="mt-6 sm:mt-8 space-y-1.5">
          <p
            className={`font-medium transition-all ${
              fontFamily === "serif" ? "font-serif" : "font-sans"
            } ${FONT_SIZE_CLASSES[fontSize].author}`}
            style={{ color: currentTheme.accentColor }}
          >
            — {authorName || "Anonymous"}
          </p>

          {(sourceTitle || year) && (
            <p className={`text-xs sm:text-sm font-light ${currentTheme.mutedClass}`}>
              {sourceTitle}
              {year ? ` (${year})` : ""}
            </p>
          )}
        </div>

        {/* Synchronized Mindful Breathing Guide Widget */}
        {breathingGuide && (
          <div className="mt-8 sm:mt-10 flex flex-col items-center justify-center space-y-3 animate-rise select-none">
            {/* Dynamic Breathing Halo and Orb */}
            <div className="relative flex items-center justify-center h-28 w-28 sm:h-32 sm:w-32">
              {/* Outer Radiant Soft Glow */}
              <div
                className="absolute inset-0 rounded-full blur-xl transition-all"
                style={{
                  backgroundColor: currentTheme.accentColor,
                  opacity: currentBreathPhase.scale > 1 ? 0.35 : 0.12,
                  transform: `scale(${currentBreathPhase.scale * 1.2})`,
                  transitionDuration: `${currentBreathPhase.duration * 1000}ms`,
                  transitionTimingFunction:
                    currentBreathPhase.name === "inhale"
                      ? "cubic-bezier(0.2, 0.9, 0.3, 1)"
                      : "cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              />

              {/* Dynamic Scaling Breath Ring */}
              <div
                className="relative flex items-center justify-center rounded-full border-2 transition-all shadow-md"
                style={{
                  width: "5.5rem",
                  height: "5.5rem",
                  borderColor: currentTheme.accentColor,
                  backgroundColor: `${currentTheme.accentColor}18`,
                  transform: `scale(${currentBreathPhase.scale})`,
                  opacity: currentBreathPhase.opacity,
                  transitionDuration: `${currentBreathPhase.duration * 1000}ms`,
                  transitionTimingFunction:
                    currentBreathPhase.name === "inhale"
                      ? "cubic-bezier(0.2, 0.9, 0.3, 1)"
                      : "cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                {/* Central Countdown Number */}
                <div className="flex flex-col items-center justify-center">
                  <span
                    className="font-mono text-2xl font-light leading-none"
                    style={{ color: currentTheme.accentColor }}
                  >
                    {breathCountdown}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider opacity-60 font-mono mt-0.5">
                    sec
                  </span>
                </div>
              </div>
            </div>

            {/* Instruction and Guidance Text */}
            <div className="text-center space-y-0.5">
              <p
                className="text-base sm:text-lg font-serif font-medium tracking-wide transition-colors"
                style={{ color: currentTheme.accentColor }}
              >
                {currentBreathPhase.label}
              </p>
              <p className={`text-xs italic font-serif ${currentTheme.mutedClass}`}>
                {currentBreathPhase.sublabel}
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Floating Utility Dock */}
      <footer
        className={`relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 transition-opacity duration-500 ${
          effectiveControlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Left: Typography Sizing & Font Style */}
        <div
          className={`flex items-center gap-2 p-1.5 rounded-full border shadow-2xs ${currentTheme.panelBg} ${currentTheme.panelBorder}`}
        >
          <span className={`text-[11px] font-mono px-2 ${currentTheme.mutedClass}`}>Type:</span>

          {/* Decrease font */}
          <button
            type="button"
            onClick={decreaseFontSize}
            className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition cursor-pointer ${currentTheme.buttonClass}`}
            title="Decrease Font Size (-)"
            aria-label="Decrease font size"
          >
            A-
          </button>

          {/* Increase font */}
          <button
            type="button"
            onClick={increaseFontSize}
            className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition cursor-pointer ${currentTheme.buttonClass}`}
            title="Increase Font Size (+)"
            aria-label="Increase font size"
          >
            A+
          </button>

          <div className="h-4 w-px bg-current opacity-15 mx-0.5" />

          {/* Serif vs Sans Toggle */}
          <button
            type="button"
            onClick={() => setFontFamily((prev) => (prev === "serif" ? "sans" : "serif"))}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
              fontFamily === "serif" ? currentTheme.activeButtonClass : currentTheme.buttonClass
            }`}
            title="Toggle Serif / Sans Font (S)"
          >
            {fontFamily === "serif" ? "Serif" : "Sans"}
          </button>

          <div className="h-4 w-px bg-current opacity-15 mx-0.5" />

          {/* Quick Breath Mode Toggle in Dock */}
          <button
            type="button"
            onClick={handleToggleBreathing}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              breathingGuide ? currentTheme.activeButtonClass : currentTheme.buttonClass
            }`}
            title="Toggle Mindful Breathing Guide (B)"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                breathingGuide ? "bg-amber-400 animate-pulse" : "bg-current opacity-40"
              }`}
            />
            <span>Breathe</span>
          </button>
        </div>

        {/* Center: Quiet Solitude Hint */}
        <div className={`hidden lg:block text-[11px] tracking-wide text-center font-sans ${currentTheme.mutedClass}`}>
          {lockControls ? (
            <span>Controls pinned · Click padlock to auto-hide</span>
          ) : (
            <span>Still your cursor for pure solitude · Press ESC to exit</span>
          )}
        </div>

        {/* Right: Quick Actions (Copy, Bookmark, Share, Pin) */}
        <div
          className={`flex items-center gap-1.5 p-1.5 rounded-full border shadow-2xs ${currentTheme.panelBg} ${currentTheme.panelBorder}`}
        >
          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
              copied ? "bg-emerald-600 text-white font-semibold" : currentTheme.buttonClass
            }`}
            title="Copy Quote (C)"
            aria-label="Copy quote text"
          >
            {copied ? (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Copied</span>
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </button>

          {/* Bookmark Button */}
          <button
            type="button"
            onClick={handleToggleBookmark}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
              saved ? "bg-amber-600 text-white font-semibold" : currentTheme.buttonClass
            }`}
            title={saved ? "Saved in notebook" : "Save to notebook"}
            aria-label="Bookmark quote"
          >
            <BookmarkIcon filled={saved} className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{saved ? "Saved" : "Save"}</span>
          </button>

          {/* Share Button */}
          <button
            type="button"
            onClick={handleShare}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition cursor-pointer ${currentTheme.buttonClass}`}
            title="Share quote"
            aria-label="Share quote"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* Pin / Lock Controls Toggle */}
          <button
            type="button"
            onClick={() => setLockControls((prev) => !prev)}
            className={`rounded-full p-1.5 transition cursor-pointer ${
              lockControls ? currentTheme.activeButtonClass : currentTheme.buttonClass
            }`}
            title={lockControls ? "Unlock controls (auto-hide after 3.5s)" : "Lock controls visible"}
            aria-label="Toggle control pinning"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {lockControls ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                />
              )}
            </svg>
          </button>
        </div>
      </footer>

      {/* Keyboard Shortcuts Dialog Modal */}
      {showHelpModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-rise"
        >
          <div
            className={`relative max-w-sm w-full rounded-2xl p-6 border shadow-2xl ${currentTheme.panelBg} ${currentTheme.panelBorder} ${currentTheme.textClass}`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-current/10">
              <h4 className="font-serif text-lg font-bold">Zen Mode Shortcuts</h4>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="rounded-full p-1 hover:bg-black/10 transition"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className={currentTheme.mutedClass}>Exit Zen Mode</span>
                <kbd className="rounded bg-black/15 px-2 py-0.5 font-bold">ESC</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className={currentTheme.mutedClass}>Toggle Fullscreen</span>
                <kbd className="rounded bg-black/15 px-2 py-0.5 font-bold">F</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className={currentTheme.mutedClass}>Mindful Breathing</span>
                <kbd className="rounded bg-black/15 px-2 py-0.5 font-bold">B</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className={currentTheme.mutedClass}>Cycle Color Theme</span>
                <kbd className="rounded bg-black/15 px-2 py-0.5 font-bold">T</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className={currentTheme.mutedClass}>Toggle Serif / Sans</span>
                <kbd className="rounded bg-black/15 px-2 py-0.5 font-bold">S</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className={currentTheme.mutedClass}>Increase / Decrease Font</span>
                <kbd className="rounded bg-black/15 px-2 py-0.5 font-bold">+ / -</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className={currentTheme.mutedClass}>Copy Quote Text</span>
                <kbd className="rounded bg-black/15 px-2 py-0.5 font-bold">C</kbd>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-current/10 text-center">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className={`w-full rounded-xl py-2 text-xs font-semibold uppercase tracking-wider transition ${currentTheme.activeButtonClass}`}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  )
}
