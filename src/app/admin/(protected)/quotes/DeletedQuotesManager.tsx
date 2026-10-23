"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { formatDateTimeInAppTimeZone } from "@/lib/datetime"
import { FilterToolbar } from "@/components/admin"
import { Button, EmptyState } from "@/components/ui"

type DeletedQuoteItem = {
  id: string
  content: string
  status: string
  authorName: string | null
  sourceTitle: string | null
  deletedAt: string
}

type SortOption = "deleted-newest" | "deleted-oldest" | "author" | "content"

const sortOptions = [
  { value: "deleted-newest", label: "Deleted: Newest first" },
  { value: "deleted-oldest", label: "Deleted: Oldest first" },
  { value: "author", label: "Sort: Author A-Z" },
  { value: "content", label: "Sort: Quote text" },
]

export function DeletedQuotesManager({
  quotes,
}: {
  quotes: DeletedQuoteItem[]
}) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("deleted-newest")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState("")

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
      switch (sortBy) {
        case "deleted-oldest":
          return new Date(a.deletedAt).getTime() - new Date(b.deletedAt).getTime()
        case "author":
          return (a.authorName ?? "").localeCompare(b.authorName ?? "") || a.content.localeCompare(b.content)
        case "content":
          return a.content.localeCompare(b.content)
        case "deleted-newest":
        default:
          return new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
      }
    })
  }, [quotes, search, sortBy])

  async function restoreQuote(id: string) {
    setBusyId(id)
    setError("")

    try {
      const res = await fetch(`/api/admin/quotes/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to restore quote")
      }

      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to restore quote")
    } finally {
      setBusyId(null)
    }
  }

  async function permanentlyDeleteQuote(id: string) {
    const confirmed = window.confirm("Permanently delete this quote from the database? This cannot be undone.")
    if (!confirmed) return

    setBusyId(id)
    setError("")

    try {
      const res = await fetch(`/api/admin/quotes/${id}?permanent=true`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to permanently delete quote")
      }

      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to permanently delete quote")
    } finally {
      setBusyId(null)
    }
  }

  const hasActiveFilters = search.trim().length > 0 || sortBy !== "deleted-newest"

  return (
    <div className="space-y-4">
      <FilterToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search deleted quotes by text, author, source, or status"
        sortValue={sortBy}
        onSortChange={(value) => setSortBy(value as SortOption)}
        sortOptions={sortOptions}
        visibleCount={visibleQuotes.length}
        totalCount={quotes.length}
        itemLabel="deleted quotes"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => {
          setSearch("")
          setSortBy("deleted-newest")
        }}
      />

      {error ? <p className="text-sm text-red-600 font-medium">{error}</p> : null}

      {quotes.length === 0 ? (
        <EmptyState
          title="Trash is empty"
          description="There are currently no deleted quotes in the database."
        />
      ) : null}

      {quotes.length > 0 && visibleQuotes.length === 0 ? (
        <EmptyState
          title="No deleted quotes match your search"
          description="Try searching with a different keyword or clear your search query."
          action={{ label: "Clear search", onClick: () => setSearch("") }}
        />
      ) : null}

      <div className="space-y-2.5">
        {visibleQuotes.map((quote) => {
          const isBusy = busyId === quote.id

          return (
            <div key={quote.id} className="rounded-xl border border-stone-200/90 bg-white p-4 space-y-3 shadow-2xs">
              <div>
                <div className="font-medium text-stone-900 line-clamp-2">{quote.content}</div>
                <div className="text-sm text-stone-500 mt-1">
                  {quote.authorName ?? "Unknown Author"} - {quote.sourceTitle ?? "No Source"}
                </div>
                <div className="text-xs text-stone-400 mt-1">
                  Status: {quote.status} | Deleted: {formatDateTimeInAppTimeZone(quote.deletedAt)}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => restoreQuote(quote.id)}
                >
                  {isBusy ? "Working..." : "Restore"}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => permanentlyDeleteQuote(quote.id)}
                >
                  {isBusy ? "Working..." : "Delete Permanently"}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

