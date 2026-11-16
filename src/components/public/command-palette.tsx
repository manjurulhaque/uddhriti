"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image"
import { CloseIcon, SearchIcon, SpinnerIcon } from "@/components/ui/icons"
import { QUICK_ACTIONS, CURATED_PATHWAYS } from "@/data/command-palette"

export interface SearchResultQuote {
  id: string
  slug: string | null
  content: string
  authorName: string | null
  author?: {
    name: string
    slug: string
    imageUrl?: string | null
  } | null
  category?: {
    name: string
    slug: string
  } | null
  isVerified?: boolean
}

export interface SearchResultAuthor {
  id: string
  name: string
  slug: string
  imageUrl?: string | null
  profession?: string | null
  quoteCount: number
  birthYear?: number | null
  deathYear?: number | null
}

export interface SearchResultCategory {
  id: string
  name: string
  slug: string
  quoteCount: number
}

export interface SearchResultTag {
  id: string
  name: string
  slug: string
  quoteCount: number
}

interface PaletteItem {
  id: string
  type: "quote" | "author" | "category" | "tag" | "action" | "query"
  title: string
  subtitle?: string
  href: string
  badge?: string
  imageUrl?: string | null
}

function emptySubscribe() {
  return () => {}
}

/**
 * Triggers opening the global command palette from any button or handler.
 */
export function openCommandPalette(initialQuery?: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("open-command-palette", {
        detail: { query: initialQuery || "" },
      })
    )
  }
}

