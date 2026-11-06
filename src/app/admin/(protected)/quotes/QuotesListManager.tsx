"use client"

import { useMemo, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { formatDateTimeInAppTimeZone } from "@/lib/datetime"
import { FilterToolbar, AdminEntityCard } from "@/components/admin"
import { Pagination, EmptyState, ConfirmModal, Button, Badge } from "@/components/ui"

type QuoteItem = {
  id: string
  content: string
  status: string
  isVerified: boolean
  createdAt: string
  publishedAt: string | null
  authorName: string | null
  categoryName: string | null
  categorySlug: string | null
  sourceTitle: string | null
  hasAuthor: boolean
  hasCategory: boolean
  hasSource: boolean
  hasTags: boolean
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
type SortOption =
  | "newest"
  | "oldest"
  | "author-asc"
  | "author-desc"
  | "category-asc"
  | "category-desc"
  | "status"
  | "content"
  | "needs-attention"

const sortOptions = [
  { value: "newest", label: "Arrange: Newest first" },
  { value: "oldest", label: "Arrange: Oldest first" },
  { value: "author-asc", label: "Sort: Author A-Z" },
  { value: "author-desc", label: "Sort: Author Z-A" },
  { value: "category-asc", label: "Sort: Category A-Z" },
  { value: "category-desc", label: "Sort: Category Z-A" },
  { value: "status", label: "Sort: Status" },
  { value: "content", label: "Sort: Quote text" },
  { value: "needs-attention", label: "Arrange: Needs attention" },
]

type QuoteFilter = "all" | "draft" | "archived" | "unverified" | "unattributed" | "missing-source" | "no-tags" | "orphaned"

function buildQuotesListHref(filter: QuoteFilter, page: number, search?: string) {
  const params = new URLSearchParams()
  if (filter !== "all") {
    params.set("filter", filter)
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
}: {
  quotes: QuoteItem[]
  activeFilter: QuoteFilter
  activeFilterLabel: string
  page: number
  pageSize: number
  total: number
  initialSearch?: string
}) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [action, setAction] = useState<BulkActionType>("setStatus")
  const [statusValue, setStatusValue] = useState<"PUBLISHED" | "DRAFT" | "ARCHIVED">("PUBLISHED")
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({})
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null)
  const [verificationOverrides, setVerificationOverrides] = useState<Record<string, boolean>>({})
  const [togglingVerificationId, setTogglingVerificationId] = useState<string | null>(null)
  const [verificationValue, setVerificationValue] = useState(true)
  const [authors, setAuthors] = useState<Option[]>([])
  const [categories, setCategories] = useState<Option[]>([])
  const [sources, setSources] = useState<Option[]>([])
  const [tags, setTags] = useState<TagOption[]>([])
  const [authorId, setAuthorId] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [sourceId, setSourceId] = useState("")
  const [tagIds, setTagIds] = useState<string[]>([])
  const [search, setSearch] = useState(initialSearch)
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [isLoadingOptions, setIsLoadingOptions] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    setSearch(initialSearch)
  }, [initialSearch])

  useEffect(() => {
    if (search.trim() === initialSearch.trim()) return

    const timer = setTimeout(() => {
      const href = buildQuotesListHref(activeFilter, 1, search.trim())
      router.push(href)
    }, 350)

    return () => clearTimeout(timer)
  }, [search, activeFilter, initialSearch, router])

  const selectedTagNames = useMemo(
    () => tags.filter((tag) => tagIds.includes(tag.id)).map((tag) => tag.name),
    [tagIds, tags]
  )

  const isSearchSynched = search.trim().toLowerCase() === initialSearch.trim().toLowerCase()

  const visibleQuotes = useMemo(() => {
    const needle = !isSearchSynched ? search.trim().toLowerCase() : ""
    const filtered = needle
      ? quotes.filter((quote) =>
        [quote.content, quote.authorName ?? "", quote.categoryName ?? "", quote.sourceTitle ?? "", quote.status]
          .join(" ")
          .toLowerCase()
          .includes(needle)
      )
      : quotes

    return [...filtered].sort((a, b) => {
      const authorA = (a.authorName ?? "").toLowerCase()
      const authorB = (b.authorName ?? "").toLowerCase()
      const categoryA = (a.categoryName ?? "").toLowerCase()
      const categoryB = (b.categoryName ?? "").toLowerCase()
      const contentA = a.content.toLowerCase()
      const contentB = b.content.toLowerCase()
      const attentionA =
        Number(!a.hasAuthor) +
        Number(!a.hasCategory) +
        Number(!a.hasSource) +
        Number(!a.hasTags) +
        Number(!a.isVerified)
      const attentionB =
        Number(!b.hasAuthor) +
        Number(!b.hasCategory) +
        Number(!b.hasSource) +
        Number(!b.hasTags) +
        Number(!b.isVerified)

      switch (sortBy) {
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case "author-asc":
          return authorA.localeCompare(authorB) || contentA.localeCompare(contentB)
        case "author-desc":
          return authorB.localeCompare(authorA) || contentA.localeCompare(contentB)
        case "category-asc":
          return categoryA.localeCompare(categoryB) || contentA.localeCompare(contentB)
        case "category-desc":
          return categoryB.localeCompare(categoryA) || contentA.localeCompare(contentB)
        case "status":
          return a.status.localeCompare(b.status) || authorA.localeCompare(authorB)
        case "content":
          return contentA.localeCompare(contentB)
        case "needs-attention":
          return attentionB - attentionA || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case "newest":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })
  }, [quotes, search, sortBy, isSearchSynched])

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

  function handleClearFilters() {
    setSearch("")
    setSortBy("newest")
    if (initialSearch.trim()) {
      router.push(buildQuotesListHref(activeFilter, 1, ""))
    }
  }

  const hasActiveFilters = search.trim().length > 0 || sortBy !== "newest"

  return (
    <div className="space-y-4">
      <FilterToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search quotes by text, author, source, or status"
        sortValue={sortBy}
        onSortChange={(value) => setSortBy(value as SortOption)}
        sortOptions={sortOptions}
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
          const isTogglingStatus = togglingStatusId === quote.id
          const isTogglingVerification = togglingVerificationId === quote.id
          const isPublished = effectiveStatus === "PUBLISHED"

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
                  <span className="font-medium text-stone-800">{quote.authorName ?? "Unknown Author"}</span>
                  {quote.categoryName ? (
                    <>
                      <span className="text-stone-300">•</span>
                      <span className="text-stone-600 font-medium">{quote.categoryName}</span>
                    </>
                  ) : null}
                  {quote.sourceTitle ? (
                    <>
                      <span className="text-stone-300">•</span>
                      <span className="italic text-stone-500 truncate max-w-[260px]" title={quote.sourceTitle}>
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
                    <Badge variant="outline" size="xs" className="font-sans font-medium text-stone-700 bg-stone-50 border-stone-200/90">
                      {quote.categoryName}
                    </Badge>
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
                  {!quote.hasTags && (
                    <Badge variant="neutral" size="xs">
                      Missing tags
                    </Badge>
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
                    variant={effectiveVerified ? "ghost" : "outline"}
                    size="xs"
                    disabled={isTogglingVerification}
                    isLoading={isTogglingVerification}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      toggleQuoteVerification(quote.id, effectiveVerified)
                    }}
                    title={effectiveVerified ? "Click to mark as unverified" : "Click to mark as verified immediately"}
                    className={
                      effectiveVerified
                        ? "text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border border-emerald-200/80"
                        : "text-amber-800 border-amber-300 bg-amber-50/60 hover:bg-amber-100/80"
                    }
                  >
                    {effectiveVerified ? "✓ Verified" : "Verify"}
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
            buildHref={(targetPage) => buildQuotesListHref(activeFilter, targetPage, initialSearch)}
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
    </div>
  )
}
