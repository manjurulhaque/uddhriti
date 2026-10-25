"use client";

import * as React from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const STORAGE_KEY = "uddhriti_pwa_install_dismissed_until";
const DISMISS_DAYS = 7;

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    React.useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = React.useState(false);
  const [isInstalling, setIsInstalling] = React.useState(false);

  React.useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      return;
    }

    // Check dismissal cool-down
    try {
      const dismissedUntil = localStorage.getItem(STORAGE_KEY);
      if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
        return;
      }
    } catch {
      // localStorage may fail in private mode
    }

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    }

    function handleAppInstalled() {
      setIsVisible(false);
      setDeferredPrompt(null);
    }

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    setIsInstalling(true);

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsVisible(false);
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.warn("[Uddhriti PWA] Prompt error:", err);
    } finally {
      setIsInstalling(false);
    }
  }

  function handleDismiss() {
    setIsVisible(false);
    try {
      const expireTime = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
      localStorage.setItem(STORAGE_KEY, String(expireTime));
    } catch {
      // ignore
    }
  }

  if (!isVisible || !deferredPrompt) {
    return null;
  }

  return (
    <aside
      aria-label="Install App"
      className="fixed bottom-5 right-5 left-5 sm:left-auto sm:max-w-md z-50 animate-rise"
    >
      <div className="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-[var(--page-cream)]/95 text-[var(--ink-900)] border border-stone-300/80 shadow-xl backdrop-blur-md">
        {/* App Icon */}
        <div className="flex-shrink-0 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--ink-900)] text-white shadow-xs">
          <span className="font-serif text-xl font-bold italic text-[var(--accent-gold)]">
            U
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-serif font-bold text-[var(--ink-900)] tracking-tight">
              Install Uddhriti
            </h4>
            <span className="text-[10px] uppercase font-sans font-semibold tracking-wider text-[var(--accent-rust)] bg-[#c76b3e]/10 px-1.5 py-0.5 rounded">
              PWA
            </span>
          </div>
          <p className="text-[11px] text-stone-600 line-clamp-1 mt-0.5">
            Read timeless quotes offline &amp; install directly to your device.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent-rust)] text-white hover:opacity-90 transition-opacity shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isInstalling ? "Installing..." : "Install"}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 transition-colors cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
