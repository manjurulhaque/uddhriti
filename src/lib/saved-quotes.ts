"use client";

import * as React from "react";

export interface SavedQuote {
  id: string;
  slug?: string;
  content: string;
  authorName?: string | null;
  authorSlug?: string | null;
  category?: string | null;
  categorySlug?: string | null;
  sourceTitle?: string | null;
  year?: string | null;
  tags?: string[];
  savedAt: number;
}

const STORAGE_KEY = "uddhriti_saved_quotes_v1";
const CHANGE_EVENT = "uddhriti_saved_quotes_changed";
const EMPTY_QUOTES: SavedQuote[] = [];

let cachedQuotes: SavedQuote[] | null = null;

function readStorage(): SavedQuote[] {
  if (typeof window === "undefined") return EMPTY_QUOTES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
    "# Uddhriti — My Saved Reflections",
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

/**
 * Reactive React hook for accessing saved quotes across components and tabs
 */
export function useSavedQuotes() {
  const quotes = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const checkIsSaved = React.useCallback(
    (idOrSlug: string) => {
      return quotes.some(
        (q) => q.id === idOrSlug || (q.slug && q.slug === idOrSlug)
      );
    },
    [quotes]
  );

  return {
    savedQuotes: quotes,
    count: quotes.length,
    isSaved: checkIsSaved,
    save: saveQuote,
    remove: removeQuote,
    toggleSave: toggleSaveQuote,
  };
}
