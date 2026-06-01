"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { formatDateTimeInAppTimeZone } from "@/lib/datetime"

type QuoteItem = {
  id: string
  content: string
  status: string
  createdAt: string
  publishedAt: string | null
  authorName: string | null
  sourceTitle: string | null
  hasAuthor: boolean
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

type BulkActionType = "setAuthor" | "setSource" | "clearSource" | "addTags" | "removeTags"
type SortOption =
  | "newest"
  | "oldest"
  | "author-asc"
  | "author-desc"
  | "status"
  | "content"
  | "needs-attention"

export function QuotesListManager({
  quotes,
  activeFilterLabel,
}: {
  quotes: QuoteItem[]
  activeFilterLabel: string
}) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [action, setAction] = useState<BulkActionType>("setAuthor")
  const [authors, setAuthors] = useState<Option[]>([])
  const [sources, setSources] = useState<Option[]>([])
  const [tags, setTags] = useState<TagOption[]>([])
  const [authorId, setAuthorId] = useState("")
  const [sourceId, setSourceId] = useState("")
  const [tagIds, setTagIds] = useState<string[]>([])
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [isLoadingOptions, setIsLoadingOptions] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState("")

  const selectedTagNames = useMemo(
    () => tags.filter((tag) => tagIds.includes(tag.id)).map((tag) => tag.name),
    [tagIds, tags]
  )
  const visibleQuotes = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const filtered = needle
      ? quotes.filter((quote) =>
          [quote.content, quote.authorName ?? "", quote.sourceTitle ?? "", quote.status]
            .join(" ")
            .toLowerCase()
            .includes(needle)
        )
      : quotes

    return [...filtered].sort((a, b) => {
      const authorA = (a.authorName ?? "").toLowerCase()
      const authorB = (b.authorName ?? "").toLowerCase()
      const contentA = a.content.toLowerCase()
      const contentB = b.content.toLowerCase()
      const attentionA = Number(!a.hasAuthor) + Number(!a.hasSource) + Number(!a.hasTags)
      const attentionB = Number(!b.hasAuthor) + Number(!b.hasSource) + Number(!b.hasTags)

      switch (sortBy) {
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case "author-asc":
          return authorA.localeCompare(authorB) || contentA.localeCompare(contentB)
        case "author-desc":
          return authorB.localeCompare(authorA) || contentA.localeCompare(contentB)
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
  }, [quotes, search, sortBy])
  const allSelected =
    visibleQuotes.length > 0 &&
    visibleQuotes.every((quote) => selectedIds.includes(quote.id))
  const selectedCount = selectedIds.length

  async function ensureOptions(nextAction: BulkActionType) {
    if (isLoadingOptions) return

    if (nextAction === "setAuthor" && authors.length > 0) return
    if (nextAction === "setSource" && sources.length > 0) return
    if (nextAction === "addTags" && tags.length > 0) return

    setIsLoadingOptions(true)
    try {
      if (nextAction === "setAuthor") {
        const res = await fetch("/api/admin/authors")
        if (!res.ok) throw new Error("Failed to load authors")
        setAuthors(await res.json())
      } else if (nextAction === "setSource") {
        const res = await fetch("/api/admin/sources")
        if (!res.ok) throw new Error("Failed to load sources")
        setSources(await res.json())
      } else {
        const res = await fetch("/api/admin/tags")
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
          sourceId: action === "setSource" ? sourceId : undefined,
          tagIds: action === "addTags" || action === "removeTags" ? tagIds : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Bulk update failed")
      }

      setSelectedIds([])
      setAuthorId("")
      setSourceId("")
      setTagIds([])
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bulk update failed")
    } finally {
      setIsApplying(false)
    }
  }

  async function deleteQuote(id: string) {
    const confirmed = window.confirm("Delete this quote? You can restore it later from Trash.")
    if (!confirmed) return

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
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete quote")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search quotes by text, author, source, or status"
          className="w-full rounded border px-3 py-2 text-sm md:flex-1"
        />
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as SortOption)}
          className="rounded border px-3 py-2 text-sm md:w-56"
        >
          <option value="newest">Arrange: Newest first</option>
          <option value="oldest">Arrange: Oldest first</option>
          <option value="author-asc">Sort: Author A-Z</option>
          <option value="author-desc">Sort: Author Z-A</option>
          <option value="status">Sort: Status</option>
          <option value="content">Sort: Quote text</option>
          <option value="needs-attention">Arrange: Needs attention</option>
        </select>
      </div>

      {selectedCount > 0 ? (
        <div className="border rounded p-3 bg-gray-50 space-y-3">
          <div className="text-sm font-medium">{selectedCount} selected</div>
          <div className="flex flex-wrap gap-2 items-center">
            <select
              className="border rounded px-2 py-1 text-sm"
              value={action}
              onChange={(event) => {
                const next = event.target.value as BulkActionType
                setAction(next)
                setError("")
                ensureOptions(next)
              }}
            >
              <option value="setAuthor">Set Author</option>
              <option value="setSource">Set Source</option>
              <option value="clearSource">Clear Source</option>
              <option value="addTags">Add Tags</option>
              <option value="removeTags">Remove Tags</option>
            </select>

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

      {quotes.length === 0 ? <div className="border border-dashed rounded p-4 text-sm text-gray-500">No quotes found for {activeFilterLabel}.</div> : null}

      <div className="space-y-2">
        {visibleQuotes.length > 0 ? (
          <label className="inline-flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={allSelected} onChange={onToggleSelectAll} />
            Select all on page
          </label>
        ) : null}

        {quotes.length > 0 && visibleQuotes.length === 0 ? (
          <div className="border border-dashed rounded p-4 text-sm text-gray-500">
            No quotes match your search for {activeFilterLabel}.
          </div>
        ) : null}

        {visibleQuotes.map((quote) => (
          <div key={quote.id} className="border rounded p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(quote.id)}
                  onChange={() => onToggleSelect(quote.id)}
                />
                Select
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="text-sm text-red-700 underline disabled:opacity-50"
                  disabled={deletingId === quote.id}
                  onClick={() => deleteQuote(quote.id)}
                >
                  {deletingId === quote.id ? "Deleting..." : "Delete"}
                </button>
                <Link href={`/admin/quotes/${quote.id}`} className="text-sm underline">
                  Open
                </Link>
              </div>
            </div>

            <Link href={`/admin/quotes/${quote.id}`} className="block hover:bg-gray-50 rounded">
              <div className="font-medium line-clamp-2">{quote.content}</div>
              <div className="text-sm text-gray-500">
                {quote.authorName ?? "Unknown Author"} - {quote.sourceTitle ?? "No Source"}
              </div>
              <div className="text-xs text-gray-400">
                Status: {quote.status} | Published:{" "}
                {quote.publishedAt ? formatDateTimeInAppTimeZone(quote.publishedAt) : "Not published"}
              </div>
            </Link>

            {!quote.hasAuthor || !quote.hasSource || !quote.hasTags ? (
              <div className="flex flex-wrap gap-2">
                {!quote.hasAuthor ? (
                  <span className="text-xs border rounded-full px-2 py-0.5 bg-red-50 text-red-700 border-red-200">Missing author</span>
                ) : null}
                {!quote.hasSource ? (
                  <span className="text-xs border rounded-full px-2 py-0.5 bg-amber-50 text-amber-700 border-amber-200">Missing source</span>
                ) : null}
                {!quote.hasTags ? (
                  <span className="text-xs border rounded-full px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200">Missing tags</span>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
