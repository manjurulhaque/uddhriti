"use client"

import { useMemo, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { formatDateTimeInAppTimeZone } from "@/lib/datetime"
import { FilterToolbar, AdminEntityCard } from "@/components/admin"
import { Pagination, EmptyState, ConfirmModal, Button, Badge, Select } from "@/components/ui"
import { QuoteSortOption as SortOption, quoteSortOptions as sortOptions } from "@/lib/quotes/sort"
import { QuoteContextQuickEditor } from "./QuoteContextQuickEditor"
import { QuoteVerificationModal } from "./QuoteVerificationModal"

type QuoteItem = {
  id: string
  content: string
  status: string
  isVerified: boolean
  isFeatured?: boolean
  attributionStatus?: string
  createdAt: string
  publishedAt: string | null
  authorId?: string | null
  authorName: string | null
  authorSlug?: string | null
  categoryName: string | null
  categorySlug: string | null
  sourceId?: string | null
  sourceTitle: string | null
  sourceSlug?: string | null
  hasAuthor: boolean
  hasCategory: boolean
  hasSource: boolean
  hasTags: boolean
  tags?: Array<{ id: string; name: string; slug: string }>
  hasContext?: boolean
  meaning?: string | null
  historicalContext?: string | null
  modernRelevance?: string | null
  verificationNote?: string | null
  verificationConfidence?: number | null
}

type Option = {
  id: string
  name?: string
  title?: string
}

type TagOption = {
  id: string
  name: string
}

type BulkActionType =
  | "setAuthor"
  | "setCategory"
  | "setSource"
  | "clearSource"
  | "addTags"
  | "removeTags"
  | "setStatus"
  | "setVerification"
  | "setAttribution"

type QuoteFilter =
  | "all"
  | "draft"
  | "archived"
  | "featured"
  | "unverified"
  | "disputed"
  | "unattributed"
  | "missing-source"
  | "no-tags"
  | "no-context"
  | "has-context"
  | "orphaned"

type CategoryOption = {
  id: string
  name: string
  slug: string
}

function buildQuotesListHref(
  filter: QuoteFilter,
  page: number,
  search?: string,
  sort?: SortOption,
  category?: string,
  author?: string,
  status?: string,
  verified?: string,
  attribution?: string,
  tag?: string,
  source?: string
) {
  const params = new URLSearchParams()
  if (filter !== "all") {
    params.set("filter", filter)
  }
  if (category && category !== "all") {
    params.set("category", category)
  }
  if (author && author !== "all") {
    params.set("author", author)
  }
  if (status && status !== "all") {
    params.set("status", status)
  }
  if (verified && verified !== "all") {
    params.set("verified", verified)
  }
  if (attribution && attribution !== "all") {
    params.set("attribution", attribution)
  }
  if (tag && tag !== "all") {
    params.set("tag", tag)
  }
  if (source && source !== "all") {
    params.set("source", source)
  }
  if (sort && sort !== "newest") {
    params.set("sort", sort)
  }
  if (page > 1) {
    params.set("page", String(page))
  }
  if (search && search.trim()) {
    params.set("search", search.trim())
  }

  const query = params.toString()
  return query ? `/admin/quotes?${query}` : "/admin/quotes"
}

export function QuotesListManager({
  quotes,
  activeFilter,
  activeFilterLabel,
  page,
  pageSize,
  total,
  initialSearch = "",
  initialSort = "newest",
  initialCategory = "all",
  categoryOptions = [],
  initialAuthor = "",
  initialAuthorName = null,
  initialStatus = "all",
  initialVerified = "all",
  initialAttribution = "all",
  initialTag = "",
  initialTagName = null,
  initialSource = "",
  initialSourceTitle = null,
}: {
  quotes: QuoteItem[]
  activeFilter: QuoteFilter
  activeFilterLabel: string
  page: number
  pageSize: number
  total: number
  initialSearch?: string
  initialSort?: SortOption
  initialCategory?: string
  categoryOptions?: CategoryOption[]
  initialAuthor?: string
  initialAuthorName?: string | null
  initialStatus?: string
  initialVerified?: string
  initialAttribution?: string
  initialTag?: string
  initialTagName?: string | null
  initialSource?: string
  initialSourceTitle?: string | null
}) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [action, setAction] = useState<BulkActionType>("setStatus")
  const [statusValue, setStatusValue] = useState<"PUBLISHED" | "DRAFT" | "ARCHIVED">("PUBLISHED")
  const [attributionValue, setAttributionValue] = useState<"CONFIRMED" | "DISPUTED" | "MISATTRIBUTED" | "UNKNOWN">("CONFIRMED")
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({})
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null)
  const [verificationOverrides, setVerificationOverrides] = useState<Record<string, boolean>>({})
  const [attributionOverrides, setAttributionOverrides] = useState<Record<string, string>>({})
  const [verificationNoteOverrides, setVerificationNoteOverrides] = useState<Record<string, string | null>>({})
  const [togglingVerificationId, setTogglingVerificationId] = useState<string | null>(null)
  const [verificationValue, setVerificationValue] = useState(true)
  const [verifyingQuote, setVerifyingQuote] = useState<{
    id: string
    content: string
    authorName: string | null
    sourceTitle?: string | null
    categoryName?: string | null
    isVerified?: boolean
    attributionStatus?: string | null
    verificationNote?: string | null
    verificationConfidence?: number | null
  } | null>(null)
  const [editingContextQuote, setEditingContextQuote] = useState<{
    id: string
    content: string
    authorName: string | null
    categoryName: string | null
    meaning?: string | null
    historicalContext?: string | null
    modernRelevance?: string | null
  } | null>(null)
  const [contextOverrides, setContextOverrides] = useState<
    Record<
      string,
      {
        meaning: string | null
        historicalContext: string | null
        modernRelevance: string | null
        hasContext: boolean
      }
    >
  >({})

  function handleContextSaveSuccess(updated: {
    id: string
    meaning: string | null
    historicalContext: string | null
    modernRelevance: string | null
    hasContext: boolean
  }) {
    setContextOverrides((prev) => ({
      ...prev,
      [updated.id]: updated,
    }))
    router.refresh()
  }

  function handleVerificationSaveSuccess(updated: {
    id: string
    isVerified: boolean
    attributionStatus: "CONFIRMED" | "DISPUTED" | "MISATTRIBUTED" | "UNKNOWN"
    verificationConfidence: number
    verificationNote: string | null
  }) {
    setVerificationOverrides((prev) => ({
      ...prev,
      [updated.id]: updated.isVerified,
    }))
    setAttributionOverrides((prev) => ({
      ...prev,
      [updated.id]: updated.attributionStatus,
    }))
    setVerificationNoteOverrides((prev) => ({
      ...prev,
      [updated.id]: updated.verificationNote,
    }))
    router.refresh()
  }
  const [authors, setAuthors] = useState<Option[]>([])
  const [categories, setCategories] = useState<Option[]>(categoryOptions)
  const [sources, setSources] = useState<Option[]>([])
  const [tags, setTags] = useState<TagOption[]>([])
  const [authorId, setAuthorId] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [sourceId, setSourceId] = useState("")
  const [tagIds, setTagIds] = useState<string[]>([])
  const [search, setSearch] = useState(initialSearch)
  const [prevInitialSearch, setPrevInitialSearch] = useState(initialSearch)
  if (prevInitialSearch !== initialSearch) {
    setPrevInitialSearch(initialSearch)
    setSearch(initialSearch)
  }

  const [sortBy, setSortBy] = useState<SortOption>(initialSort)
  const [prevInitialSort, setPrevInitialSort] = useState(initialSort)
  if (prevInitialSort !== initialSort) {
    setPrevInitialSort(initialSort)
    setSortBy(initialSort)
  }

  const resolvedInitialCategory = useMemo(() => {
    if (!initialCategory || initialCategory === "all") return "all"
    const match = categoryOptions.find(
      (c) => c.slug === initialCategory || c.id === initialCategory
    )
    return match ? match.slug : initialCategory
  }, [initialCategory, categoryOptions])

  const [categoryFilter, setCategoryFilter] = useState(resolvedInitialCategory)
  const [prevInitialCategory, setPrevInitialCategory] = useState(resolvedInitialCategory)
  if (prevInitialCategory !== resolvedInitialCategory) {
    setPrevInitialCategory(resolvedInitialCategory)
    setCategoryFilter(resolvedInitialCategory)
  }

  const [authorFilter, setAuthorFilter] = useState(initialAuthor)
  const [prevInitialAuthor, setPrevInitialAuthor] = useState(initialAuthor)
  if (prevInitialAuthor !== initialAuthor) {
    setPrevInitialAuthor(initialAuthor)
    setAuthorFilter(initialAuthor)
  }

  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [prevInitialStatus, setPrevInitialStatus] = useState(initialStatus)
  if (prevInitialStatus !== initialStatus) {
    setPrevInitialStatus(initialStatus)
    setStatusFilter(initialStatus)
  }

  const [verifiedFilter, setVerifiedFilter] = useState(initialVerified)
  const [prevInitialVerified, setPrevInitialVerified] = useState(initialVerified)
  if (prevInitialVerified !== initialVerified) {
    setPrevInitialVerified(initialVerified)
    setVerifiedFilter(initialVerified)
  }

  const [attributionFilter, setAttributionFilter] = useState(initialAttribution)
  const [prevInitialAttribution, setPrevInitialAttribution] = useState(initialAttribution)
  if (prevInitialAttribution !== initialAttribution) {
    setPrevInitialAttribution(initialAttribution)
    setAttributionFilter(initialAttribution)
  }

  const [tagFilter, setTagFilter] = useState(initialTag)
  const [prevInitialTag, setPrevInitialTag] = useState(initialTag)
  if (prevInitialTag !== initialTag) {
    setPrevInitialTag(initialTag)
    setTagFilter(initialTag)
  }

  const [sourceFilter, setSourceFilter] = useState(initialSource)
  const [prevInitialSource, setPrevInitialSource] = useState(initialSource)
  if (prevInitialSource !== initialSource) {
    setPrevInitialSource(initialSource)
    setSourceFilter(initialSource)
  }

  const [isLoadingOptions, setIsLoadingOptions] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (search.trim() === initialSearch.trim()) return

    const timer = setTimeout(() => {
      const href = buildQuotesListHref(
        activeFilter,
        1,
        search.trim(),
        sortBy,
        categoryFilter,
        authorFilter,
        statusFilter,
        verifiedFilter,
        attributionFilter,
        tagFilter,
        sourceFilter
      )
      router.push(href)
    }, 350)

    return () => clearTimeout(timer)
  }, [
    search,
    activeFilter,
    initialSearch,
    sortBy,
    categoryFilter,
    authorFilter,
    statusFilter,
    verifiedFilter,
    attributionFilter,
    tagFilter,
    sourceFilter,
    router,
  ])

  const selectedTagNames = useMemo(
    () => tags.filter((tag) => tagIds.includes(tag.id)).map((tag) => tag.name),
    [tagIds, tags]
  )

  const isSearchSynched = search.trim().toLowerCase() === initialSearch.trim().toLowerCase()

  const visibleQuotes = useMemo(() => {
    const needle = !isSearchSynched ? search.trim().toLowerCase() : ""
    if (!needle) return quotes

    return quotes.filter((quote) =>
      [quote.content, quote.authorName ?? "", quote.categoryName ?? "", quote.sourceTitle ?? "", quote.status]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    )
  }, [quotes, search, isSearchSynched])

  const allSelected =
    visibleQuotes.length > 0 &&
    visibleQuotes.every((quote) => selectedIds.includes(quote.id))
  const selectedCount = selectedIds.length

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const effectiveTotal = isSearchSynched ? total : visibleQuotes.length
  const effectiveTotalPages = isSearchSynched
    ? totalPages
    : Math.max(1, Math.ceil(visibleQuotes.length / pageSize))

  async function ensureOptions(nextAction: BulkActionType) {
    if (isLoadingOptions) return

    if (nextAction === "setAuthor" && authors.length > 0) return
    if (nextAction === "setCategory" && categories.length > 0) return
    if (nextAction === "setSource" && sources.length > 0) return
    if ((nextAction === "addTags" || nextAction === "removeTags") && tags.length > 0) return

    setIsLoadingOptions(true)
    try {
      if (nextAction === "setAuthor") {
        const res = await fetch("/api/admin/authors?select=minimal")
        if (!res.ok) throw new Error("Failed to load authors")
        setAuthors(await res.json())
      } else if (nextAction === "setCategory") {
        const res = await fetch("/api/admin/categories?select=minimal")
        if (!res.ok) throw new Error("Failed to load categories")
        setCategories(await res.json())
      } else if (nextAction === "setSource") {
        const res = await fetch("/api/admin/sources?select=minimal")
        if (!res.ok) throw new Error("Failed to load sources")
        setSources(await res.json())
      } else {
        const res = await fetch("/api/admin/tags?select=minimal")
        if (!res.ok) throw new Error("Failed to load tags")
        setTags(await res.json())
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load options")
    } finally {
      setIsLoadingOptions(false)
    }
  }

  function onToggleSelect(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]))
  }

  function onToggleSelectAll() {
    if (allSelected) {
      const visibleIds = visibleQuotes.map((quote) => quote.id)
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)))
      return
    }
    setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleQuotes.map((quote) => quote.id)])))
  }

  async function applyBulkAction() {
    if (selectedCount === 0) return
    setError("")

    if (action === "setAuthor" && !authorId) {
      setError("Select an author.")
      return
    }
    if (action === "setCategory" && !categoryId) {
      setError("Select a category.")
      return
    }
    if (action === "setSource" && !sourceId) {
      setError("Select a source.")
      return
    }
    if ((action === "addTags" || action === "removeTags") && tagIds.length === 0) {
      setError("Select at least one tag.")
      return
    }

    setIsApplying(true)
    try {
      const res = await fetch("/api/admin/quotes/bulk-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteIds: selectedIds,
          action,
          authorId: action === "setAuthor" ? authorId : undefined,
          categoryId: action === "setCategory" ? categoryId : undefined,
          sourceId: action === "setSource" ? sourceId : undefined,
          tagIds: action === "addTags" || action === "removeTags" ? tagIds : undefined,
          status: action === "setStatus" ? statusValue : undefined,
          isVerified: action === "setVerification" ? verificationValue : undefined,
          attributionStatus: action === "setAttribution" ? attributionValue : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Bulk update failed")
      }

      if (action === "setStatus") {
        setStatusOverrides((prev) => {
          const next = { ...prev }
          for (const id of selectedIds) {
            next[id] = statusValue
          }
          return next
        })
      }

      if (action === "setVerification") {
        setVerificationOverrides((prev) => {
          const next = { ...prev }
          for (const id of selectedIds) {
            next[id] = verificationValue
          }
          return next
        })
      }

      setSelectedIds([])
      setAuthorId("")
      setCategoryId("")
      setSourceId("")
      setTagIds([])
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bulk update failed")
    } finally {
      setIsApplying(false)
    }
  }

  async function toggleQuoteStatus(quoteId: string, currentStatus: string) {
    const nextStatus = currentStatus === "PUBLISHED" ? "DRAFT" : "PUBLISHED"
    setError("")
    setTogglingStatusId(quoteId)
    setStatusOverrides((prev) => ({ ...prev, [quoteId]: nextStatus }))

    try {
      const res = await fetch("/api/admin/quotes/bulk-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteIds: [quoteId],
          action: "setStatus",
          status: nextStatus,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to update quote status")
      }

      router.refresh()
    } catch (err: unknown) {
      setStatusOverrides((prev) => {
        const copy = { ...prev }
        delete copy[quoteId]
        return copy
      })
      setError(err instanceof Error ? err.message : "Failed to toggle status")
    } finally {
      setTogglingStatusId(null)
    }
  }

  async function toggleQuoteVerification(quoteId: string, currentVerified: boolean) {
    const nextVerified = !currentVerified
    setError("")
    setTogglingVerificationId(quoteId)
    setVerificationOverrides((prev) => ({ ...prev, [quoteId]: nextVerified }))

    try {
      const res = await fetch("/api/admin/quotes/bulk-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteIds: [quoteId],
          action: "setVerification",
          isVerified: nextVerified,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to update verification status")
      }

      router.refresh()
    } catch (err: unknown) {
      setVerificationOverrides((prev) => {
        const copy = { ...prev }
        delete copy[quoteId]
        return copy
      })
      setError(err instanceof Error ? err.message : "Failed to toggle verification")
    } finally {
      setTogglingVerificationId(null)
    }
  }

  async function executeDeleteQuote(id: string) {
    setDeletingId(id)
    setError("")

    try {
      const res = await fetch(`/api/admin/quotes/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to delete quote")
      }

      setSelectedIds((prev) => prev.filter((entry) => entry !== id))
      setPendingDeleteId(null)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete quote")
    } finally {
      setDeletingId(null)
    }
  }

  function handleSortChange(nextSort: SortOption) {
    setSortBy(nextSort)
    router.push(
      buildQuotesListHref(
        activeFilter,
        1,
        search.trim(),
        nextSort,
        categoryFilter,
        authorFilter,
        statusFilter,
        verifiedFilter,
        attributionFilter,
        tagFilter,
        sourceFilter
      )
    )
  }

  function handleCategoryChange(nextCategory: string) {
    setCategoryFilter(nextCategory)
    router.push(
      buildQuotesListHref(
        activeFilter,
        1,
        search.trim(),
        sortBy,
        nextCategory,
        authorFilter,
        statusFilter,
        verifiedFilter,
        attributionFilter,
        tagFilter,
        sourceFilter
      )
    )
  }

  function handleAuthorFilter(authorSlugOrId: string) {
    setAuthorFilter(authorSlugOrId)
    router.push(
      buildQuotesListHref(
        activeFilter,
        1,
        search.trim(),
        sortBy,
        categoryFilter,
        authorSlugOrId,
        statusFilter,
        verifiedFilter,
        attributionFilter,
        tagFilter,
        sourceFilter
      )
    )
  }

  function handleClearAuthorFilter() {
    setAuthorFilter("")
    router.push(
      buildQuotesListHref(
        activeFilter,
        1,
        search.trim(),
        sortBy,
        categoryFilter,
        "",
        statusFilter,
        verifiedFilter,
        attributionFilter,
        tagFilter,
        sourceFilter
      )
    )
  }

  function handleStatusChange(nextStatus: string) {
    setStatusFilter(nextStatus)
    router.push(
      buildQuotesListHref(
        activeFilter,
        1,
        search.trim(),
        sortBy,
        categoryFilter,
        authorFilter,
        nextStatus,
        verifiedFilter,
        attributionFilter,
        tagFilter,
        sourceFilter
      )
    )
  }

  function handleVerifiedChange(nextVerified: string) {
    setVerifiedFilter(nextVerified)
    router.push(
      buildQuotesListHref(
        activeFilter,
        1,
        search.trim(),
        sortBy,
        categoryFilter,
        authorFilter,
        statusFilter,
        nextVerified,
        attributionFilter,
        tagFilter,
        sourceFilter
      )
    )
  }

  function handleAttributionChange(nextAttribution: string) {
    setAttributionFilter(nextAttribution)
    router.push(
      buildQuotesListHref(
        activeFilter,
        1,
        search.trim(),
        sortBy,
        categoryFilter,
        authorFilter,
        statusFilter,
        verifiedFilter,
        nextAttribution,
        tagFilter,
        sourceFilter
      )
    )
  }

  function handleTagFilter(tagSlugOrId: string) {
    setTagFilter(tagSlugOrId)
    router.push(
      buildQuotesListHref(
        activeFilter,
        1,
        search.trim(),
        sortBy,
        categoryFilter,
        authorFilter,
        statusFilter,
        verifiedFilter,
        attributionFilter,
        tagSlugOrId,
        sourceFilter
      )
    )
  }

  function handleClearTagFilter() {
    setTagFilter("")
    router.push(
      buildQuotesListHref(
        activeFilter,
        1,
        search.trim(),
        sortBy,
        categoryFilter,
        authorFilter,
        statusFilter,
        verifiedFilter,
        attributionFilter,
        "",
        sourceFilter
      )
    )
  }

  function handleSourceFilter(sourceSlugOrId: string) {
    setSourceFilter(sourceSlugOrId)
    router.push(
      buildQuotesListHref(
        activeFilter,
        1,
        search.trim(),
        sortBy,
        categoryFilter,
        authorFilter,
        statusFilter,
        verifiedFilter,
        attributionFilter,
        tagFilter,
        sourceSlugOrId
      )
    )
  }

  function handleClearSourceFilter() {
    setSourceFilter("")
    router.push(
      buildQuotesListHref(
        activeFilter,
        1,
        search.trim(),
        sortBy,
        categoryFilter,
        authorFilter,
        statusFilter,
        verifiedFilter,
        attributionFilter,
        tagFilter,
        ""
      )
    )
  }

  function handleClearFilters() {
    setSearch("")
    setSortBy("newest")
    setCategoryFilter("all")
    setAuthorFilter("")
    setStatusFilter("all")
    setVerifiedFilter("all")
    setAttributionFilter("all")
    setTagFilter("")
    setSourceFilter("")
    if (
      initialSearch.trim() ||
      initialSort !== "newest" ||
      resolvedInitialCategory !== "all" ||
      initialAuthor ||
      initialStatus !== "all" ||
      initialVerified !== "all" ||
      initialAttribution !== "all" ||
      initialTag ||
      initialSource
    ) {
      router.push(buildQuotesListHref(activeFilter, 1, "", "newest", "all", "", "all", "all", "all", "", ""))
    }
  }

  const hasActiveFilters =
    search.trim().length > 0 ||
    sortBy !== "newest" ||
    categoryFilter !== "all" ||
    Boolean(authorFilter && authorFilter !== "all") ||
    statusFilter !== "all" ||
    verifiedFilter !== "all" ||
    attributionFilter !== "all" ||
    Boolean(tagFilter && tagFilter !== "all") ||
    Boolean(sourceFilter && sourceFilter !== "all")

  const activeFiltersBannerList = [
    authorFilter
      ? { label: "Author", value: initialAuthorName || authorFilter, onClear: handleClearAuthorFilter }
      : null,
    categoryFilter && categoryFilter !== "all"
      ? {
          label: "Category",
          value:
            categoryOptions.find((c) => c.slug === categoryFilter || c.id === categoryFilter)?.name ||
            categoryFilter,
          onClear: () => handleCategoryChange("all"),
        }
      : null,
    attributionFilter && attributionFilter !== "all"
      ? {
          label: "Attribution",
          value: attributionFilter,
          onClear: () => handleAttributionChange("all"),
        }
      : null,
    tagFilter && tagFilter !== "all"
      ? {
          label: "Tag",
          value: initialTagName ? `#${initialTagName}` : `#${tagFilter}`,
          onClear: handleClearTagFilter,
        }
      : null,
    sourceFilter && sourceFilter !== "all"
      ? {
          label: "Source",
          value: initialSourceTitle || sourceFilter,
          onClear: handleClearSourceFilter,
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string; onClear: () => void }>

  return (
    <div className="space-y-4">
      {activeFiltersBannerList.length > 0 ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-stone-200/90 bg-stone-50/90 px-3.5 py-2 text-xs text-stone-800">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {activeFiltersBannerList.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className="font-semibold text-stone-600">Filtered by {item.label}:</span>
                <span className="font-bold text-stone-900">{item.value}</span>
                <button
                  type="button"
                  onClick={item.onClear}
                  className="ml-1 text-stone-500 hover:text-stone-900 cursor-pointer font-bold text-xs"
                  title={`Clear ${item.label.toLowerCase()} filter`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {activeFiltersBannerList.length > 1 ? (
              <button
                type="button"
                onClick={() => {
                  setAuthorFilter("")
                  setCategoryFilter("all")
                  setStatusFilter("all")
                  setVerifiedFilter("all")
                  setAttributionFilter("all")
                  setTagFilter("")
                  setSourceFilter("")
                  router.push(
                    buildQuotesListHref(
                      activeFilter,
                      1,
                      search.trim(),
                      sortBy,
                      "all",
                      "",
                      "all",
                      "all",
                      "all",
                      "",
                      ""
                    )
                  )
                }}
                className="text-stone-600 hover:text-stone-900 underline font-medium cursor-pointer"
              >
                Clear all active filters ✕
              </button>
            ) : (
              <button
                type="button"
                onClick={activeFiltersBannerList[0].onClear}
                className="text-stone-600 hover:text-stone-900 underline font-medium cursor-pointer"
              >
                Clear {activeFiltersBannerList[0].label} Filter ✕
              </button>
            )}
          </div>
        </div>
      ) : null}

      <FilterToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search quotes by text, author, source, or status"
        sortValue={sortBy}
        onSortChange={(value) => handleSortChange(value as SortOption)}
        sortOptions={sortOptions}
        filters={
          <>
            {categoryOptions.length > 0 && (
              <Select
                value={categoryFilter}
                onChange={(event) => handleCategoryChange(event.target.value)}
                options={[
                  { value: "all", label: "Category: All Categories" },
                  ...categoryOptions.map((cat) => ({
                    value: cat.slug,
                    label: `Category: ${cat.name}`,
                  })),
                ]}
              />
            )}
            <Select
              value={statusFilter}
              onChange={(event) => handleStatusChange(event.target.value)}
              options={[
                { value: "all", label: "Status: All Statuses" },
                { value: "PUBLISHED", label: "Status: Published" },
                { value: "DRAFT", label: "Status: Draft" },
                { value: "REVIEW", label: "Status: Review" },
                { value: "ARCHIVED", label: "Status: Archived" },
              ]}
            />
            <Select
              value={verifiedFilter}
              onChange={(event) => handleVerifiedChange(event.target.value)}
              options={[
                { value: "all", label: "Verification: All" },
                { value: "verified", label: "Verification: Verified Only" },
                { value: "unverified", label: "Verification: Unverified Only" },
              ]}
            />
            <Select
              value={attributionFilter}
              onChange={(event) => handleAttributionChange(event.target.value)}
              options={[
                { value: "all", label: "Attribution: All" },
                { value: "CONFIRMED", label: "Attribution: Confirmed" },
                { value: "DISPUTED", label: "Attribution: Disputed" },
                { value: "MISATTRIBUTED", label: "Attribution: Misattributed" },
                { value: "UNKNOWN", label: "Attribution: Unknown" },
              ]}
            />
          </>
        }
        visibleCount={visibleQuotes.length}
        totalCount={effectiveTotal}
        itemLabel={`quotes${search.trim() ? " found" : ` on page${activeFilterLabel !== "All Quotes" ? ` (${activeFilterLabel})` : ""}`}`}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
      />

      {selectedCount > 0 ? (
        <div className="sticky top-2 z-20 rounded-2xl border border-stone-200/90 bg-white/95 p-4 shadow-md backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-stone-900">{selectedCount} quotes selected</span>
            <div className="flex items-center gap-2">
              <a
                href={`/api/admin/quotes/export?format=csv&ids=${selectedIds.join(",")}`}
                download
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg transition"
                title="Download selected quotes as CSV"
              >
                Export CSV ({selectedCount})
              </a>
              <a
                href={`/api/admin/quotes/export?format=json&ids=${selectedIds.join(",")}`}
                download
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg transition"
                title="Download selected quotes as JSON"
              >
                Export JSON
              </a>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-xs text-stone-500 hover:text-stone-900 cursor-pointer ml-1"
              >
                Clear selection
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5 items-center">
            <select
              className="border border-stone-300 rounded-xl px-3 py-1.5 text-sm bg-white font-medium"
              value={action}
              onChange={(event) => {
                const next = event.target.value as BulkActionType
                setAction(next)
                setError("")
                ensureOptions(next)
              }}
            >
              <option value="setStatus">Set Status</option>
              <option value="setVerification">Set Verification</option>
              <option value="setAttribution">Set Attribution</option>
              <option value="setCategory">Set Category</option>
              <option value="setAuthor">Set Author</option>
              <option value="setSource">Set Source</option>
              <option value="clearSource">Clear Source</option>
              <option value="addTags">Add Tags</option>
              <option value="removeTags">Remove Tags</option>
            </select>

            {action === "setStatus" ? (
              <select
                className="border border-stone-300 rounded-xl px-3 py-1.5 text-sm bg-white min-w-[200px]"
                value={statusValue}
                onChange={(event) => setStatusValue(event.target.value as "PUBLISHED" | "DRAFT" | "ARCHIVED")}
              >
                <option value="PUBLISHED">Status: Published</option>
                <option value="DRAFT">Status: Draft</option>
                <option value="ARCHIVED">Status: Archived</option>
              </select>
            ) : null}

            {action === "setVerification" ? (
              <select
                className="border border-stone-300 rounded-xl px-3 py-1.5 text-sm bg-white min-w-[200px]"
                value={verificationValue ? "true" : "false"}
                onChange={(event) => setVerificationValue(event.target.value === "true")}
              >
                <option value="true">Verification: Mark Verified</option>
                <option value="false">Verification: Mark Unverified</option>
              </select>
            ) : null}

            {action === "setAttribution" ? (
              <select
                className="border border-stone-300 rounded-xl px-3 py-1.5 text-sm bg-white min-w-[200px]"
                value={attributionValue}
                onChange={(event) =>
                  setAttributionValue(
                    event.target.value as "CONFIRMED" | "DISPUTED" | "MISATTRIBUTED" | "UNKNOWN"
                  )
                }
              >
                <option value="CONFIRMED">Attribution: Confirmed</option>
                <option value="DISPUTED">Attribution: Disputed</option>
                <option value="MISATTRIBUTED">Attribution: Misattributed</option>
                <option value="UNKNOWN">Attribution: Unknown</option>
              </select>
            ) : null}

            {action === "setCategory" ? (
              <select
                className="border rounded px-2 py-1 text-sm min-w-[220px]"
                value={categoryId}
                onFocus={() => ensureOptions("setCategory")}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                <option value="">Select Category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            ) : null}

            {action === "setAuthor" ? (
              <select
                className="border rounded px-2 py-1 text-sm min-w-[220px]"
                value={authorId}
                onFocus={() => ensureOptions("setAuthor")}
                onChange={(event) => setAuthorId(event.target.value)}
              >
                <option value="">Select Author</option>
                {authors.map((author) => (
                  <option key={author.id} value={author.id}>
                    {author.name}
                  </option>
                ))}
              </select>
            ) : null}

            {action === "setSource" ? (
              <select
                className="border rounded px-2 py-1 text-sm min-w-[220px]"
                value={sourceId}
                onFocus={() => ensureOptions("setSource")}
                onChange={(event) => setSourceId(event.target.value)}
              >
                <option value="">Select Source</option>
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.title}
                  </option>
                ))}
              </select>
            ) : null}

            {action === "addTags" || action === "removeTags" ? (
              <div className="flex flex-wrap gap-2 items-center">
                <select
                  className="border rounded px-2 py-1 text-sm min-w-[220px]"
                  onFocus={() => ensureOptions("addTags")}
                  onChange={(event) => {
                    const nextId = event.target.value
                    if (!nextId || tagIds.includes(nextId)) return
                    setTagIds((prev) => [...prev, nextId])
                  }}
                  value=""
                >
                  <option value="">Add Tag</option>
                  {tags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
                {selectedTagNames.map((tagName) => (
                  <span key={tagName} className="border rounded-full px-2 py-1 text-xs bg-white">
                    {tagName}
                  </span>
                ))}
              </div>
            ) : null}

            <button
              type="button"
              className="bg-black text-white rounded px-3 py-1 text-sm disabled:opacity-50"
              disabled={isApplying || isLoadingOptions}
              onClick={applyBulkAction}
            >
              {isApplying ? "Applying..." : "Apply"}
            </button>
          </div>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>
      ) : null}

      {quotes.length === 0 ? (
        <EmptyState
          title={search.trim() ? "No quotes match your search" : "No quotes found"}
          description={
            search.trim()
              ? `No matching quotes were found for "${search}".`
              : `No quotes were found for ${activeFilterLabel}.`
          }
          action={search.trim() ? { label: "Clear search", onClick: handleClearFilters } : undefined}
        />
      ) : null}

      <div className="space-y-2">
        {visibleQuotes.length > 0 ? (
          <label className="inline-flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={allSelected} onChange={onToggleSelectAll} />
            Select all on page
          </label>
        ) : null}

        {quotes.length > 0 && visibleQuotes.length === 0 ? (
          <EmptyState
            title="No quotes match your search"
            description={`No matching quotes were found on this page for "${search}".`}
            action={{ label: "Clear search", onClick: handleClearFilters }}
          />
        ) : null}

        {visibleQuotes.map((quote) => {
          const effectiveStatus = statusOverrides[quote.id] ?? quote.status
          const effectiveVerified = verificationOverrides[quote.id] ?? quote.isVerified
          const effectiveAttribution = attributionOverrides[quote.id] ?? quote.attributionStatus ?? "UNKNOWN"
          const effectiveVerificationNote =
            verificationNoteOverrides[quote.id] !== undefined
              ? verificationNoteOverrides[quote.id]
              : quote.verificationNote ?? null
          const isTogglingStatus = togglingStatusId === quote.id
          const isTogglingVerification = togglingVerificationId === quote.id
          const isPublished = effectiveStatus === "PUBLISHED"
          const effectiveMeaning = contextOverrides[quote.id]?.meaning ?? quote.meaning ?? null
          const effectiveHistoricalContext =
            contextOverrides[quote.id]?.historicalContext ?? quote.historicalContext ?? null
          const effectiveModernRelevance =
            contextOverrides[quote.id]?.modernRelevance ?? quote.modernRelevance ?? null
          const effectiveHasContext =
            contextOverrides[quote.id] !== undefined
              ? contextOverrides[quote.id].hasContext
              : quote.hasContext

          return (
            <AdminEntityCard
              key={quote.id}
              href={`/admin/quotes/${quote.id}`}
              selected={selectedIds.includes(quote.id)}
              onSelect={() => onToggleSelect(quote.id)}
              title={
                <span className="font-serif italic font-normal text-stone-900 group-hover:text-black line-clamp-2 text-base leading-snug">
                  “{quote.content}”
                </span>
              }
              subtitle={
                <span className="flex items-center flex-wrap gap-1.5 text-xs text-stone-600 mt-1">
                  <span
                    role="button"
                    tabIndex={quote.authorSlug || quote.authorId ? 0 : undefined}
                    onClick={(e) => {
                      if (quote.authorSlug || quote.authorId) {
                        e.preventDefault()
                        e.stopPropagation()
                        handleAuthorFilter(quote.authorSlug || quote.authorId || "")
                      }
                    }}
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === " ") && (quote.authorSlug || quote.authorId)) {
                        e.preventDefault()
                        e.stopPropagation()
                        handleAuthorFilter(quote.authorSlug || quote.authorId || "")
                      }
                    }}
                    title={
                      quote.authorSlug || quote.authorId
                        ? `Click to filter quotes by ${quote.authorName}`
                        : undefined
                    }
                    className={`font-medium ${
                      quote.authorSlug || quote.authorId
                        ? "text-stone-800 hover:text-black hover:underline cursor-pointer"
                        : "text-stone-600"
                    }`}
                  >
                    {quote.authorName ?? "Unknown Author"}
                  </span>
                  {quote.categoryName ? (
                    <>
                      <span className="text-stone-300">•</span>
                      <span
                        role={quote.categorySlug ? "button" : undefined}
                        tabIndex={quote.categorySlug ? 0 : undefined}
                        onClick={(e) => {
                          if (quote.categorySlug) {
                            e.preventDefault()
                            e.stopPropagation()
                            handleCategoryChange(quote.categorySlug)
                          }
                        }}
                        onKeyDown={(e) => {
                          if ((e.key === "Enter" || e.key === " ") && quote.categorySlug) {
                            e.preventDefault()
                            e.stopPropagation()
                            handleCategoryChange(quote.categorySlug)
                          }
                        }}
                        title={
                          quote.categorySlug
                            ? `Click to filter quotes by category: ${quote.categoryName}`
                            : undefined
                        }
                        className={`font-medium ${
                          quote.categorySlug
                            ? "text-stone-700 hover:text-black hover:underline cursor-pointer"
                            : "text-stone-600"
                        }`}
                      >
                        {quote.categoryName}
                      </span>
                    </>
                  ) : null}
                  {quote.sourceTitle ? (
                    <>
                      <span className="text-stone-300">•</span>
                      <span
                        role={quote.sourceSlug || quote.sourceId ? "button" : undefined}
                        tabIndex={quote.sourceSlug || quote.sourceId ? 0 : undefined}
                        onClick={(e) => {
                          if (quote.sourceSlug || quote.sourceId) {
                            e.preventDefault()
                            e.stopPropagation()
                            handleSourceFilter(quote.sourceSlug || quote.sourceId || "")
                          }
                        }}
                        onKeyDown={(e) => {
                          if ((e.key === "Enter" || e.key === " ") && (quote.sourceSlug || quote.sourceId)) {
                            e.preventDefault()
                            e.stopPropagation()
                            handleSourceFilter(quote.sourceSlug || quote.sourceId || "")
                          }
                        }}
                        title={
                          quote.sourceSlug || quote.sourceId
                            ? `Click to filter quotes from source: ${quote.sourceTitle}`
                            : undefined
                        }
                        className={`italic truncate max-w-[260px] ${
                          quote.sourceSlug || quote.sourceId
                            ? "text-stone-700 hover:text-black hover:underline cursor-pointer font-medium"
                            : "text-stone-500"
                        }`}
                      >
                        {quote.sourceTitle}
                      </span>
                    </>
                  ) : null}
                </span>
              }
              badge={
                <Badge
                  variant={
                    isPublished
                      ? "success"
                      : effectiveStatus === "ARCHIVED"
                        ? "dark"
                        : "warm"
                  }
                  size="xs"
                  dot
                >
                  {effectiveStatus}
                </Badge>
              }
              meta={
                <>
                  {effectiveVerified ? (
                    <Badge variant="success" size="xs" dot>
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="warning" size="xs">
                      Unverified
                    </Badge>
                  )}
                  {quote.categoryName ? (
                    <span
                      role={quote.categorySlug ? "button" : undefined}
                      tabIndex={quote.categorySlug ? 0 : undefined}
                      onClick={(e) => {
                        if (quote.categorySlug) {
                          e.preventDefault()
                          e.stopPropagation()
                          handleCategoryChange(quote.categorySlug)
                        }
                      }}
                      onKeyDown={(e) => {
                        if ((e.key === "Enter" || e.key === " ") && quote.categorySlug) {
                          e.preventDefault()
                          e.stopPropagation()
                          handleCategoryChange(quote.categorySlug)
                        }
                      }}
                      title={
                        quote.categorySlug
                          ? `Click to filter quotes by category: ${quote.categoryName}`
                          : undefined
                      }
                      className={quote.categorySlug ? "cursor-pointer inline-flex" : undefined}
                    >
                      <Badge
                        variant="outline"
                        size="xs"
                        className={`font-sans font-medium text-stone-700 bg-stone-50 border-stone-200/90 transition-colors ${
                          quote.categorySlug
                            ? "hover:bg-stone-100 hover:text-black hover:border-stone-400"
                            : ""
                        }`}
                      >
                        {quote.categoryName}
                      </Badge>
                    </span>
                  ) : (
                    <Badge variant="danger" size="xs">
                      Missing category
                    </Badge>
                  )}
                  {!quote.hasAuthor && (
                    <Badge variant="danger" size="xs">
                      Missing author
                    </Badge>
                  )}
                  {!quote.hasSource && (
                    <Badge variant="warning" size="xs">
                      Missing source
                    </Badge>
                  )}
                  {quote.tags && quote.tags.length > 0 ? (
                    quote.tags.map((tag) => (
                      <span
                        key={tag.id}
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleTagFilter(tag.slug)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            e.stopPropagation()
                            handleTagFilter(tag.slug)
                          }
                        }}
                        title={`Click to filter quotes tagged with #${tag.name}`}
                        className="cursor-pointer inline-flex"
                      >
                        <Badge
                          variant="outline"
                          size="xs"
                          className="font-sans font-medium text-stone-600 bg-stone-50/90 border-stone-200/90 hover:bg-stone-100 hover:text-black hover:border-stone-400 transition-colors"
                        >
                          #{tag.name}
                        </Badge>
                      </span>
                    ))
                  ) : (
                    <Badge variant="neutral" size="xs">
                      Missing tags
                    </Badge>
                  )}
                  {quote.isFeatured && (
                    <Badge variant="gold" size="xs">
                      ★ Featured
                    </Badge>
                  )}
                  {quote.attributionStatus === "DISPUTED" && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleAttributionChange("DISPUTED")
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          e.stopPropagation()
                          handleAttributionChange("DISPUTED")
                        }
                      }}
                      title="Click to filter quotes with Disputed attribution"
                      className="cursor-pointer inline-flex"
                    >
                      <Badge variant="danger" size="xs" className="hover:opacity-80 transition cursor-pointer">
                        Disputed
                      </Badge>
                    </span>
                  )}
                  {quote.attributionStatus === "MISATTRIBUTED" && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleAttributionChange("MISATTRIBUTED")
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          e.stopPropagation()
                          handleAttributionChange("MISATTRIBUTED")
                        }
                      }}
                      title="Click to filter quotes with Misattributed attribution"
                      className="cursor-pointer inline-flex"
                    >
                      <Badge variant="danger" size="xs" className="hover:opacity-80 transition cursor-pointer">
                        Misattributed
                      </Badge>
                    </span>
                  )}
                  {effectiveHasContext === true && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setEditingContextQuote({
                          id: quote.id,
                          content: quote.content,
                          authorName: quote.authorName,
                          categoryName: quote.categoryName,
                          meaning: effectiveMeaning,
                          historicalContext: effectiveHistoricalContext,
                          modernRelevance: effectiveModernRelevance,
                        })
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          e.stopPropagation()
                          setEditingContextQuote({
                            id: quote.id,
                            content: quote.content,
                            authorName: quote.authorName,
                            categoryName: quote.categoryName,
                            meaning: effectiveMeaning,
                            historicalContext: effectiveHistoricalContext,
                            modernRelevance: effectiveModernRelevance,
                          })
                        }
                      }}
                      title="Click to view and edit quote meaning & context"
                      className="cursor-pointer inline-flex"
                    >
                      <Badge
                        variant="outline"
                        size="xs"
                        className="font-sans font-medium text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 transition cursor-pointer"
                      >
                        Has context ✎
                      </Badge>
                    </span>
                  )}
                  {effectiveHasContext === false && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setEditingContextQuote({
                          id: quote.id,
                          content: quote.content,
                          authorName: quote.authorName,
                          categoryName: quote.categoryName,
                          meaning: effectiveMeaning,
                          historicalContext: effectiveHistoricalContext,
                          modernRelevance: effectiveModernRelevance,
                        })
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          e.stopPropagation()
                          setEditingContextQuote({
                            id: quote.id,
                            content: quote.content,
                            authorName: quote.authorName,
                            categoryName: quote.categoryName,
                            meaning: effectiveMeaning,
                            historicalContext: effectiveHistoricalContext,
                            modernRelevance: effectiveModernRelevance,
                          })
                        }
                      }}
                      title="Click to enrich quote meaning & context"
                      className="cursor-pointer inline-flex"
                    >
                      <Badge
                        variant="neutral"
                        size="xs"
                        className="hover:border-stone-400 hover:bg-stone-200/60 transition cursor-pointer"
                      >
                        No context +
                      </Badge>
                    </span>
                  )}
                  <span className="text-[11px] text-stone-400">
                    {quote.publishedAt
                      ? `Published ${formatDateTimeInAppTimeZone(quote.publishedAt)}`
                      : `Created ${formatDateTimeInAppTimeZone(quote.createdAt)}`}
                  </span>
                </>
              }
              actions={
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setEditingContextQuote({
                        id: quote.id,
                        content: quote.content,
                        authorName: quote.authorName,
                        categoryName: quote.categoryName,
                        meaning: effectiveMeaning,
                        historicalContext: effectiveHistoricalContext,
                        modernRelevance: effectiveModernRelevance,
                      })
                    }}
                    title="Quick edit quote meaning, historical context, and modern relevance"
                    className="text-stone-700 hover:text-stone-900 border-stone-200 hover:bg-stone-100"
                  >
                    Context
                  </Button>
                  <Button
                    type="button"
                    variant={effectiveVerified ? "ghost" : "outline"}
                    size="xs"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setVerifyingQuote({
                        id: quote.id,
                        content: quote.content,
                        authorName: quote.authorName,
                        sourceTitle: quote.sourceTitle,
                        categoryName: quote.categoryName,
                        isVerified: effectiveVerified,
                        attributionStatus: effectiveAttribution,
                        verificationNote: effectiveVerificationNote,
                        verificationConfidence: quote.verificationConfidence,
                      })
                    }}
                    title={
                      effectiveVerified
                        ? "Scholarly verified. Click to inspect, review, or update citations with AI."
                        : "Click to run AI fact-check, determine attribution, and verify primary sources."
                    }
                    className={
                      effectiveVerified
                        ? "text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border border-emerald-200/80 cursor-pointer"
                        : "text-amber-800 border-amber-300 bg-amber-50/60 hover:bg-amber-100/80 cursor-pointer font-medium"
                    }
                  >
                    {effectiveVerified ? "✓ Verified" : "✨ Verify"}
                  </Button>
                  <Button
                    type="button"
                    variant={isPublished ? "outline" : "primary"}
                    size="xs"
                    disabled={isTogglingStatus}
                    isLoading={isTogglingStatus}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      toggleQuoteStatus(quote.id, effectiveStatus)
                    }}
                    title={isPublished ? "Click to unpublish and move to Draft" : "Click to publish quote immediately"}
                  >
                    {isPublished ? "Unpublish" : "Publish"}
                  </Button>
                  <Button
                    href={`/admin/quotes/${quote.id}`}
                    variant="ghost"
                    size="xs"
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="xs"
                    disabled={deletingId === quote.id}
                    isLoading={deletingId === quote.id}
                    onClick={() => setPendingDeleteId(quote.id)}
                  >
                    Delete
                  </Button>
                </div>
              }
            />
          )
        })}
      </div>

      {effectiveTotalPages > 1 ? (
        <div className="pt-2">
          <Pagination
            currentPage={page}
            totalPages={effectiveTotalPages}
            totalItems={effectiveTotal}
            pageSize={pageSize}
            buildHref={(targetPage) =>
              buildQuotesListHref(
                activeFilter,
                targetPage,
                initialSearch,
                sortBy,
                categoryFilter,
                authorFilter,
                statusFilter,
                verifiedFilter,
                attributionFilter,
                tagFilter,
                sourceFilter
              )
            }
          />
        </div>
      ) : null}

      <ConfirmModal
        isOpen={pendingDeleteId !== null}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={async () => {
          if (pendingDeleteId) {
            await executeDeleteQuote(pendingDeleteId)
          }
        }}
        title="Move Quote to Trash?"
        message="Are you sure you want to delete this quote? You can restore it later from Trash."
        confirmLabel="Move to Trash"
        isDestructive
        isLoading={deletingId !== null}
      />

      <QuoteContextQuickEditor
        isOpen={editingContextQuote !== null}
        onClose={() => setEditingContextQuote(null)}
        quote={editingContextQuote}
        onSaveSuccess={handleContextSaveSuccess}
      />

      <QuoteVerificationModal
        isOpen={verifyingQuote !== null}
        onClose={() => setVerifyingQuote(null)}
        quote={verifyingQuote}
        onSaveSuccess={handleVerificationSaveSuccess}
      />
    </div>
  )
}
