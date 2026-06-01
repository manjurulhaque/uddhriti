"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { formatSourceYearLabel } from "@/lib/sourceYear"

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
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search sources by title, type, author, or year"
          className="w-full rounded border px-3 py-2 text-sm md:flex-1"
        />
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as SortOption)}
          className="rounded border px-3 py-2 text-sm md:w-56"
        >
          <option value="newest">Arrange: Newest first</option>
          <option value="oldest">Arrange: Oldest first</option>
          <option value="title-asc">Sort: Title A-Z</option>
          <option value="title-desc">Sort: Title Z-A</option>
          <option value="year-desc">Sort: Latest year</option>
          <option value="year-asc">Sort: Earliest year</option>
          <option value="most-quotes">Arrange: Most quotes</option>
          <option value="least-quotes">Arrange: Fewest quotes</option>
        </select>
      </div>

      <div className="rounded-lg border bg-gray-50 p-3">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="rounded border bg-white px-3 py-2 text-sm"
            >
              <option value="all">Type: All</option>
              {typeOptions.map((type) => (
                <option key={type} value={type}>
                  Type: {type}
                </option>
              ))}
            </select>

            <select
              value={quoteFilter}
              onChange={(event) => setQuoteFilter(event.target.value as QuoteFilter)}
              className="rounded border bg-white px-3 py-2 text-sm"
            >
              <option value="all">Quotes: All sources</option>
              <option value="with-quotes">Quotes: Has quotes</option>
              <option value="without-quotes">Quotes: No quotes</option>
            </select>

            <select
              value={authorFilter}
              onChange={(event) => setAuthorFilter(event.target.value as AuthorFilter)}
              className="rounded border bg-white px-3 py-2 text-sm"
            >
              <option value="all">Author: All</option>
              <option value="with-author">Author: Has author</option>
              <option value="without-author">Author: No author</option>
            </select>
          </div>

          <div className="flex flex-col gap-2 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
            <div>
              Showing <span className="font-medium text-gray-900">{visibleSources.length}</span> of{" "}
              <span className="font-medium text-gray-900">{sources.length}</span> sources
            </div>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded border bg-white px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-100"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {visibleSources.length > 0 ? (
        <div className="space-y-2">
          {visibleSources.map((source) => (
            <SourceListRow key={source.id} source={source} />
          ))}
        </div>
      ) : (
        <div className="rounded border border-dashed p-4 text-sm text-gray-500">
          No sources match your filters.
        </div>
      )}
    </div>
  )
}

function SourceListRow({ source }: { source: SourceItem }) {
  const yearText = formatSourceYearLabel(source) ?? "-"

  return (
    <Link
      href={`/admin/sources/${source.id}`}
      className="block rounded border p-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-semibold">{source.title}</div>
          <div className="text-sm text-gray-500">
            {[source.type, yearText, source.authorName || "No Author"].join(" • ")}
          </div>
        </div>
        <div className="text-sm text-gray-500">
          Quotes: <span className="font-medium text-gray-900">{source.quoteCount}</span>
        </div>
      </div>
    </Link>
  )
}
