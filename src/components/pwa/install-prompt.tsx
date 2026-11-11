"use client";

import * as React from "react";
import { ChevronDownIcon, CloseIcon, DownloadIcon } from "@/components/ui/icons";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const STORAGE_KEY = "quotzen_pwa_install_dismissed_until";
const LEGACY_STORAGE_KEY = "uddhriti_pwa_install_dismissed_until";
const DISMISS_DAYS = 7;

function subscribeIos(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getIosSnapshot(): boolean {
  if (typeof window === "undefined") return false;

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone ===
      true;
  if (isStandalone) return false;

  try {
    const dismissedUntil = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
      return false;
    }
  } catch {
    return false;
  }

  const ua = window.navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) &&
    !(window as unknown as { MSStream?: unknown }).MSStream;
  const isSafari =
    /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|mercury/i.test(ua);

  return Boolean(isIOS && isSafari);
}

function getIosServerSnapshot(): boolean {
  return false;
}

export function InstallPrompt() {
  const isIosCandidate = React.useSyncExternalStore(
    subscribeIos,
    getIosSnapshot,
    getIosServerSnapshot
  );
  const [iosDismissed, setIosDismissed] = React.useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    React.useState<BeforeInstallPromptEvent | null>(null);
  const [chromiumDismissed, setChromiumDismissed] = React.useState(false);
  const [showIosGuide, setShowIosGuide] = React.useState(false);
  const [isInstalling, setIsInstalling] = React.useState(false);

  React.useEffect(() => {
    function handleBeforeInstallPrompt(e: Event) {
      try {
        const dismissedUntil = localStorage.getItem(STORAGE_KEY);
        if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
          return;
        }
      } catch {
        // ignore
      }
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const isIosVisible = isIosCandidate && !iosDismissed;
  const isChromiumVisible = Boolean(deferredPrompt) && !chromiumDismissed;

  if (!isIosVisible && !isChromiumVisible) {
    return null;
  }

  const platform: "ios" | "chromium" = isIosVisible ? "ios" : "chromium";

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    setIsInstalling(true);

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.warn("[Quotzen PWA] Prompt error:", err);
    } finally {
      setIsInstalling(false);
    }
  }

  function handleDismiss() {
    if (isIosVisible) setIosDismissed(true);
    if (isChromiumVisible) setChromiumDismissed(true);
    try {
      const expireTime = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
      localStorage.setItem(STORAGE_KEY, String(expireTime));
    } catch {
      // ignore
    }
  }

  return (
    <aside
      aria-label="Install App"
      className="fixed bottom-5 right-5 left-5 sm:left-auto sm:max-w-md z-50 animate-rise"
    >
      <div className="p-4 rounded-2xl bg-[var(--page-cream)]/95 text-[var(--ink-900)] border border-stone-300/80 shadow-2xl backdrop-blur-md">
        {/* Main Header Row */}
        <div className="flex items-start gap-3.5">
          {/* App Icon */}
          <div className="flex-shrink-0 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--ink-900)] text-white shadow-xs">
            <span className="font-serif text-xl font-bold italic text-[var(--accent-gold)]">
              Q
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-serif font-bold text-[var(--ink-900)] tracking-tight">
                {platform === "ios"
                  ? "Install Quotzen on iPhone / iPad"
                  : "Install Quotzen App"}
              </h4>
              <span className="text-[10px] uppercase font-sans font-semibold tracking-wider text-[var(--accent-rust)] bg-[#c76b3e]/10 px-1.5 py-0.5 rounded">
                PWA
              </span>
            </div>
            <p className="text-[11px] text-stone-600 line-clamp-2 mt-0.5 leading-snug">
              Read timeless quotes offline &amp; enjoy a full-screen, ad-free
              reading sanctuary.
            </p>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 transition-colors cursor-pointer flex-shrink-0 -mt-1 -mr-1"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Action Row / iOS Guide Accordion */}
        {platform === "chromium" && (
          <div className="mt-3 pt-3 border-t border-stone-200/80 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleDismiss}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-200/40 transition-colors cursor-pointer"
            >
              Not now
            </button>
            <button
              type="button"
              onClick={handleInstallClick}
              disabled={isInstalling}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent-rust)] text-white hover:opacity-90 transition-opacity shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <DownloadIcon className="w-3.5 h-3.5" />
              {isInstalling ? "Installing..." : "Install"}
            </button>
          </div>
        )}

        {platform === "ios" && (
          <div className="mt-3 pt-3 border-t border-stone-200/80">
            {!showIosGuide ? (
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-stone-500 font-serif italic">
                  Quick 2-step setup via Safari
                </span>
                <button
                  type="button"
                  onClick={() => setShowIosGuide(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent-rust)] text-white hover:opacity-90 transition-opacity shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>How to Add</span>
                  <ChevronDownIcon className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 pt-1 animate-rise">
                <div className="flex items-start gap-2.5 text-xs text-stone-700 bg-white/70 p-2.5 rounded-xl border border-stone-200/60">
                  <div className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-md bg-stone-100 border border-stone-300/80 text-[var(--accent-rust)]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold text-stone-900">1.</span> Tap
                    the <span className="font-semibold">Share</span> icon in
                    Safari&apos;s toolbar.
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-stone-700 bg-white/70 p-2.5 rounded-xl border border-stone-200/60">
                  <div className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-md bg-stone-100 border border-stone-300/80 text-[var(--accent-rust)]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold text-stone-900">2.</span> Scroll
                    down and tap{" "}
                    <span className="font-semibold">Add to Home Screen</span>.
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="text-xs font-semibold text-[var(--accent-rust)] hover:underline cursor-pointer"
                  >
                    Got it, thanks!
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
