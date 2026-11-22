"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { formatDateTimeInAppTimeZone } from "@/lib/datetime"
import { FilterToolbar, AdminEntityCard } from "@/components/admin"
import {
  Button,
  Badge,
  EmptyState,
  ConfirmModal,
  FormErrorBanner,
} from "@/components/ui"
import { formatCountWithNoun } from "@/lib/formatters"

export type DeletedQuoteItem = {
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
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [busyIds, setBusyIds] = useState<string[]>([])
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null)
  const [error, setError] = useState("")

  const busySet = useMemo(() => new Set(busyIds), [busyIds])

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
          return (
            (a.authorName ?? "").localeCompare(b.authorName ?? "") ||
            a.content.localeCompare(b.content)
          )
        case "content":
          return a.content.localeCompare(b.content)
        case "deleted-newest":
        default:
          return new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
      }
    })
  }, [quotes, search, sortBy])

  const allSelected =
    visibleQuotes.length > 0 &&
    visibleQuotes.every((quote) => selectedIds.includes(quote.id))

  const hasActiveFilters = search.trim().length > 0 || sortBy !== "deleted-newest"

  function onToggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  function onToggleSelectAll() {
    const visibleIds = visibleQuotes.map((q) => q.id)
    setSelectedIds((prev) => {
      if (allSelected) {
        return prev.filter((id) => !visibleIds.includes(id))
      }
      return Array.from(new Set([...prev, ...visibleIds]))
    })
  }

  function clearFilters() {
    setSearch("")
    setSortBy("deleted-newest")
  }

  async function restoreQuotes(ids: string[]) {
    if (ids.length === 0) return
    setBusyIds((prev) => [...prev, ...ids])
    setError("")

    try {
      const responses = await Promise.all(
        ids.map((id) =>
          fetch(`/api/admin/quotes/${id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "restore" }),
          }).then(async (res) => ({
            ok: res.ok,
            data: await res.json().catch(() => null),
          }))
        )
      )

      const failed = responses.find((r) => !r.ok)
      if (failed) {
        throw new Error(failed.data?.error || "Failed to restore quote(s)")
      }

      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)))
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to restore quote(s)")
    } finally {
      setBusyIds((prev) => prev.filter((id) => !ids.includes(id)))
    }
  }

  async function executePermanentDelete(ids: string[]) {
    if (ids.length === 0) return
    setBusyIds((prev) => [...prev, ...ids])
    setError("")

    try {
      const responses = await Promise.all(
        ids.map((id) =>
          fetch(`/api/admin/quotes/${id}?permanent=true`, {
            method: "DELETE",
          }).then(async (res) => ({
            ok: res.ok,
            data: await res.json().catch(() => null),
          }))
        )
      )

      const failed = responses.find((r) => !r.ok)
      if (failed) {
        throw new Error(failed.data?.error || "Failed to permanently delete quote(s)")
      }

      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)))
      setPendingDeleteIds(null)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to permanently delete quote(s)")
    } finally {
      setBusyIds((prev) => prev.filter((id) => !ids.includes(id)))
    }
  }

  return (
    <div className="space-y-4">
      {selectedIds.length > 0 ? (
        <div className="border border-stone-200/90 rounded-2xl p-3 bg-stone-50 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="text-sm font-medium text-stone-800">
            {formatCountWithNoun(selectedIds.length, "quote")} selected
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="xs"
              onClick={() => restoreQuotes(selectedIds)}
              disabled={busyIds.length > 0}
            >
              Restore Selected
            </Button>
            <Button
              type="button"
              variant="danger"
              size="xs"
              onClick={() => setPendingDeleteIds(selectedIds)}
              disabled={busyIds.length > 0}
            >
              Permanently Delete Selected
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => setSelectedIds([])}
            >
              Deselect All
            </Button>
          </div>
        </div>
      ) : null}

      <FormErrorBanner error={error} onDismiss={() => setError("")} />

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
        onClearFilters={clearFilters}
      />

      {quotes.length === 0 ? (
        <EmptyState
          title="Trash is empty"
          description="There are currently no deleted quotes in the database."
          action={{
            label: "Back to Quotes",
            href: "/admin/quotes",
          }}
        />
      ) : null}

      {quotes.length > 0 && visibleQuotes.length === 0 ? (
        <EmptyState
          title="No deleted quotes match your search"
          description="Try searching with a different keyword or clear your active search filters."
          action={{ label: "Clear search", onClick: clearFilters }}
        />
      ) : null}

      {visibleQuotes.length > 0 ? (
        <div className="space-y-2">
          <label className="inline-flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onToggleSelectAll}
              className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-400 cursor-pointer"
            />
            Select all on page
          </label>

          <div className="space-y-2.5">
            {visibleQuotes.map((quote) => {
              const isBusy = busySet.has(quote.id)

              return (
                <AdminEntityCard
                  key={quote.id}
                  selected={selectedIds.includes(quote.id)}
                  onSelect={() => onToggleSelect(quote.id)}
                  disabled={isBusy}
                  title={
                    <span className="font-serif italic font-normal text-stone-900 line-clamp-2 text-base leading-snug">
                      “{quote.content}”
                    </span>
                  }
                  subtitle={
                    <span className="flex items-center gap-1.5 text-xs text-stone-600 mt-1">
                      <span className="font-medium text-stone-800">
                        {quote.authorName ?? "Unknown Author"}
                      </span>
                      {quote.sourceTitle ? (
                        <>
                          <span className="text-stone-300">•</span>
                          <span className="italic text-stone-500">
                            {quote.sourceTitle}
                          </span>
                        </>
                      ) : null}
                    </span>
                  }
                  badge={
                    <Badge
                      variant={
                        quote.status === "PUBLISHED"
                          ? "success"
                          : quote.status === "ARCHIVED"
                          ? "dark"
                          : "warm"
                      }
                      size="xs"
                      dot
                    >
                      {quote.status}
                    </Badge>
                  }
                  meta={
                    <span className="text-[11px] text-stone-400">
                      Deleted {formatDateTimeInAppTimeZone(quote.deletedAt)}
                    </span>
                  }
                  actions={
                    <div className="flex flex-wrap gap-2 items-center justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        size="xs"
                        disabled={isBusy}
                        onClick={() => restoreQuotes([quote.id])}
                      >
                        {isBusy ? "Restoring..." : "Restore"}
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="xs"
                        disabled={isBusy}
                        onClick={() => setPendingDeleteIds([quote.id])}
                      >
                        {isBusy ? "Deleting..." : "Delete Permanently"}
                      </Button>
                    </div>
                  }
                />
              )
            })}
          </div>
        </div>
      ) : null}

      <ConfirmModal
        isOpen={pendingDeleteIds !== null && pendingDeleteIds.length > 0}
        onClose={() => setPendingDeleteIds(null)}
        onConfirm={async () => {
          if (pendingDeleteIds && pendingDeleteIds.length > 0) {
            await executePermanentDelete(pendingDeleteIds)
          }
        }}
        title={
          pendingDeleteIds && pendingDeleteIds.length > 1
            ? `Permanently Delete ${pendingDeleteIds.length} Quotes?`
            : "Permanently Delete Quote?"
        }
        message={
          pendingDeleteIds && pendingDeleteIds.length > 1
            ? `Are you sure you want to permanently delete these ${pendingDeleteIds.length} selected quotes? This action cannot be undone.`
            : "This action will permanently delete this quote from the database. It cannot be undone."
        }
        confirmLabel={
          pendingDeleteIds && pendingDeleteIds.length > 1
            ? `Delete ${pendingDeleteIds.length} Quotes`
            : "Delete Permanently"
        }
        isDestructive
        isLoading={busyIds.length > 0}
      />
    </div>
  )
}
