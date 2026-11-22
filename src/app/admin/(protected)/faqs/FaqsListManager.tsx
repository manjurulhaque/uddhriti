"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { FilterToolbar, AdminEntityCard, AdminBulkActionBar } from "@/components/admin"
import { Select, EmptyState, Pagination, ConfirmModal, Button, Badge } from "@/components/ui"
import type { BadgeVariant } from "@/components/ui"

const PAGE_SIZE = 24

export type FaqItem = {
  id: string
  question: string
  answer: string
  pageType: "TAG" | "CATEGORY" | "AUTHOR" | "QUOTE" | "COLLECTION"
  pageSlug: string
  position: number
  createdAt: string
  updatedAt: string
}

type SortOption =
  | "position-asc"
  | "position-desc"
  | "newest"
  | "oldest"
  | "question-asc"
  | "question-desc"
  | "page-asc"

const sortOptions = [
  { value: "position-asc", label: "Sort: Position (Low to High)" },
  { value: "position-desc", label: "Sort: Position (High to Low)" },
  { value: "newest", label: "Arrange: Newest first" },
  { value: "oldest", label: "Arrange: Oldest first" },
  { value: "question-asc", label: "Sort: Question (A-Z)" },
  { value: "question-desc", label: "Sort: Question (Z-A)" },
  { value: "page-asc", label: "Sort: Target Slug (A-Z)" },
]

type PageTypeFilter = "all" | "TAG" | "CATEGORY" | "AUTHOR" | "QUOTE" | "COLLECTION"

const pageTypeBadgeVariant: Record<FaqItem["pageType"], BadgeVariant> = {
  AUTHOR: "rust",
  CATEGORY: "gold",
  TAG: "success",
  COLLECTION: "dark",
  QUOTE: "warm",
}

