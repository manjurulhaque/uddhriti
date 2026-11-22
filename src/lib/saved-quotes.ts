"use client";

import * as React from "react";

export interface SavedQuote {
  id: string;
  slug?: string | null;
  content: string;
  authorName?: string | null;
  authorSlug?: string | null;
  category?: string | null;
  categorySlug?: string | null;
  sourceTitle?: string | null;
  year?: string | null;
  tags?: string[];
  isVerified?: boolean;
  savedAt: number;
}

const STORAGE_KEY = "quotzen_saved_quotes_v1";
const LEGACY_STORAGE_KEY = "uddhriti_saved_quotes_v1";
const CHANGE_EVENT = "quotzen_saved_quotes_changed";
const EMPTY_QUOTES: SavedQuote[] = [];

let cachedQuotes: SavedQuote[] | null = null;

function readStorage(): SavedQuote[] {
  if (typeof window === "undefined") return EMPTY_QUOTES;
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Graceful migration from legacy key if present
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw) {
        localStorage.setItem(STORAGE_KEY, legacyRaw);
        raw = legacyRaw;
      }
    }
    if (!raw) return EMPTY_QUOTES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : EMPTY_QUOTES;
  } catch {
    return EMPTY_QUOTES;
  }
}

function writeStorage(quotes: SavedQuote[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
    cachedQuotes = quotes;
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch (err) {
    console.warn("[SavedQuotes] Failed to save quote to localStorage:", err);
  }
}

export function getSavedQuotes(): SavedQuote[] {
  if (cachedQuotes !== null) {
    return cachedQuotes;
  }
  cachedQuotes = readStorage();
  return cachedQuotes;
}

export function isQuoteSaved(idOrSlug: string): boolean {
  if (!idOrSlug) return false;
  const quotes = getSavedQuotes();
  return quotes.some(
    (q) => q.id === idOrSlug || (q.slug && q.slug === idOrSlug)
  );
}

export function saveQuote(quote: Omit<SavedQuote, "savedAt">): void {
  const current = getSavedQuotes();
  const exists = current.some(
    (q) => q.id === quote.id || (quote.slug && q.slug === quote.slug)
  );
  if (exists) return;

  const item: SavedQuote = {
    ...quote,
    savedAt: Date.now(),
  };

  writeStorage([item, ...current]);
}

export function removeQuote(idOrSlug: string): void {
  const current = getSavedQuotes();
  const filtered = current.filter(
    (q) => q.id !== idOrSlug && q.slug !== idOrSlug
  );
  writeStorage(filtered);
}

export function toggleSaveQuote(
  quote: Omit<SavedQuote, "savedAt">
): boolean {
  if (isQuoteSaved(quote.id || quote.slug || "")) {
    removeQuote(quote.id || quote.slug || "");
    return false;
  } else {
    saveQuote(quote);
    return true;
  }
}

export function exportSavedQuotesAsMarkdown(quotes: SavedQuote[]): string {
  const lines = [
    "# Quotzen — My Saved Reflections",
    `*Exported on ${new Date().toLocaleDateString()}*\n`,
  ];

  for (const q of quotes) {
    lines.push(`> “${q.content}”`);
    lines.push(
      `> — **${q.authorName || "Unknown"}**${
        q.sourceTitle ? ` (${q.sourceTitle})` : ""
      }`
    );
    if (q.tags && q.tags.length > 0) {
      lines.push(`> *${q.tags.map((t) => `#${t}`).join(" ")}*`);
    }
    lines.push("\n---\n");
  }

  return lines.join("\n");
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  function handleStorage(e: StorageEvent) {
    if (e.key === STORAGE_KEY) {
      cachedQuotes = null;
      callback();
    }
  }

  function handleCustom() {
    callback();
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(CHANGE_EVENT, handleCustom);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CHANGE_EVENT, handleCustom);
  };
}

function getSnapshot(): SavedQuote[] {
  return getSavedQuotes();
}

function getServerSnapshot(): SavedQuote[] {
  return EMPTY_QUOTES;
}

export interface SavedQuotesContextValue {
  savedQuotes: SavedQuote[];
  count: number;
  isSaved: (idOrSlug: string) => boolean;
  save: (quote: Omit<SavedQuote, "savedAt">) => void;
  remove: (idOrSlug: string) => void;
  toggleSave: (quote: Omit<SavedQuote, "savedAt">) => boolean;
}

const SavedQuotesContext = React.createContext<SavedQuotesContextValue | null>(null);

export function SavedQuotesProvider({ children }: { children: React.ReactNode }) {
  const quotes = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const savedSet = React.useMemo(() => {
    const set = new Set<string>();
    for (const q of quotes) {
      if (q.id) set.add(q.id);
      if (q.slug) set.add(q.slug);
    }
    return set;
  }, [quotes]);

  const checkIsSaved = React.useCallback(
    (idOrSlug: string) => {
      if (!idOrSlug) return false;
      return savedSet.has(idOrSlug);
    },
    [savedSet]
  );

  const value = React.useMemo<SavedQuotesContextValue>(
    () => ({
      savedQuotes: quotes,
      count: quotes.length,
      isSaved: checkIsSaved,
      save: saveQuote,
      remove: removeQuote,
      toggleSave: toggleSaveQuote,
    }),
    [quotes, checkIsSaved]
  );

  return React.createElement(
    SavedQuotesContext.Provider,
    { value },
    children
  );
}

/**
 * Reactive React hook for accessing saved quotes across components and tabs.
 * Uses SavedQuotesContext (single listener, O(1) Set lookups).
 */
export function useSavedQuotes(): SavedQuotesContextValue {
  const context = React.useContext(SavedQuotesContext);
  if (!context) {
    throw new Error("useSavedQuotes must be used within a SavedQuotesProvider");
  }
  return context;
}
