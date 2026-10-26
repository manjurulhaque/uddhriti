"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSavedQuotes } from "@/lib/saved-quotes";

interface OfflineQuote {
  quote: string;
  author: string;
  work?: string;
  theme: string;
}

const OFFLINE_QUOTES: OfflineQuote[] = [
  {
    quote: "You have power over your mind - not outside events. Realize this, and you will find strength.",
    author: "Marcus Aurelius",
    work: "Meditations",
    theme: "Resilience",
  },
  {
    quote: "Silence is an ocean. Speech is a river. When the ocean is searching for you, don't walk into the river.",
    author: "Rumi",
    theme: "Stillness",
  },
  {
    quote: "Clouds come floating into my life, no longer to carry rain or usher storm, but to add color to my sunset sky.",
    author: "Rabindranath Tagore",
    work: "Stray Birds",
    theme: "Perspective",
  },
  {
    quote: "We suffer more often in imagination than in reality.",
    author: "Seneca",
    work: "Letters from a Stoic",
    theme: "Peace of Mind",
  },
  {
    quote: "Nature does not hurry, yet everything is accomplished.",
    author: "Lao Tzu",
    theme: "Patience",
  },
  {
    quote: "Hope is the thing with feathers that perches in the soul - and sings the tune without the words - and never stops at all.",
    author: "Emily Dickinson",
    theme: "Hope",
  },
];

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getServerOnlineSnapshot() {
  return true;
}

export default function OfflinePage() {
  const router = useRouter();
  const { count: savedCount } = useSavedQuotes();
  const [quoteIndex, setQuoteIndex] = React.useState(0);
  const [isChecking, setIsChecking] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const isOnline = React.useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getServerOnlineSnapshot
  );

  const currentQuote = OFFLINE_QUOTES[quoteIndex];

  function handleNextQuote() {
    setQuoteIndex((prev) => (prev + 1) % OFFLINE_QUOTES.length);
    setCopied(false);
  }

  async function handleRetry() {
    setIsChecking(true);
    try {
      // Ping a lightweight endpoint with cache-busting
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

  async function handleCopy() {
    if (!currentQuote) return;
    const text = `"${currentQuote.quote}" — ${currentQuote.author}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen bg-[var(--page-cream)] text-[var(--ink-900)] flex flex-col justify-between p-6 sm:p-10 font-sans selection:bg-[#c76b3e]/20 selection:text-[var(--ink-900)]">
      {/* Header bar */}
      <header className="flex items-center justify-between max-w-4xl mx-auto w-full pb-8 border-b border-stone-300/40">
        <Link
          href="/"
          className="group flex items-center gap-2.5 outline-none"
          aria-label="Uddhriti Home"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--ink-900)] text-white shadow-xs">
            <span className="font-serif text-lg font-bold italic text-[var(--accent-gold)]">
              U
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-lg font-bold tracking-tight text-[var(--ink-900)]">
              Uddhriti
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
        {/* Editorial Subheading badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-serif italic tracking-wide text-[var(--accent-rust)] bg-[#c76b3e]/10 border border-[#c76b3e]/20 mb-6">
          <span>✦ Timeless Reflections</span>
          <span>•</span>
          <span>{currentQuote.theme}</span>
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
              Another Thought
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
            You are currently browsing offline. Previously viewed quotes and cached sections remain accessible, and full discovery will resume as soon as your internet reconnects.
          </p>

          <div className="flex items-center gap-3">
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
                <svg
                  className="h-3.5 w-3.5 text-[var(--accent-gold)] fill-current"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
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
        Uddhriti PWA • Wisdom Doesn&apos;t Need Wi-Fi
      </footer>
    </div>
  );
}
