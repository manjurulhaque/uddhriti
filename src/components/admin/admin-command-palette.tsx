"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { refreshDashboardAction } from "@/app/admin/(protected)/dashboard/actions"

export interface AdminCommandItem {
  id: string
  title: string
  description?: string
  href?: string
  action?: () => void | Promise<void>
  section: "Actions" | "Content" | "Taxonomies" | "System"
  badge?: string
  keywords?: string[]
}

function emptySubscribe() {
  return () => {}
}

/**
 * Triggers opening the global admin command palette from any button or handler.
 */
export function openAdminCommandPalette() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("open-admin-command-palette"))
  }
}

// Built-in minimalist icons for command palette items
function IconSearch({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

function IconPlus({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  )
}

function IconUpload({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  )
}

function IconQuotes({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h6m-6 4h8M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
    </svg>
  )
}

function IconDashboard({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  )
}

function IconAuthors({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

function IconCategories({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  )
}

function IconTags({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  )
}

function IconCollections({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  )
}

function IconSources({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  )
}

function IconFaqs({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function IconTrash({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function IconRefresh({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  )
}

function IconExternal({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  )
}

function IconFilter({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  )
}

export function AdminCommandPalette() {
  const router = useRouter()
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
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([])

  // Complete catalog of admin commands, actions, and routes
  const catalog: AdminCommandItem[] = React.useMemo(
    () => [
      // Actions
      {
        id: "action-new-quote",
        title: "Submit New Quote",
        description: "Open the single quote editor form",
        href: "/admin/quotes/new",
        section: "Actions",
        badge: "Create",
        keywords: ["new", "create", "add", "quote", "compose", "write"],
      },
      {
        id: "action-bulk-quotes",
        title: "Bulk Upload Quotes",
        description: "Batch import quotes from JSON/CSV payload",
        href: "/admin/quotes/bulk",
        section: "Actions",
        badge: "Import",
        keywords: ["bulk", "upload", "import", "batch", "quotes", "json", "csv"],
      },
      {
        id: "action-new-author",
        title: "Create New Author",
        description: "Add a new thinker, writer, or historical figure",
        href: "/admin/authors/new",
        section: "Actions",
        badge: "Create",
        keywords: ["new", "author", "thinker", "philosopher", "writer", "person"],
      },
      {
        id: "action-new-category",
        title: "Create New Category",
        description: "Add a new thematic category",
        href: "/admin/categories/new",
        section: "Actions",
        badge: "Create",
        keywords: ["new", "category", "theme", "subject", "topic"],
      },
      {
        id: "action-bulk-categories",
        title: "Bulk Create Categories",
        description: "Batch create categories",
        href: "/admin/categories/bulk",
        section: "Actions",
        badge: "Import",
        keywords: ["bulk", "category", "import", "batch"],
      },
      {
        id: "action-new-tag",
        title: "Create New Tag",
        description: "Add a new taxonomy tag with faceted type",
        href: "/admin/tags/new",
        section: "Actions",
        badge: "Create",
        keywords: ["new", "tag", "taxonomy", "facet", "mood"],
      },
      {
        id: "action-bulk-tags",
        title: "Bulk Create Tags",
        description: "Batch create taxonomy tags",
        href: "/admin/tags/bulk",
        section: "Actions",
        badge: "Import",
        keywords: ["bulk", "tag", "import", "batch"],
      },
      {
        id: "action-new-collection",
        title: "Create New Collection",
        description: "Curate a thematic quote anthology",
        href: "/admin/collections/new",
        section: "Actions",
        badge: "Create",
        keywords: ["new", "collection", "anthology", "curated", "list"],
      },
      {
        id: "action-import-sources",
        title: "Import Sources",
        description: "Batch create works, books, and references",
        href: "/admin/sources/bulk",
        section: "Actions",
        badge: "Import",
        keywords: ["import", "sources", "books", "citations", "works", "bulk"],
      },
      {
        id: "action-import-faqs",
        title: "Import FAQs",
        description: "Batch create frequently asked questions",
        href: "/admin/faqs/bulk",
        section: "Actions",
        badge: "Import",
        keywords: ["import", "faqs", "questions", "bulk"],
      },
      {
        id: "action-refresh-metrics",
        title: "Refresh Dashboard Metrics Cache",
        description: "Purge and recompute cached aggregation numbers",
        section: "Actions",
        badge: "Revalidate",
        keywords: ["refresh", "cache", "dashboard", "metrics", "stats", "revalidate", "purge"],
        action: async () => {
          setIsRefreshing(true)
          setStatusMessage("Refreshing dashboard metrics cache...")
          try {
            await refreshDashboardAction()
            setStatusMessage("Dashboard cache refreshed successfully!")
            setTimeout(() => {
              setIsOpen(false)
              setStatusMessage(null)
              router.refresh()
            }, 800)
          } catch {
            setStatusMessage("Failed to refresh metrics cache.")
          } finally {
            setIsRefreshing(false)
          }
        },
      },

      // Content
      {
        id: "nav-quotes-all",
        title: "All Quotes",
        description: "Manage and curate all quotations",
        href: "/admin/quotes",
        section: "Content",
        keywords: ["quotes", "list", "all", "table", "browse"],
      },
      {
        id: "nav-quotes-draft",
        title: "Draft & Review Quotes",
        description: "Filter quotes in DRAFT or REVIEW status",
        href: "/admin/quotes?filter=draft",
        section: "Content",
        badge: "Filter",
        keywords: ["draft", "review", "pending", "unpublished", "quotes"],
      },
      {
        id: "nav-quotes-archived",
        title: "Archived Quotes",
        description: "Filter quotes in ARCHIVED status",
        href: "/admin/quotes?filter=archived",
        section: "Content",
        badge: "Filter",
        keywords: ["archived", "hidden", "quotes"],
      },
      {
        id: "nav-quotes-unattributed",
        title: "Unattributed Quotes",
        description: "Quotes without an author assigned",
        href: "/admin/quotes?filter=unattributed",
        section: "Content",
        badge: "Audit",
        keywords: ["unattributed", "anonymous", "no author", "quotes"],
      },
      {
        id: "nav-quotes-missing-source",
        title: "Missing Source Quotes",
        description: "Quotes without a work/book citation",
        href: "/admin/quotes?filter=missing-source",
        section: "Content",
        badge: "Audit",
        keywords: ["missing source", "citation", "source", "quotes"],
      },
      {
        id: "nav-quotes-no-tags",
        title: "Untagged Quotes",
        description: "Quotes with no taxonomy tags attached",
        href: "/admin/quotes?filter=no-tags",
        section: "Content",
        badge: "Audit",
        keywords: ["no tags", "untagged", "tags", "quotes"],
      },
      {
        id: "nav-quotes-orphaned",
        title: "Orphaned Quotes",
        description: "Quotes missing author, source, or tags",
        href: "/admin/quotes?filter=orphaned",
        section: "Content",
        badge: "Audit",
        keywords: ["orphaned", "incomplete", "quotes"],
      },
      {
        id: "nav-quotes-deleted",
        title: "Deleted Quotes (Trash)",
        description: "Soft-deleted quotes awaiting restoration or purge",
        href: "/admin/quotes/deleted",
        section: "Content",
        badge: "Trash",
        keywords: ["trash", "deleted", "restore", "bin", "recovery", "quotes"],
      },

      // Taxonomies
      {
        id: "nav-authors",
        title: "Authors Catalog",
        description: "Manage thinkers, philosophers, and writers",
        href: "/admin/authors",
        section: "Taxonomies",
        keywords: ["authors", "thinkers", "people", "writers"],
      },
      {
        id: "nav-categories",
        title: "Categories Catalog",
        description: "Thematic quote categories and subjects",
        href: "/admin/categories",
        section: "Taxonomies",
        keywords: ["categories", "topics", "themes", "subjects"],
      },
      {
        id: "nav-tags",
        title: "Tags Catalog",
        description: "Faceted taxonomies for mood, topic, and virtue",
        href: "/admin/tags",
        section: "Taxonomies",
        keywords: ["tags", "taxonomy", "moods", "virtues", "facets"],
      },
      {
        id: "nav-collections",
        title: "Collections Catalog",
        description: "Curated anthologies and editorial selections",
        href: "/admin/collections",
        section: "Taxonomies",
        keywords: ["collections", "anthologies", "curated", "lists"],
      },
      {
        id: "nav-sources",
        title: "Sources Catalog",
        description: "Books, speeches, letters, and works",
        href: "/admin/sources",
        section: "Taxonomies",
        keywords: ["sources", "books", "citations", "works", "literature"],
      },
      {
        id: "nav-faqs",
        title: "FAQs Catalog",
        description: "Frequently asked questions repository",
        href: "/admin/faqs",
        section: "Taxonomies",
        keywords: ["faqs", "questions", "answers", "help"],
      },

      // System
      {
        id: "nav-dashboard",
        title: "Admin Dashboard",
        description: "Overview metrics, KPIs, and attention queues",
        href: "/admin/dashboard",
        section: "System",
        keywords: ["dashboard", "overview", "analytics", "stats", "kpi", "home"],
      },
      {
        id: "nav-public-site",
        title: "View Public Site",
        description: "Open the public Quotzen storefront in current tab",
        href: "/",
        section: "System",
        badge: "Public",
        keywords: ["public", "home", "site", "view", "storefront"],
      },
    ],
    [router]
  )

  // Filter items matching current search query
  const filteredItems = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return catalog

    return catalog.filter((item) => {
      const titleMatch = item.title.toLowerCase().includes(needle)
      const descMatch = item.description?.toLowerCase().includes(needle)
      const keywordMatch = item.keywords?.some((kw) => kw.toLowerCase().includes(needle))
      const sectionMatch = item.section.toLowerCase().includes(needle)
      const badgeMatch = item.badge?.toLowerCase().includes(needle)

      return titleMatch || descMatch || keywordMatch || sectionMatch || badgeMatch
    })
  }, [catalog, query])

  // Adjust selected index during render when query changes (avoids cascading effect renders)
  const [prevQuery, setPrevQuery] = React.useState(query)
  if (prevQuery !== query) {
    setPrevQuery(query)
    setSelectedIndex(0)
  }

  const closePalette = React.useCallback(() => {
    setIsOpen(false)
    setQuery("")
    setStatusMessage(null)
  }, [])

  // Global keyboard shortcuts (Cmd+K / Ctrl+K and custom trigger event)
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setIsOpen((prev) => {
          if (prev) {
            setQuery("")
            setStatusMessage(null)
          }
          return !prev
        })
      }
    }

    function handleCustomOpen() {
      setIsOpen(true)
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("open-admin-command-palette", handleCustomOpen)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("open-admin-command-palette", handleCustomOpen)
    }
  }, [])

  // Focus input and lock body scrolling when open
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

  // Scroll active item into view
  React.useEffect(() => {
    if (isOpen && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: "nearest",
      })
    }
  }, [selectedIndex, isOpen])

  const executeItem = React.useCallback(
    (item: AdminCommandItem) => {
      if (item.action) {
        item.action()
        return
      }

      if (item.href) {
        closePalette()
        router.push(item.href)
      }
    },
    [closePalette, router]
  )

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => (filteredItems.length === 0 ? 0 : (prev + 1) % filteredItems.length))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) =>
        filteredItems.length === 0 ? 0 : (prev - 1 + filteredItems.length) % filteredItems.length
      )
    } else if (e.key === "Enter") {
      e.preventDefault()
      const selected = filteredItems[selectedIndex]
      if (selected) {
        executeItem(selected)
      }
    } else if (e.key === "Escape") {
      e.preventDefault()
      closePalette()
    }
  }

  function getItemIcon(item: AdminCommandItem) {
    if (item.id.includes("new-quote") || item.id.includes("new-")) return <IconPlus />
    if (item.id.includes("bulk") || item.id.includes("import")) return <IconUpload />
    if (item.id.includes("refresh")) return <IconRefresh className={isRefreshing ? "animate-spin" : ""} />
    if (item.id.includes("deleted")) return <IconTrash />
    if (item.id.includes("filter") || item.id.includes("unattributed") || item.id.includes("missing"))
      return <IconFilter />
    if (item.id.includes("authors")) return <IconAuthors />
    if (item.id.includes("categories")) return <IconCategories />
    if (item.id.includes("tags")) return <IconTags />
    if (item.id.includes("collections")) return <IconCollections />
    if (item.id.includes("sources")) return <IconSources />
    if (item.id.includes("faqs")) return <IconFaqs />
    if (item.id.includes("dashboard")) return <IconDashboard />
    if (item.id.includes("public")) return <IconExternal />
    return <IconQuotes />
  }

  if (!isMounted || !isOpen) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Admin Command Palette"
      className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-start justify-center pt-[10vh] px-4 animate-in fade-in duration-150"
      onClick={closePalette}
    >
      <div
        className="w-full max-w-xl bg-white border border-stone-200/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 border-b border-stone-100 bg-white">
          <IconSearch className="w-5 h-5 text-stone-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search admin pages, actions, or tools..."
            className="w-full px-3 py-3.5 text-sm text-stone-900 placeholder-stone-400 bg-transparent outline-none focus:ring-0"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-stone-400 hover:text-stone-700 text-xs px-1.5 py-0.5 rounded cursor-pointer mr-1"
            >
              Clear
            </button>
          ) : null}
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-stone-400 bg-stone-100 rounded border border-stone-200 shrink-0">
            Esc
          </kbd>
        </div>

        {/* Status notification toast */}
        {statusMessage ? (
          <div className="bg-stone-900 text-white text-xs px-4 py-2 flex items-center justify-between">
            <span>{statusMessage}</span>
            {isRefreshing && <IconRefresh className="w-3.5 h-3.5 animate-spin" />}
          </div>
        ) : null}

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-transparent scrollbar-thin">
          {filteredItems.length > 0 ? (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex

              return (
                <button
                  key={item.id}
                  ref={(el) => {
                    itemRefs.current[index] = el
                  }}
                  type="button"
                  onClick={() => executeItem(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition cursor-pointer ${
                    isSelected ? "bg-stone-100 text-stone-950" : "text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition ${
                        isSelected
                          ? "bg-white text-stone-900 shadow-2xs border border-stone-200"
                          : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {getItemIcon(item)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold truncate text-stone-900">{item.title}</span>
                        {item.badge ? (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-stone-200/70 text-stone-700">
                            {item.badge}
                          </span>
                        ) : null}
                      </div>
                      {item.description ? (
                        <p className="text-[11px] text-stone-400 truncate">{item.description}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-[10px] text-stone-400 uppercase tracking-wider font-mono">
                      {item.section}
                    </span>
                    {isSelected && (
                      <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-mono font-medium bg-white text-stone-700 rounded border border-stone-200 shadow-2xs">
                        ↵
                      </kbd>
                    )}
                  </div>
                </button>
              )
            })
          ) : (
            <div className="py-12 text-center text-stone-400 text-xs">
              <p className="font-medium text-stone-600 mb-1">No admin actions or pages found</p>
              <p>No results match &quot;{query}&quot;. Try searching for &quot;quotes&quot;, &quot;new&quot;, or &quot;authors&quot;.</p>
            </div>
          )}
        </div>

        {/* Keyboard Shortcuts Footer */}
        <div className="px-4 py-2.5 bg-stone-50 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400 select-none">
          <span className="font-medium text-stone-500">Quotzen Admin Engine</span>
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 font-mono text-[10px] bg-white border border-stone-200 rounded">↑</kbd>
              <kbd className="px-1 py-0.5 font-mono text-[10px] bg-white border border-stone-200 rounded ml-0.5">↓</kbd> navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-white border border-stone-200 rounded">↵</kbd> select
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-white border border-stone-200 rounded">
                {isMac ? "⌘K" : "Ctrl+K"}
              </kbd> toggle
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
