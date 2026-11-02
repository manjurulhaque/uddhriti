"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { FilterToolbar, AdminEntityCard, AdminEntityCountBadge } from "@/components/admin"
import { Select, EmptyState, Pagination, ConfirmModal, Button } from "@/components/ui"

const PAGE_SIZE = 24

export type CategoryItem = {
  id: string
  name: string
  slug: string
  description: string | null
  quoteCount: number
  createdAt: string
}

type SortOption =
  | "newest"
  | "oldest"
  | "name-asc"
  | "name-desc"
  | "most-quotes"
  | "least-quotes"

const sortOptions = [
  { value: "newest", label: "Arrange: Newest first" },
  { value: "oldest", label: "Arrange: Oldest first" },
  { value: "name-asc", label: "Sort: Name A-Z" },
  { value: "name-desc", label: "Sort: Name Z-A" },
  { value: "most-quotes", label: "Sort: Most quotes" },
  { value: "least-quotes", label: "Sort: Fewest quotes" },
]

type QuoteFilter = "all" | "with-quotes" | "without-quotes"

export function CategoriesListManager({ categories }: { categories: CategoryItem[] }) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [quoteFilter, setQuoteFilter] = useState<QuoteFilter>("all")
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deletingIds, setDeletingIds] = useState<string[]>([])
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null)
  const [error, setError] = useState("")

  const deletingSet = useMemo(() => new Set(deletingIds), [deletingIds])

  // Filter and sort categories
  const filteredCategories = useMemo(() => {
    const needle = search.trim().toLowerCase()

    return categories
      .filter((c) => {
        const matchesSearch = needle
          ? `${c.name} ${c.slug} ${c.description || ""}`.toLowerCase().includes(needle)
          : true

        const matchesQuotes =
          quoteFilter === "all"
            ? true
            : quoteFilter === "with-quotes"
              ? c.quoteCount > 0
              : c.quoteCount === 0

        return matchesSearch && matchesQuotes
      })
      .sort((a, b) => {
        if (sortBy === "oldest") {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        }
        if (sortBy === "name-asc") {
          return a.name.localeCompare(b.name)
        }
        if (sortBy === "name-desc") {
          return b.name.localeCompare(a.name)
        }
        if (sortBy === "most-quotes") {
          return b.quoteCount - a.quoteCount || a.name.localeCompare(b.name)
        }
        if (sortBy === "least-quotes") {
          return a.quoteCount - b.quoteCount || a.name.localeCompare(b.name)
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
  }, [categories, quoteFilter, search, sortBy])

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredCategories.slice(start, start + PAGE_SIZE)
  }, [currentPage, filteredCategories])

  const allPageSelected =
    paginatedCategories.length > 0 &&
    paginatedCategories.every((cat) => selectedIds.includes(cat.id))

  const hasActiveFilters = search.trim().length > 0 || sortBy !== "newest" || quoteFilter !== "all"

  function clearFilters() {
    setSearch("")
    setSortBy("newest")
    setQuoteFilter("all")
    setPage(1)
  }

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handleSortChange(value: string) {
    setSortBy(value as SortOption)
    setPage(1)
  }

  function handleQuoteFilterChange(value: QuoteFilter) {
    setQuoteFilter(value)
    setPage(1)
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]
    )
  }

  function toggleSelectAllOnPage() {
    const pageIds = paginatedCategories.map((c) => c.id)

    setSelectedIds((prev) => {
      if (allPageSelected) {
        return prev.filter((id) => !pageIds.includes(id))
      }
      return Array.from(new Set([...prev, ...pageIds]))
    })
  }

  async function executeDeleteCategories(ids: string[]) {
    if (ids.length === 0) return

    setDeletingIds(ids)
    setError("")

    try {
      const results = await Promise.all(
        ids.map((id) =>
          fetch(`/api/admin/categories/${id}`, {
            method: "DELETE",
          }).then(async (res) => ({
            id,
            ok: res.ok,
            data: await res.json().catch(() => null),
          }))
        )
      )

      const failed = results.find((r) => !r.ok)
      if (failed) {
        throw new Error(
          failed.data?.error || "Failed to delete category (it may still be assigned to quotes)."
        )
      }

      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)))
      setPendingDeleteIds(null)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete category")
    } finally {
      setDeletingIds([])
    }
  }

  return (
    <div className="space-y-4">
      {/* Sticky Bulk Action Bar */}
      {selectedIds.length > 0 ? (
        <div className="sticky top-2 z-20 backdrop-blur-md bg-stone-900/95 text-white border border-stone-800 shadow-xl rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 transition-all duration-150 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-800 text-stone-200 border border-stone-700">
              {selectedIds.length} {selectedIds.length === 1 ? "category" : "categories"} selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-xs text-stone-400 hover:text-stone-200 underline transition cursor-pointer"
            >
              Deselect all
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPendingDeleteIds(selectedIds)}
              disabled={deletingIds.length > 0}
              className="bg-red-600/90 text-white font-medium text-xs px-3 py-1.5 rounded-lg hover:bg-red-600 disabled:opacity-50 transition cursor-pointer"
            >
              {deletingIds.length > 0 ? "Deleting..." : "Delete Selected"}
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-xs text-red-500 hover:text-red-800 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Filter Toolbar */}
      <FilterToolbar
        searchValue={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search categories by name, slug, or description..."
        sortValue={sortBy}
        onSortChange={handleSortChange}
        sortOptions={sortOptions}
        visibleCount={filteredCategories.length}
        totalCount={categories.length}
        itemLabel="categories"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        filters={
          <Select
            value={quoteFilter}
            onChange={(event) => handleQuoteFilterChange(event.target.value as QuoteFilter)}
            options={[
              { value: "all", label: "Quotes: All categories" },
              { value: "with-quotes", label: "Quotes: With quotes" },
              { value: "without-quotes", label: "Quotes: No quotes (empty)" },
            ]}
          />
        }
      />

      {/* Select All on Page Checkbox */}
      {paginatedCategories.length > 0 ? (
        <div className="flex items-center justify-between text-xs text-gray-500 pt-1 pb-1">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allPageSelected}
              onChange={toggleSelectAllOnPage}
              className="rounded border-gray-300 text-black focus:ring-black"
            />
            <span>Select all on page ({paginatedCategories.length})</span>
          </label>
          <span>
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredCategories.length)} of {filteredCategories.length}
          </span>
        </div>
      ) : null}

      {/* Categories Cards */}
      {paginatedCategories.length === 0 ? (
        <EmptyState
          title={hasActiveFilters ? "No matching categories" : "No categories found"}
          description={
            hasActiveFilters
              ? "Try adjusting your search query, sort order, or filters."
              : "Create your first category to start organizing quotes into themes."
          }
          action={
            hasActiveFilters
              ? { label: "Clear filters", onClick: clearFilters }
              : { label: "+ New Category", href: "/admin/categories/new" }
          }
        />
      ) : (
        <div className="space-y-2.5">
          {paginatedCategories.map((c) => {
            const isDeleting = deletingSet.has(c.id)

            return (
              <AdminEntityCard
                key={c.id}
                href={`/admin/categories/${c.id}`}
                title={c.name}
                subtitle={c.description ? `/${c.slug} • ${c.description}` : `/${c.slug}`}
                selected={selectedIds.includes(c.id)}
                onSelect={() => toggleSelect(c.id)}
                disabled={isDeleting}
                badge={<AdminEntityCountBadge count={c.quoteCount} />}
                actions={
                  <div className="flex items-center gap-2">
                    <Button href={`/admin/categories/${c.id}`} variant="outline" size="xs">
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="xs"
                      onClick={() => setPendingDeleteIds([c.id])}
                      disabled={isDeleting}
                    >
                      {isDeleting ? "..." : "Delete"}
                    </Button>
                  </div>
                }
              />
            )
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 ? (
        <div className="pt-4 flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      ) : null}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={pendingDeleteIds !== null}
        onClose={() => setPendingDeleteIds(null)}
        onConfirm={async () => {
          if (pendingDeleteIds && pendingDeleteIds.length > 0) {
            await executeDeleteCategories(pendingDeleteIds)
          }
        }}
        title={
          pendingDeleteIds && pendingDeleteIds.length > 1
            ? `Delete ${pendingDeleteIds.length} Categories?`
            : "Delete Category?"
        }
        message={
          pendingDeleteIds && pendingDeleteIds.length > 1
            ? `Are you sure you want to delete these ${pendingDeleteIds.length} categories? Categories currently referenced by quotes cannot be deleted.`
            : "Are you sure you want to delete this category? Categories currently referenced by quotes cannot be deleted."
        }
        confirmLabel="Delete"
        isDestructive
        isLoading={deletingIds.length > 0}
      />
    </div>
  )
}

