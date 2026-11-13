"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { refreshDashboardAction } from "@/app/admin/(protected)/dashboard/actions"
import {
  AuthorsIcon,
  CategoriesIcon,
  CollectionsIcon,
  DashboardIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FaqsIcon,
  FilterIcon,
  PlusIcon,
  QuotesIcon,
  RefreshIcon,
  SearchIcon,
  SourcesIcon,
  TagsIcon,
  TrashIcon,
  UploadIcon,
} from "@/components/ui/icons"

export interface AdminCommandItem {
  id: string
  title: string
  description?: string
  href?: string
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

// Complete static catalog of admin commands, actions, and routes
const ADMIN_COMMAND_CATALOG: AdminCommandItem[] = [
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
    id: "action-export-quotes-csv",
    title: "Export All Quotes (CSV)",
    description: "Download entire quotes database as RFC 4180 CSV",
    href: "/api/admin/quotes/export?format=csv",
    section: "Actions",
    badge: "Export",
    keywords: ["export", "download", "csv", "quotes", "spreadsheet", "excel", "backup"],
  },
  {
    id: "action-export-quotes-json",
    title: "Export All Quotes (JSON)",
    description: "Download structured JSON archive of all quotations",
    href: "/api/admin/quotes/export?format=json",
    section: "Actions",
    badge: "Export",
    keywords: ["export", "download", "json", "quotes", "archive", "backup"],
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
    id: "nav-quotes-featured",
    title: "Featured Quotes",
    description: "Quotes featured on homepage hero and spotlight carousels",
    href: "/admin/quotes?filter=featured",
    section: "Content",
    badge: "Spotlight",
    keywords: ["featured", "spotlight", "hero", "starred", "quotes"],
  },
  {
    id: "nav-quotes-disputed",
    title: "Disputed Quotes",
    description: "Quotes with contested or misattributed authorship",
    href: "/admin/quotes?filter=disputed",
    section: "Content",
    badge: "Audit",
    keywords: ["disputed", "misattributed", "attribution", "fake", "quotes"],
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
    id: "nav-quotes-no-context",
    title: "Quotes Without Interpretation & Context",
    description: "Quotes missing literary meaning, historical context, or relevance",
    href: "/admin/quotes?filter=no-context",
    section: "Content",
    badge: "Audit",
    keywords: ["no context", "missing context", "interpretation", "meaning", "history", "quotes"],
  },
  {
    id: "nav-quotes-has-context",
    title: "Curated Quotes (Has Context)",
    description: "Quotes enriched with literary interpretation and context",
    href: "/admin/quotes?filter=has-context",
    section: "Content",
    badge: "Curated",
    keywords: ["curated", "has context", "with context", "interpretation", "meaning", "quotes"],
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
    id: "nav-system-activity",
    title: "Activity & Audit Trail",
    description: "Immutable administrative ledger tracking entity modifications and system operations",
    href: "/admin/activity",
    section: "System",
    badge: "Audit",
    keywords: ["activity", "audit", "logs", "history", "trail", "operations", "changes"],
  },
  {
    id: "nav-system-tools",
    title: "System Health & Diagnostics",
    description: "Database integrity audits, counter sync, and automated maintenance",
    href: "/admin/tools",
    section: "System",
    badge: "Maintenance",
    keywords: ["tools", "health", "diagnostics", "maintenance", "repair", "sync", "counters", "integrity"],
  },
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
]

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

  // Filter items matching current search query
  const filteredItems = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return ADMIN_COMMAND_CATALOG

    return ADMIN_COMMAND_CATALOG.filter((item) => {
      const titleMatch = item.title.toLowerCase().includes(needle)
      const descMatch = item.description?.toLowerCase().includes(needle)
      const keywordMatch = item.keywords?.some((kw) => kw.toLowerCase().includes(needle))
      const sectionMatch = item.section.toLowerCase().includes(needle)
      const badgeMatch = item.badge?.toLowerCase().includes(needle)

      return titleMatch || descMatch || keywordMatch || sectionMatch || badgeMatch
    })
  }, [query])

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

  const handleRefreshMetrics = React.useCallback(async () => {
    setIsRefreshing(true)
    setStatusMessage("Refreshing dashboard metrics cache...")
    try {
      await refreshDashboardAction()
      setStatusMessage("Dashboard cache refreshed successfully!")
      setTimeout(() => {
        closePalette()
        router.refresh()
      }, 800)
    } catch {
      setStatusMessage("Failed to refresh metrics cache.")
    } finally {
      setIsRefreshing(false)
    }
  }, [closePalette, router])

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
      if (item.id === "action-refresh-metrics") {
        handleRefreshMetrics()
        return
      }

      if (item.href) {
        closePalette()
        if (item.href.startsWith("/api/")) {
          const a = document.createElement("a")
          a.href = item.href
          a.download = ""
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
        } else {
          router.push(item.href)
        }
      }
    },
    [closePalette, handleRefreshMetrics, router]
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
    if (item.id.includes("export")) return <DownloadIcon />
    if (item.id.includes("new-quote") || item.id.includes("new-")) return <PlusIcon />
    if (item.id.includes("bulk") || item.id.includes("import")) return <UploadIcon />
    if (item.id.includes("refresh")) return <RefreshIcon className={isRefreshing ? "animate-spin" : ""} />
    if (item.id.includes("deleted")) return <TrashIcon />
    if (item.id.includes("filter") || item.id.includes("unattributed") || item.id.includes("missing"))
      return <FilterIcon />
    if (item.id.includes("authors")) return <AuthorsIcon />
    if (item.id.includes("categories")) return <CategoriesIcon />
    if (item.id.includes("tags")) return <TagsIcon />
    if (item.id.includes("collections")) return <CollectionsIcon />
    if (item.id.includes("sources")) return <SourcesIcon />
    if (item.id.includes("faqs")) return <FaqsIcon />
    if (item.id.includes("dashboard")) return <DashboardIcon />
    if (item.id.includes("public")) return <ExternalLinkIcon />
    return <QuotesIcon />
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
          <SearchIcon className="w-5 h-5 text-stone-400 shrink-0" />
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
            {isRefreshing && <RefreshIcon className="w-3.5 h-3.5 animate-spin" />}
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
              <p>No results match &quot;{query}&quot;. Try searching for &quot;quotes&quot;, &quot;export&quot;, or &quot;authors&quot;.</p>
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
