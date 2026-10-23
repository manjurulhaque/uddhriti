"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { formatSourceYearLabel } from "@/lib/sourceYear"
import { FilterToolbar } from "@/components/admin"
import { Select, EmptyState } from "@/components/ui"

type SourceItem = {
  id: string
  title: string
  type: string
  year: number | null
  yearLabel?: string | null
  yearApproximate?: boolean
  authorName: string | null
  quoteCount: number
  createdAt: string
}

type SortOption =
  | "newest"
  | "oldest"
  | "title-asc"
  | "title-desc"
  | "year-desc"
  | "year-asc"
  | "most-quotes"
  | "least-quotes"

type QuoteFilter = "all" | "with-quotes" | "without-quotes"
type AuthorFilter = "all" | "with-author" | "without-author"

const sortOptions = [
  { value: "newest", label: "Arrange: Newest first" },
  { value: "oldest", label: "Arrange: Oldest first" },
  { value: "title-asc", label: "Sort: Title A-Z" },
  { value: "title-desc", label: "Sort: Title Z-A" },
  { value: "year-desc", label: "Sort: Latest year" },
  { value: "year-asc", label: "Sort: Earliest year" },
  { value: "most-quotes", label: "Arrange: Most quotes" },
  { value: "least-quotes", label: "Arrange: Fewest quotes" },
]

export function SourcesListManager({ sources }: { sources: SourceItem[] }) {
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [typeFilter, setTypeFilter] = useState("all")
  const [quoteFilter, setQuoteFilter] = useState<QuoteFilter>("all")
  const [authorFilter, setAuthorFilter] = useState<AuthorFilter>("all")

  const typeOptions = useMemo(
    () => Array.from(new Set(sources.map((source) => source.type))).sort((a, b) => a.localeCompare(b)),
    [sources]
  )

  const visibleSources = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const filtered = sources.filter((source) => {
      const yearText = formatSourceYearLabel(source) ?? ""
      const matchesSearch = needle
        ? [source.title, source.type, source.authorName ?? "", yearText]
            .join(" ")
            .toLowerCase()
            .includes(needle)
        : true

      const matchesType = typeFilter === "all" || source.type === typeFilter
      const matchesQuoteFilter =
        quoteFilter === "all" ||
        (quoteFilter === "with-quotes" && source.quoteCount > 0) ||
        (quoteFilter === "without-quotes" && source.quoteCount === 0)
      const matchesAuthorFilter =
        authorFilter === "all" ||
        (authorFilter === "with-author" && Boolean(source.authorName)) ||
        (authorFilter === "without-author" && !source.authorName)

      return matchesSearch && matchesType && matchesQuoteFilter && matchesAuthorFilter
    })

    return [...filtered].sort((a, b) => {
      const titleA = a.title.toLowerCase()
      const titleB = b.title.toLowerCase()
      const yearA = a.year ?? Number.NEGATIVE_INFINITY
      const yearB = b.year ?? Number.NEGATIVE_INFINITY

      switch (sortBy) {
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case "title-asc":
          return titleA.localeCompare(titleB)
        case "title-desc":
          return titleB.localeCompare(titleA)
        case "year-desc":
          return yearB - yearA || titleA.localeCompare(titleB)
        case "year-asc":
          return yearA - yearB || titleA.localeCompare(titleB)
        case "most-quotes":
          return b.quoteCount - a.quoteCount || titleA.localeCompare(titleB)
        case "least-quotes":
          return a.quoteCount - b.quoteCount || titleA.localeCompare(titleB)
        case "newest":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })
  }, [authorFilter, quoteFilter, search, sortBy, sources, typeFilter])

  const hasActiveFilters =
    search.trim().length > 0 ||
    sortBy !== "newest" ||
    typeFilter !== "all" ||
    quoteFilter !== "all" ||
    authorFilter !== "all"

  function clearFilters() {
    setSearch("")
    setSortBy("newest")
    setTypeFilter("all")
    setQuoteFilter("all")
    setAuthorFilter("all")
  }

  return (
    <div className="space-y-4">
      <FilterToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search sources by title, type, author, or year"
        sortValue={sortBy}
        onSortChange={(value) => setSortBy(value as SortOption)}
        sortOptions={sortOptions}
        visibleCount={visibleSources.length}
        totalCount={sources.length}
        itemLabel="sources"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        filters={
          <>
            <Select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              options={[
                { value: "all", label: "Type: All" },
                ...typeOptions.map((type) => ({ value: type, label: `Type: ${type}` })),
              ]}
            />

            <Select
              value={quoteFilter}
              onChange={(event) => setQuoteFilter(event.target.value as QuoteFilter)}
              options={[
                { value: "all", label: "Quotes: All sources" },
                { value: "with-quotes", label: "Quotes: Has quotes" },
                { value: "without-quotes", label: "Quotes: No quotes" },
              ]}
            />

            <Select
              value={authorFilter}
              onChange={(event) => setAuthorFilter(event.target.value as AuthorFilter)}
              options={[
                { value: "all", label: "Author: All" },
                { value: "with-author", label: "Author: Has author" },
                { value: "without-author", label: "Author: No author" },
              ]}
            />
          </>
        }
      />

      {visibleSources.length > 0 ? (
        <div className="space-y-2">
          {visibleSources.map((source) => (
            <SourceListRow key={source.id} source={source} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No sources match your filters"
          description="Try adjusting your search terms or clearing your filters to see more sources."
          action={
            hasActiveFilters
              ? { label: "Clear filters", onClick: clearFilters }
              : undefined
          }
        />
      )}
    </div>
  )
}

function SourceListRow({ source }: { source: SourceItem }) {
  const yearText = formatSourceYearLabel(source) ?? "-"

  return (
    <Link
      href={`/admin/sources/${source.id}`}
      className="group block rounded-xl border border-stone-200/90 bg-white p-4 transition-all duration-150 hover:border-stone-400 hover:shadow-xs"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-semibold text-stone-900 group-hover:text-black">{source.title}</div>
          <div className="text-sm text-stone-500 mt-0.5">
            {[source.type, yearText, source.authorName || "No Author"].join(" • ")}
          </div>
        </div>
        <div className="shrink-0 text-xs font-medium text-stone-600 bg-stone-100 rounded-lg px-2.5 py-1">
          Quotes: <span className="font-bold text-stone-900">{source.quoteCount}</span>
        </div>
      </div>
    </Link>
  )
}
