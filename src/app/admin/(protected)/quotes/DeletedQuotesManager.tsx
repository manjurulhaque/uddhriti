"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { formatDateTimeInAppTimeZone } from "@/lib/datetime"

type DeletedQuoteItem = {
  id: string
  content: string
  status: string
  authorName: string | null
  sourceTitle: string | null
  deletedAt: string
}

type SortOption = "deleted-newest" | "deleted-oldest" | "author" | "content"

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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search deleted quotes by text, author, source, or status"
          className="w-full rounded border px-3 py-2 text-sm md:flex-1"
        />
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as SortOption)}
          className="rounded border px-3 py-2 text-sm md:w-56"
        >
          <option value="deleted-newest">Deleted: Newest first</option>
          <option value="deleted-oldest">Deleted: Oldest first</option>
          <option value="author">Sort: Author A-Z</option>
          <option value="content">Sort: Quote text</option>
        </select>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {quotes.length === 0 ? (
        <div className="border border-dashed rounded p-4 text-sm text-gray-500">
          Trash is empty.
        </div>
      ) : null}

      {quotes.length > 0 && visibleQuotes.length === 0 ? (
        <div className="border border-dashed rounded p-4 text-sm text-gray-500">
          No deleted quotes match your search.
        </div>
      ) : null}

      <div className="space-y-2">
        {visibleQuotes.map((quote) => {
          const isBusy = busyId === quote.id

          return (
            <div key={quote.id} className="border rounded p-4 space-y-3">
              <div>
                <div className="font-medium line-clamp-2">{quote.content}</div>
                <div className="text-sm text-gray-500">
                  {quote.authorName ?? "Unknown Author"} - {quote.sourceTitle ?? "No Source"}
                </div>
                <div className="text-xs text-gray-400">
                  Status: {quote.status} | Deleted: {formatDateTimeInAppTimeZone(quote.deletedAt)}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded border px-3 py-1.5 text-sm"
                  disabled={isBusy}
                  onClick={() => restoreQuote(quote.id)}
                >
                  {isBusy ? "Working..." : "Restore"}
                </button>
                <button
                  type="button"
                  className="rounded border border-red-300 bg-red-50 px-3 py-1.5 text-sm text-red-700 disabled:opacity-50"
                  disabled={isBusy}
                  onClick={() => permanentlyDeleteQuote(quote.id)}
                >
                  {isBusy ? "Working..." : "Delete Permanently"}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