export function FaqsListManager({ faqs }: { faqs: FaqItem[] }) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("position-asc")
  const [pageTypeFilter, setPageTypeFilter] = useState<PageTypeFilter>("all")
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deletingIds, setDeletingIds] = useState<string[]>([])
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null)
  const [error, setError] = useState("")

  const deletingSet = useMemo(() => new Set(deletingIds), [deletingIds])

  const filteredFaqs = useMemo(() => {
    const needle = search.trim().toLowerCase()

    return faqs
      .filter((faq) => {
        const matchesSearch = needle
          ? `${faq.question} ${faq.pageSlug} ${faq.answer}`.toLowerCase().includes(needle)
          : true

        const matchesType =
          pageTypeFilter === "all" ? true : faq.pageType === pageTypeFilter

        return matchesSearch && matchesType
      })
      .sort((a, b) => {
        if (sortBy === "position-asc") {
          return a.position - b.position || a.pageSlug.localeCompare(b.pageSlug)
        }
        if (sortBy === "position-desc") {
          return b.position - a.position || a.pageSlug.localeCompare(b.pageSlug)
        }
        if (sortBy === "newest") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        }
        if (sortBy === "oldest") {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        }
        if (sortBy === "question-asc") {
          return a.question.localeCompare(b.question)
        }
        if (sortBy === "question-desc") {
          return b.question.localeCompare(a.question)
        }
        if (sortBy === "page-asc") {
          return a.pageSlug.localeCompare(b.pageSlug) || a.position - b.position
        }
        return 0
      })
  }, [faqs, pageTypeFilter, search, sortBy])

  const totalPages = Math.max(1, Math.ceil(filteredFaqs.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginatedFaqs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredFaqs.slice(start, start + PAGE_SIZE)
  }, [currentPage, filteredFaqs])

  const allPageSelected =
    paginatedFaqs.length > 0 &&
    paginatedFaqs.every((item) => selectedIds.includes(item.id))

  const hasActiveFilters =
    search.trim().length > 0 ||
    sortBy !== "position-asc" ||
    pageTypeFilter !== "all"

  function clearFilters() {
    setSearch("")
    setSortBy("position-asc")
    setPageTypeFilter("all")
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

  function handlePageTypeFilterChange(value: PageTypeFilter) {
    setPageTypeFilter(value)
    setPage(1)
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]
    )
  }

  function toggleSelectAllOnPage() {
    const pageIds = paginatedFaqs.map((f) => f.id)

    setSelectedIds((prev) => {
      if (allPageSelected) {
        return prev.filter((id) => !pageIds.includes(id))
      }
      return Array.from(new Set([...prev, ...pageIds]))
    })
  }

  async function executeDeleteFaqs(ids: string[]) {
    if (ids.length === 0) return

    setDeletingIds(ids)
    setError("")

    try {
      const results = await Promise.all(
        ids.map((id) =>
          fetch(`/api/admin/faqs/${id}`, {
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
          failed.data?.error || "Failed to delete FAQ."
        )
      }

      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)))
      setPendingDeleteIds(null)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete FAQ")
    } finally {
      setDeletingIds([])
    }
  }

  return (
    <div className="space-y-4">
      {/* Sticky Bulk Action Bar */}
      <AdminBulkActionBar
        selectedCount={selectedIds.length}
        entityLabel="FAQ"
        entityLabelPlural="FAQs"
        onDeselectAll={() => setSelectedIds([])}
        onDelete={() => setPendingDeleteIds(selectedIds)}
        isDeleting={deletingIds.length > 0}
      />

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
        searchPlaceholder="Search FAQs by question, answer, or target slug..."
        sortValue={sortBy}
        onSortChange={handleSortChange}
        sortOptions={sortOptions}
        visibleCount={filteredFaqs.length}
        totalCount={faqs.length}
        itemLabel="FAQs"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        filters={
          <Select
            value={pageTypeFilter}
            onChange={(event) => handlePageTypeFilterChange(event.target.value as PageTypeFilter)}
            options={[
              { value: "all", label: "Surface: All Page Types" },
              { value: "AUTHOR", label: "Surface: Author Pages" },
              { value: "CATEGORY", label: "Surface: Category Pages" },
              { value: "TAG", label: "Surface: Tag Pages" },
              { value: "QUOTE", label: "Surface: Quote Pages" },
              { value: "COLLECTION", label: "Surface: Collection Pages" },
            ]}
          />
        }
      />

      {/* Select All on Page Checkbox & Counter */}
      {paginatedFaqs.length > 0 ? (
        <div className="flex items-center justify-between text-xs text-gray-500 pt-1 pb-1">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allPageSelected}
              onChange={toggleSelectAllOnPage}
              className="rounded border-gray-300 text-black focus:ring-black"
            />
            <span>Select all on page ({paginatedFaqs.length})</span>
          </label>
          <span>
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredFaqs.length)} of {filteredFaqs.length}
          </span>
        </div>
      ) : null}

      {/* FAQs Cards List */}
      {paginatedFaqs.length === 0 ? (
        <EmptyState
          title={hasActiveFilters ? "No matching FAQs" : "No FAQs found"}
          description={
            hasActiveFilters
              ? "Try adjusting your search query, sort order, or surface page type filter."
              : "Create frequently asked questions to display on public quotation surfaces."
          }
          action={
            hasActiveFilters
              ? { label: "Clear filters", onClick: clearFilters }
              : { label: "+ New FAQ", href: "/admin/faqs/new" }
          }
        />
      ) : (
        <div className="space-y-2.5">
          {paginatedFaqs.map((faq) => {
            const isDeleting = deletingSet.has(faq.id)

            return (
              <AdminEntityCard
                key={faq.id}
                href={`/admin/faqs/${faq.id}`}
                title={faq.question}
                subtitle={`Target: /${faq.pageSlug} • ${faq.answer}`}
                selected={selectedIds.includes(faq.id)}
                onSelect={() => toggleSelect(faq.id)}
                disabled={isDeleting}
                badge={
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant={pageTypeBadgeVariant[faq.pageType] || "neutral"}
                      size="sm"
                      dot
                    >
                      {faq.pageType}
                    </Badge>
                    <span className="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-mono text-stone-700 border border-stone-200">
                      Pos {faq.position}
                    </span>
                  </div>
                }
                actions={
                  <div className="flex items-center gap-2">
                    <Button href={`/admin/faqs/${faq.id}`} variant="outline" size="xs">
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="xs"
                      onClick={() => setPendingDeleteIds([faq.id])}
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
            await executeDeleteFaqs(pendingDeleteIds)
          }
        }}
        title={
          pendingDeleteIds && pendingDeleteIds.length > 1
            ? `Delete ${pendingDeleteIds.length} FAQs?`
            : "Delete FAQ?"
        }
        message={
          pendingDeleteIds && pendingDeleteIds.length > 1
            ? `Are you sure you want to delete these ${pendingDeleteIds.length} FAQs? This action cannot be undone.`
            : "Are you sure you want to delete this FAQ? This action cannot be undone."
        }
        confirmLabel="Delete"
        isDestructive
        isLoading={deletingIds.length > 0}
      />
    </div>
  )
}
