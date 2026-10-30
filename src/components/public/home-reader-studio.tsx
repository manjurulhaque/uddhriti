"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useSavedQuotes } from "@/lib/saved-quotes"
import { useOnlineStatus } from "@/hooks"

const QuoteShareModal = dynamic(
  () => import("./quote-share-modal").then((mod) => mod.QuoteShareModal),
  { ssr: false }
)

export interface HomeReaderStudioProps {
  featuredSampleQuote?: {
    content: string
    authorName?: string | null
    sourceTitle?: string | null
    slug?: string | null
  } | null
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed"
    platform: string
  }>
  prompt(): Promise<void>
}

const DEFAULT_SAMPLE_QUOTE = {
  content: "Dwell on the beauty of life. Watch the stars, and see yourself running with them.",
  authorName: "Marcus Aurelius",
  sourceTitle: "Meditations",
}

function subscribeStandalone(callback: () => void) {
  if (typeof window === "undefined") return () => {}
  const mql = window.matchMedia("(display-mode: standalone)")
  mql.addEventListener("change", callback)
  window.addEventListener("appinstalled", callback)
  return () => {
    mql.removeEventListener("change", callback)
    window.removeEventListener("appinstalled", callback)
  }
}

function getStandaloneSnapshot(): boolean {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function getServerStandaloneSnapshot(): boolean {
  return false
}

export function HomeReaderStudio({ featuredSampleQuote }: HomeReaderStudioProps) {
  const { count: savedCount } = useSavedQuotes()
  const [modalOpen, setModalOpen] = React.useState(false)
  const [previewTheme, setPreviewTheme] = React.useState<"cream" | "dark">("cream")
  const [pwaPrompt, setPwaPrompt] = React.useState<BeforeInstallPromptEvent | null>(null)
  const [installedInSession, setInstalledInSession] = React.useState(false)

  const isStandalone = React.useSyncExternalStore(
    subscribeStandalone,
    getStandaloneSnapshot,
    getServerStandaloneSnapshot
  )
  const isInstalled = isStandalone || installedInSession
  const isOnline = useOnlineStatus()

  const sampleQuote = featuredSampleQuote || DEFAULT_SAMPLE_QUOTE

  // Listen for PWA beforeinstallprompt
  React.useEffect(() => {
    function handleBeforeInstall(e: Event) {
      e.preventDefault()
      setPwaPrompt(e as BeforeInstallPromptEvent)
    }

    function handleAppInstalled() {
      setInstalledInSession(true)
      setPwaPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  async function handleInstallClick() {
    if (pwaPrompt) {
      pwaPrompt.prompt()
      const { outcome } = await pwaPrompt.userChoice
      if (outcome === "accepted") {
        setPwaPrompt(null)
        setInstalledInSession(true)
      }
    }
  }

  return (
    <section
      id="reader-studio"
      className="scroll-mt-20 space-y-8"
      aria-label="Reader Tools and Sanctuary Studio"
    >
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-amber-900/10 pb-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-800/15 bg-amber-800/8 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-rust)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-rust)] animate-pulse" />
            <span>Reader Studio &amp; Sanctuary</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ink-900)]">
            Instruments for the Thoughtful Reader
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 font-serif leading-relaxed">
            Quotzen is designed as an unhurried, private library. Discover our built-in instruments
            crafted for private study, distraction-free offline reading, and editorial sharing.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-stone-600 bg-white/90 rounded-full px-4 py-2 border border-stone-200 shadow-2xs self-start md:self-end">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Sanctuary Tools: 100% Free &amp; Private</span>
        </div>
      </div>

      {/* 3-Pillar Interactive Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pillar 1: Personal Notebook */}
        <div className="flex flex-col justify-between rounded-[2rem] border border-amber-900/12 bg-gradient-to-b from-white via-[#faf6f0] to-[#f4ede2] p-6 sm:p-8 shadow-2xs hover:shadow-md transition-all duration-300">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-3xl" aria-hidden="true">📓</span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${
                  savedCount > 0
                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                    : "bg-stone-100 text-stone-600 border border-stone-200"
                }`}
              >
                <span>{savedCount > 0 ? "Active Notebook" : "Empty Notebook"}</span>
                <span aria-hidden="true">•</span>
                <span>{savedCount} saved</span>
              </span>
            </div>

            <div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
                Private Reader Notebook
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-stone-600 font-serif leading-relaxed">
                Bookmark memorable passages with a single tap. Saved lines stay strictly private in your
                browser with no account needed.
              </p>
            </div>

            <ul className="space-y-2 text-xs text-stone-700 font-sans border-t border-amber-900/10 pt-4">
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent-rust)] font-bold">✓</span>
                <span>
                  <strong>100% Client-Side Privacy:</strong> Your bookmarked quotes are never tracked or uploaded.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent-rust)] font-bold">✓</span>
                <span>
                  <strong>Markdown &amp; JSON Export:</strong> One-click download as clean Markdown notes or JSON data.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent-rust)] font-bold">✓</span>
                <span>
                  <strong>Instant Search:</strong> Filter your saved reflections by author, topic, or keyword.
                </span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-amber-900/10 flex items-center justify-between gap-3">
            <Link
              href="/saved"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--ink-900)] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-black hover:scale-[1.02] active:scale-[0.98] w-full"
            >
              <span>{savedCount > 0 ? `Open Notebook (${savedCount})` : "Open Blank Notebook"}</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>

        {/* Pillar 2: Editorial Card Art Studio */}
        <div className="flex flex-col justify-between rounded-[2rem] border border-amber-900/12 bg-gradient-to-b from-white via-[#faf6f0] to-[#f4ede2] p-6 sm:p-8 shadow-2xs hover:shadow-md transition-all duration-300">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-3xl" aria-hidden="true">🎨</span>
              <div role="group" aria-label="Card preview theme" className="flex items-center gap-1 rounded-xl bg-stone-100 p-1 border border-stone-200">
                <button
                  type="button"
                  aria-pressed={previewTheme === "cream"}
                  onClick={() => setPreviewTheme("cream")}
                  className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                    previewTheme === "cream"
                      ? "bg-white text-stone-900 shadow-2xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Paper
                </button>
                <button
                  type="button"
                  aria-pressed={previewTheme === "dark"}
                  onClick={() => setPreviewTheme("dark")}
                  className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                    previewTheme === "dark"
                      ? "bg-[var(--ink-900)] text-white shadow-2xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Midnight
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
                Typography Card Studio
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-stone-600 font-serif leading-relaxed">
                Generate high-resolution editorial quotation cards ready for Instagram, Twitter, reading journals, or print.
              </p>
            </div>

            {/* Interactive Live Card Mini-Preview */}
            <div
              className={`rounded-2xl p-4 transition-all duration-300 border space-y-2 shadow-inner ${
                previewTheme === "dark"
                  ? "bg-[#1f2329] border-stone-700 text-stone-100"
                  : "bg-white/95 border-amber-900/15 text-stone-900"
              }`}
            >
              <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--accent-rust)]">
                <span>✦ QUOTZEN ✦</span>
                <span className={previewTheme === "dark" ? "text-stone-400" : "text-stone-500"}>
                  1080×1080 High-Res
                </span>
              </div>
              <blockquote className="font-serif italic text-xs leading-relaxed line-clamp-2">
                &ldquo;{sampleQuote.content}&rdquo;
              </blockquote>
              <div
                className={`flex items-center justify-between text-[10px] border-t pt-1.5 ${
                  previewTheme === "dark" ? "border-stone-800 text-amber-300" : "border-stone-100 text-[var(--accent-rust)]"
                }`}
              >
                <span className="font-serif font-bold">— {sampleQuote.authorName}</span>
                <span className="text-[9px] text-stone-400">PNG / Clipboard</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-amber-900/10">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-rust)] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#b55d32] hover:scale-[1.02] active:scale-[0.98] w-full cursor-pointer"
            >
              <span>Launch Card Studio</span>
              <span aria-hidden="true">🎨</span>
            </button>
          </div>
        </div>

        {/* Pillar 3: Offline Sanctuary & PWA */}
        <div className="flex flex-col justify-between rounded-[2rem] border border-amber-900/12 bg-gradient-to-b from-white via-[#faf6f0] to-[#f4ede2] p-6 sm:p-8 shadow-2xs hover:shadow-md transition-all duration-300">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-3xl" aria-hidden="true">🕊️</span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${
                  isOnline
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                    : "bg-amber-100 text-amber-900 border border-amber-300"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                  }`}
                  aria-hidden="true"
                />
                <span>{isOnline ? "Online & Synced" : "Browsing Offline"}</span>
              </span>
            </div>

            <div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
                Offline PWA Sanctuary
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-stone-600 font-serif leading-relaxed">
                <em>&ldquo;Wisdom Doesn&apos;t Need Wi-Fi.&rdquo;</em> Pre-caches timeless passages so your contemplative reading continues on planes, subways, or retreats.
              </p>
            </div>

            <ul className="space-y-2 text-xs text-stone-700 font-sans border-t border-amber-900/10 pt-4">
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent-rust)] font-bold">✓</span>
                <span>
                  <strong>Installable App:</strong> Add Quotzen to your iPhone, Android, or desktop home screen as a standalone app.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent-rust)] font-bold">✓</span>
                <span>
                  <strong>Pre-Cached Offline Vault:</strong> Curated philosophical fragments remain fully readable without internet.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent-rust)] font-bold">✓</span>
                <span>
                  <strong>Automatic Reconnect:</strong> Seamlessly recovers and synchronizes as soon as connection returns.
                </span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-amber-900/10 flex flex-col sm:flex-row gap-2">
            {pwaPrompt && !isInstalled ? (
              <button
                type="button"
                onClick={handleInstallClick}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-black hover:scale-[1.02] active:scale-[0.98] w-full cursor-pointer"
              >
                <span>Install Quotzen App</span>
                <span aria-hidden="true">📲</span>
              </button>
            ) : null}

            <Link
              href="/offline"
              className={`inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-semibold text-stone-800 shadow-2xs transition hover:bg-stone-50 hover:border-stone-400 w-full ${
                !pwaPrompt ? "sm:w-full" : ""
              }`}
            >
              <span>Explore Offline Sanctuary</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Sanctuary Reader Quick Access Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-amber-900/15 bg-gradient-to-r from-amber-50 via-white to-amber-50/50 p-5 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-800/10 text-xl text-amber-900">
            ⌨️
          </span>
          <div className="space-y-0.5">
            <h4 className="font-serif text-sm sm:text-base font-bold text-stone-900">
              Quick Reader Shortcuts
            </h4>
            <p className="text-xs text-stone-600 font-sans">
              Press <kbd className="rounded border border-stone-300 bg-white px-1.5 py-0.5 font-mono text-[11px] font-semibold text-stone-700 shadow-2xs">⌘K</kbd> or <kbd className="rounded border border-stone-300 bg-white px-1.5 py-0.5 font-mono text-[11px] font-semibold text-stone-700 shadow-2xs">Ctrl+K</kbd> anywhere to search thinkers, topics, and lines instantly.
            </p>
          </div>
        </div>

        <Link
          href="/saved"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--ink-900)] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-black hover:scale-[1.02] active:scale-[0.98] shrink-0"
        >
          <span>Open Notebook</span>
          <span>&rarr;</span>
        </Link>
      </div>

      {/* Share Modal Trigger */}
      <QuoteShareModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        content={sampleQuote.content}
        authorName={sampleQuote.authorName}
        sourceTitle={sampleQuote.sourceTitle}
      />
    </section>
  )
}
