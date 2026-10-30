"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookmarkIcon } from "@/components/ui";
import { SavedQuotesProvider, useSavedQuotes } from "@/lib/saved-quotes";
import { useOnlineStatus, useCopyToClipboard } from "@/hooks";

interface OfflineQuote {
  quote: string;
  author: string;
  work?: string;
  theme: string;
  isUserSaved?: boolean;
}

const OFFLINE_QUOTES: OfflineQuote[] = [
  {
    quote: "You have power over your mind - not outside events. Realize this, and you will find strength.",
    author: "Marcus Aurelius",
    work: "Meditations",
    theme: "Resilience",
    isUserSaved: false,
  },
  {
    quote: "Silence is an ocean. Speech is a river. When the ocean is searching for you, don't walk into the river.",
    author: "Rumi",
    theme: "Stillness",
    isUserSaved: false,
  },
  {
    quote: "Clouds come floating into my life, no longer to carry rain or usher storm, but to add color to my sunset sky.",
    author: "Rabindranath Tagore",
    work: "Stray Birds",
    theme: "Perspective",
    isUserSaved: false,
  },
  {
    quote: "We suffer more often in imagination than in reality.",
    author: "Seneca",
    work: "Letters from a Stoic",
    theme: "Peace of Mind",
    isUserSaved: false,
  },
  {
    quote: "Nature does not hurry, yet everything is accomplished.",
    author: "Lao Tzu",
    theme: "Patience",
    isUserSaved: false,
  },
  {
    quote: "Hope is the thing with feathers that perches in the soul - and sings the tune without the words - and never stops at all.",
    author: "Emily Dickinson",
    theme: "Hope",
    isUserSaved: false,
  },
];