export function CommandPalette() {
  const router = useRouter()
  const pathname = usePathname()
  const isMounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )

  const isMac = React.useSyncExternalStore(
    emptySubscribe,
    () => /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent),
    () => false
  )

  const [isOpen, setIsOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [selectedIndex, setSelectedIndex] = React.useState(0)

  const [quotes, setQuotes] = React.useState<SearchResultQuote[]>([])
  const [authors, setAuthors] = React.useState<SearchResultAuthor[]>([])
  const [categories, setCategories] = React.useState<SearchResultCategory[]>([])
  const [tags, setTags] = React.useState<SearchResultTag[]>([])

  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const listRef = React.useRef<HTMLDivElement | null>(null)

  // Listen for global Cmd+K / Ctrl+K hotkey and custom event
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        if (pathname?.startsWith("/admin")) return
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
    }

    function handleCustomOpen(e: Event) {
      const customEvent = e as CustomEvent<{ query?: string }>
      setIsOpen(true)
      if (customEvent.detail?.query) {
        setQuery(customEvent.detail.query)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("open-command-palette", handleCustomOpen)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("open-command-palette", handleCustomOpen)
    }
  }, [pathname])

  // Auto-focus input when opened
  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  // Live search debounced fetch
  React.useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed || trimmed.length < 2) {
      return
    }

    const abortController = new AbortController()

    const timeoutId = setTimeout(() => {
      setIsLoading(true)
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
        signal: abortController.signal,
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setQuotes(data.quotes || [])
            setAuthors(data.authors || [])
            setCategories(data.categories || [])
            setTags(data.tags || [])
            setSelectedIndex(0)
          }
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            console.error("Search failed:", err)
          }
        })
        .finally(() => {
          setIsLoading(false)
        })
    }, 240)

    return () => {
      clearTimeout(timeoutId)
      abortController.abort()
    }
  }, [query])

  // Build flat navigable items
  const flattenedItems: PaletteItem[] = React.useMemo(() => {
    const trimmed = query.trim()
    if (!trimmed || trimmed.length < 2) {
      return QUICK_ACTIONS
    }

    const items: PaletteItem[] = []

    // 1. Full search item
    items.push({
      id: "search-all",
      type: "query",
      title: `Search entire archive for "${trimmed}"`,
      subtitle: "Open full search results with filtering and sorting",
      href: `/quotes?q=${encodeURIComponent(trimmed)}`,
      badge: "Search All",
    })

    // 2. Quotes
    quotes.forEach((q) => {
      const author = q.author?.name || q.authorName || "Unknown"
      items.push({
        id: `quote-${q.id}`,
        type: "quote",
        title: `“${q.content}”`,
        subtitle: `— ${author}${q.category ? ` · ${q.category.name}` : ""}`,
        href: `/quotes/${q.slug || q.id}`,
        badge: q.category?.name || "Quote",
      })
    })

    // 3. Authors
    authors.forEach((a) => {
      const lifespan =
        a.birthYear && a.deathYear
          ? ` (${a.birthYear}–${a.deathYear})`
          : a.birthYear
          ? ` (b. ${a.birthYear})`
          : ""
      items.push({
        id: `author-${a.id}`,
        type: "author",
        title: a.name,
        subtitle: `${a.profession || "Thinker"}${lifespan} · ${a.quoteCount} quote${
          a.quoteCount === 1 ? "" : "s"
        }`,
        href: `/authors/${a.slug}`,
        badge: "Thinker",
        imageUrl: a.imageUrl,
      })
    })

    // 4. Categories
    categories.forEach((c) => {
      items.push({
        id: `cat-${c.id}`,
        type: "category",
        title: c.name,
        subtitle: `Explore thematic collection · ${c.quoteCount} quotations`,
        href: `/categories/${c.slug}`,
        badge: "Theme",
      })
    })

    // 5. Tags
    tags.forEach((t) => {
      items.push({
        id: `tag-${t.id}`,
        type: "tag",
        title: `#${t.name}`,
        subtitle: `Browse tagged thoughts · ${t.quoteCount} quotations`,
        href: `/tags/${t.slug}`,
        badge: "Tag",
      })
    })

    return items
  }, [query, quotes, authors, categories, tags])

  // Navigate on Enter or click
  const handleSelect = React.useCallback(
    (item: PaletteItem) => {
      setIsOpen(false)
      setQuery("")
      router.push(item.href)
    },
    [router]
  )

  // Keyboard navigation inside palette
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => (flattenedItems.length ? (prev + 1) % flattenedItems.length : 0))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) =>
        flattenedItems.length ? (prev - 1 + flattenedItems.length) % flattenedItems.length : 0
      )
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (flattenedItems.length > 0 && flattenedItems[selectedIndex]) {
        handleSelect(flattenedItems[selectedIndex])
      } else if (query.trim()) {
        setIsOpen(false)
        router.push(`/quotes?q=${encodeURIComponent(query.trim())}`)
      }
    } else if (e.key === "Escape") {
      e.preventDefault()
      if (query) {
        setQuery("")
      } else {
        setIsOpen(false)
      }
    }
  }

  // Scroll active item into view
  React.useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`)
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" })
    }
  }, [selectedIndex])

  if (!isOpen || !isMounted || pathname?.startsWith("/admin")) return null

  const isSearchActive = query.trim().length >= 2
  const hasResults = flattenedItems.length > 0

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette Quick Search"
      className="fixed inset-0 z-[9999] flex items-start justify-center p-4 sm:p-6 md:pt-20 select-none animate-rise"
    >
      {/* Dimmed Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity"
        onClick={() => {
          setIsOpen(false)
          setQuery("")
        }}
        aria-hidden="true"
      />

      {/* Floating Spotlight Card */}
      <div
        className="relative w-full max-w-2xl rounded-2xl sm:rounded-3xl border border-stone-200/90 bg-[#fbf9f5] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Search Input Bar */}
        <div className="relative flex items-center border-b border-stone-200 bg-white px-4 py-3.5 sm:px-6">
          <div className="flex items-center text-stone-400 mr-3">
            {isLoading ? (
              <SpinnerIcon className="h-5 w-5 animate-spin text-[var(--accent-rust)]" />
            ) : (
              <SearchIcon className="h-5 w-5 text-stone-400" />
            )}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search quotations, philosophers, topics, or actions..."
            className="w-full bg-transparent text-base sm:text-lg text-stone-900 placeholder:text-stone-400 focus:outline-none"
            aria-autocomplete="list"
          />

          <div className="flex items-center gap-1.5 ml-2">
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("")
                  setQuotes([])
                  setAuthors([])
                  setCategories([])
                  setTags([])
                  setIsLoading(false)
                  setSelectedIndex(0)
                  inputRef.current?.focus()
                }}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition cursor-pointer"
                aria-label="Clear query"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-block rounded border border-stone-200 bg-stone-50 px-2 py-0.5 font-mono text-[11px] text-stone-500">
                {isMac ? "⌘K" : "Ctrl+K"}
              </kbd>
            )}

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition sm:hidden cursor-pointer"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Results / Navigation Body */}
        <div ref={listRef} className="flex-1 overflow-y-auto divide-y divide-stone-100 p-2 sm:p-3">
          {/* Default Zero-Query View: Curated Pathways & Quick Actions */}
          {!isSearchActive && (
            <div className="space-y-4 p-2">
              {/* Curated Pathways */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-2 px-2">
                  Curated Pathways
                </span>
                <div className="flex flex-wrap gap-1.5 px-2">
                  {CURATED_PATHWAYS.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => setQuery(term)}
                      className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-700 hover:border-amber-400 hover:bg-amber-50/60 transition cursor-pointer shadow-2xs"
                    >
                      #{term}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Jump Commands */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1.5 px-2">
                  Quick Navigation
                </span>
                <div className="space-y-1">
                  {QUICK_ACTIONS.map((item, idx) => {
                    const isSelected = selectedIndex === idx
                    return (
                      <div
                        key={item.id}
                        data-index={idx}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => handleSelect(item)}
                        className={`group flex items-center justify-between rounded-xl px-3 py-2.5 transition cursor-pointer ${
                          isSelected
                            ? "bg-amber-500/10 text-stone-900 border-l-4 border-[var(--accent-rust)]"
                            : "hover:bg-stone-100/70 text-stone-800"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold text-stone-900">{item.title}</p>
                          <p className="text-xs text-stone-500 line-clamp-1">{item.subtitle}</p>
                        </div>
                        <span className="rounded-full bg-stone-100 border border-stone-200 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                          {item.badge}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Live Search Active View */}
          {isSearchActive && (
            <>
              {hasResults ? (
                <div className="space-y-1">
                  {flattenedItems.map((item, idx) => {
                    const isSelected = selectedIndex === idx
                    const isQuote = item.type === "quote"
                    const isAuthor = item.type === "author"
                    const isAction = item.type === "query"

                    return (
                      <div
                        key={item.id}
                        data-index={idx}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => handleSelect(item)}
                        className={`group flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition cursor-pointer ${
                          isSelected
                            ? "bg-amber-500/10 text-stone-900 border-l-4 border-[var(--accent-rust)]"
                            : "hover:bg-stone-100/70 text-stone-800"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Visual Indicator Glyph / Avatar */}
                          {isAuthor ? (
                            <div className="relative h-8 w-8 rounded-full overflow-hidden shrink-0 border border-stone-200 bg-stone-100 flex items-center justify-center text-xs font-serif font-bold text-stone-500">
                              {item.imageUrl ? (
                                <Image
                                  src={item.imageUrl}
                                  alt={item.title}
                                  fill
                                  sizes="32px"
                                  unoptimized
                                  className="object-cover"
                                />
                              ) : (
                                item.title.charAt(0)
                              )}
                            </div>
                          ) : isQuote ? (
                            <span className="font-serif text-xl leading-none text-[var(--accent-gold)] shrink-0 select-none">
                              &ldquo;
                            </span>
                          ) : isAction ? (
                            <span className="h-8 w-8 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 text-sm font-mono">
                              🔍
                            </span>
                          ) : (
                            <span className="h-7 w-7 rounded-lg bg-stone-100 text-stone-500 flex items-center justify-center shrink-0 text-xs">
                              {item.type === "category" ? "📚" : "🏷️"}
                            </span>
                          )}

                          {/* Content Details */}
                          <div className="min-w-0 space-y-0.5">
                            <p
                              className={`text-sm truncate ${
                                isQuote
                                  ? "font-serif italic text-stone-900"
                                  : isAction
                                  ? "font-semibold text-amber-950"
                                  : "font-semibold text-stone-900"
                              }`}
                            >
                              {item.title}
                            </p>
                            {item.subtitle && (
                              <p className="text-xs text-stone-500 truncate">{item.subtitle}</p>
                            )}
                          </div>
                        </div>

                        {/* Category / Type Badge */}
                        <div className="flex items-center gap-2 shrink-0">
                          {item.badge && (
                            <span className="rounded-full bg-stone-100 border border-stone-200 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                              {item.badge}
                            </span>
                          )}
                          <span
                            className={`text-xs transition-transform ${
                              isSelected ? "text-[var(--accent-rust)] translate-x-0.5" : "text-stone-300"
                            }`}
                          >
                            &rarr;
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                /* No Results State */
                !isLoading && (
                  <div className="py-12 px-4 text-center space-y-3">
                    <p className="text-sm font-medium text-stone-700">
                      No quotations, thinkers, or topics found for &ldquo;{query}&rdquo;
                    </p>
                    <p className="text-xs text-stone-500 max-w-sm mx-auto">
                      Try searching by thinker name (e.g. Marcus Aurelius), thematic keyword (e.g.
                      Stillness), or search the full archive.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false)
                        router.push(`/quotes?q=${encodeURIComponent(query.trim())}`)
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--page-cream)] border border-stone-300 px-4 py-1.5 text-xs font-semibold text-stone-800 hover:border-stone-900 transition"
                    >
                      <span>Search full archive &rarr;</span>
                    </button>
                  </div>
                )
              )}
            </>
          )}
        </div>

        {/* Bottom Status & Keyboard Shortcuts Bar */}
        <div className="border-t border-stone-200 bg-stone-50/80 px-4 py-2.5 sm:px-6 flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-white px-1.5 py-0.2 shadow-2xs">↑↓</kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-white px-1.5 py-0.2 shadow-2xs">↵</kbd>
              <span>select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-white px-1.5 py-0.2 shadow-2xs">ESC</kbd>
              <span>close</span>
            </span>
          </div>

          <span className="font-serif italic text-stone-400 hidden sm:inline">
            Quotzen Command Palette
          </span>
        </div>
      </div>
    </div>,
    document.body
  )
}