function OfflinePageContent() {
  const router = useRouter();
  const { savedQuotes, count: savedCount } = useSavedQuotes();
  const [filterMode, setFilterMode] = React.useState<"all" | "saved" | "classics">("all");
  const [quoteIndex, setQuoteIndex] = React.useState(0);
  const [isChecking, setIsChecking] = React.useState(false);
  const { copied, copy } = useCopyToClipboard();
  const isOnline = useOnlineStatus();

  const userQuotes: OfflineQuote[] = React.useMemo(() => {
    return savedQuotes.map((sq) => ({
      quote: sq.content,
      author: sq.authorName || "Unknown",
      work: sq.sourceTitle || undefined,
      theme: sq.category || "Personal Reflection",
      isUserSaved: true,
    }));
  }, [savedQuotes]);

  const activeQuotes: OfflineQuote[] = React.useMemo(() => {
    if (filterMode === "saved" && userQuotes.length > 0) return userQuotes;
    if (filterMode === "classics") return OFFLINE_QUOTES;
    return [...userQuotes, ...OFFLINE_QUOTES];
  }, [filterMode, userQuotes]);

  const safeIndex = quoteIndex % (activeQuotes.length || 1);
  const currentQuote = activeQuotes[safeIndex] || OFFLINE_QUOTES[0];

  function handleNextQuote() {
    setQuoteIndex((prev) => (prev + 1) % activeQuotes.length);
  }

  async function handleRetry() {
    setIsChecking(true);
    try {
      const res = await fetch("/icons/icon-192x192.png?ping=" + Date.now(), {
        method: "HEAD",
        cache: "no-store",
      });
      if (res.ok) {
        router.push("/");
        return;
      }
    } catch {
      // Still offline
    } finally {
      setTimeout(() => setIsChecking(false), 600);
    }
  }

  function handleCopy() {
    if (!currentQuote) return;
    copy(`"${currentQuote.quote}" — ${currentQuote.author}`);
  }

  return (
    <div className="min-h-screen bg-[var(--page-cream)] text-[var(--ink-900)] flex flex-col justify-between p-6 sm:p-10 font-sans selection:bg-[#c76b3e]/20 selection:text-[var(--ink-900)]">
      {/* Header bar */}
      <header className="flex items-center justify-between max-w-4xl mx-auto w-full pb-8 border-b border-stone-300/40">
        <Link
          href="/"
          className="group flex items-center gap-2.5 outline-none"
          aria-label="Quotzen Home"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--ink-900)] text-white shadow-xs">
            <span className="font-serif text-lg font-bold italic text-[var(--accent-gold)]">
              Q
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-lg font-bold tracking-tight text-[var(--ink-900)]">
              Quotzen
            </span>
            <span className="text-[10px] uppercase tracking-[0.22em] text-stone-500 -mt-1 font-sans">
              Offline Sanctuary
            </span>
          </div>
        </Link>

        {/* Connectivity status pill */}
        <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border border-stone-300/60 bg-white/70 shadow-xs">
          <span
            className={`h-2 w-2 rounded-full ${
              isOnline
                ? "bg-emerald-500 animate-pulse"
                : "bg-amber-500"
            }`}
          />
          <span className="text-stone-700">
            {isOnline ? "Back Online" : "Reading Offline"}
          </span>
        </div>
      </header>

      {/* Main Sanctuary Card */}
      <main className="max-w-2xl mx-auto w-full my-auto py-12 flex flex-col items-center text-center">
        {/* Reconnected notification banner */}
        {isOnline && (
          <div className="w-full mb-6 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-900 shadow-2xs">
            <div className="flex items-center gap-2.5 text-left">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
              <span>
                <strong className="font-semibold">Connection restored!</strong> You are back online.
              </span>
            </div>
            <button
              onClick={() => router.push("/")}
              type="button"
              className="px-3 py-1.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer ml-3 shrink-0"
            >
              Return Home
            </button>
          </div>
        )}

        {/* Editorial Subheading badge & filter */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-serif italic tracking-wide text-[var(--accent-rust)] bg-[#c76b3e]/10 border border-[#c76b3e]/20">
            <span>{currentQuote.isUserSaved ? "✦ From Your Notebook" : "✦ Timeless Reflections"}</span>
            <span>•</span>
            <span>{currentQuote.theme}</span>
          </div>

          {savedCount > 0 && (
            <div className="inline-flex items-center rounded-full border border-stone-300/60 bg-white/80 p-0.5 text-[11px] font-medium shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  setFilterMode("all");
                  setQuoteIndex(0);
                }}
                className={`px-2.5 py-0.5 rounded-full transition-colors cursor-pointer ${
                  filterMode === "all"
                    ? "bg-[var(--ink-900)] text-white"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                All ({activeQuotes.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterMode("saved");
                  setQuoteIndex(0);
                }}
                className={`px-2.5 py-0.5 rounded-full transition-colors cursor-pointer ${
                  filterMode === "saved"
                    ? "bg-[var(--ink-900)] text-white"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Notebook ({userQuotes.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterMode("classics");
                  setQuoteIndex(0);
                }}
                className={`px-2.5 py-0.5 rounded-full transition-colors cursor-pointer ${
                  filterMode === "classics"
                    ? "bg-[var(--ink-900)] text-white"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Classics ({OFFLINE_QUOTES.length})
              </button>
            </div>
          )}
        </div>

        {/* Quote presentation */}
        <div className="relative w-full rounded-2xl bg-white/60 border border-stone-200/80 p-8 sm:p-12 shadow-sm backdrop-blur-xs transition-all">
          <div className="text-[var(--accent-gold)] opacity-40 font-serif text-7xl leading-none select-none -mb-6 text-left">
            “
          </div>
          <blockquote className="font-serif text-xl sm:text-2xl text-[var(--ink-900)] leading-relaxed tracking-tight italic font-medium my-4">
            {currentQuote.quote}
          </blockquote>
          <div className="mt-6 flex flex-col items-center">
            <cite className="not-italic font-sans text-sm font-semibold tracking-wide text-stone-800 uppercase">
              {currentQuote.author}
            </cite>
            {currentQuote.work && (
              <span className="text-xs text-stone-500 font-serif italic mt-0.5">
                {currentQuote.work}
              </span>
            )}
          </div>

          {/* Action Row */}
          <div className="mt-8 pt-6 border-t border-stone-200/60 flex items-center justify-center gap-3">
            <button
              onClick={handleNextQuote}
              type="button"
              className="px-4 py-2 text-xs font-medium rounded-lg bg-[var(--ink-900)] text-white hover:bg-black transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
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
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              Another Thought ({safeIndex + 1}/{activeQuotes.length})
            </button>

            <button
              onClick={handleCopy}
              type="button"
              className="px-4 py-2 text-xs font-medium rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 transition-colors shadow-xs cursor-pointer"
            >
              {copied ? "Copied to clipboard!" : "Copy Quote"}
            </button>
          </div>
        </div>

        {/* Connection Notice & Refresh Action */}
        <div className="mt-10 flex flex-col items-center gap-4">
          <p className="text-xs text-stone-600 max-w-md leading-relaxed">
            You are browsing offline. Previously viewed quotes and your saved notebook remain fully accessible, and live discovery will resume as soon as your internet reconnects.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleRetry}
              disabled={isChecking}
              type="button"
              className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-[var(--accent-rust)] text-white hover:opacity-95 transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <svg
                className={`w-3.5 h-3.5 ${isChecking ? "animate-spin" : ""}`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 21h5v-5" />
              </svg>
              {isChecking ? "Checking Connection..." : "Check Connection & Reload"}
            </button>

            {savedCount > 0 && (
              <Link
                href="/saved"
                className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-[var(--ink-900)] text-white hover:bg-black transition-all shadow-xs flex items-center gap-1.5"
              >
                <BookmarkIcon
                  filled
                  className="h-3.5 w-3.5 text-[var(--accent-gold)] fill-current"
                />
                <span>Saved Notebook ({savedCount})</span>
              </Link>
            )}

            <Link
              href="/"
              className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-stone-300/80 bg-white/70 hover:bg-white text-stone-800 transition-all shadow-xs"
            >
              Return Home
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-stone-500 py-4 border-t border-stone-300/40">
        Quotzen PWA • Wisdom Doesn&apos;t Need Wi-Fi
      </footer>
    </div>
  );
}

export default function OfflinePage() {
  return (
    <SavedQuotesProvider>
      <OfflinePageContent />
    </SavedQuotesProvider>
  );
}
