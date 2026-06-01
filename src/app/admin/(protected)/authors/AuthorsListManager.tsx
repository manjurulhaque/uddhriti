"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { formatDateInAppTimeZone } from "@/lib/datetime"

type AuthorItem = {
  id: string
  name: string
  slug: string
  birthYear: number | null
  deathYear: number | null
  profession: string | null
  nationality: string | null
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
  | "birth-asc"
  | "birth-desc"

type QuoteFilter = "all" | "with-quotes" | "without-quotes"
type LifeStatusFilter = "all" | "living" | "deceased" | "unknown"

export function AuthorsListManager({ authors }: { authors: AuthorItem[] }) {
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [quoteFilter, setQuoteFilter] = useState<QuoteFilter>("all")
  const [lifeStatusFilter, setLifeStatusFilter] = useState<LifeStatusFilter>("all")
  const [nationalityFilter, setNationalityFilter] = useState("all")
  const [professionFilter, setProfessionFilter] = useState("all")

  const nationalityOptions = useMemo(
    () =>
      Array.from(
        new Set(
          authors
            .map((author) => author.nationality?.trim())
            .filter((value): value is string => Boolean(value))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [authors]
  )
  const professionOptions = useMemo(
    () =>
      Array.from(
        new Set(
          authors
            .map((author) => author.profession?.trim())
            .filter((value): value is string => Boolean(value))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [authors]
  )
  const hasActiveFilters =
    quoteFilter !== "all" ||
    lifeStatusFilter !== "all" ||
    nationalityFilter !== "all" ||
    professionFilter !== "all" ||
    search.trim().length > 0

  const visibleAuthors = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const filtered = authors.filter((author) => {
      const matchesSearch = needle
        ? [
            author.name,
            author.slug,
            author.profession ?? "",
            author.nationality ?? "",
            author.birthYear?.toString() ?? "",
            author.deathYear?.toString() ?? "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(needle)
        : true

      const matchesQuoteFilter =
        quoteFilter === "all" ||
        (quoteFilter === "with-quotes" && author.quoteCount > 0) ||
        (quoteFilter === "without-quotes" && author.quoteCount === 0)

      const isLiving = author.birthYear !== null && author.deathYear === null
      const isDeceased = author.deathYear !== null
      const isUnknown = author.birthYear === null && author.deathYear === null
      const matchesLifeStatus =
        lifeStatusFilter === "all" ||
        (lifeStatusFilter === "living" && isLiving) ||
        (lifeStatusFilter === "deceased" && isDeceased) ||
        (lifeStatusFilter === "unknown" && isUnknown)

      const matchesNationality =
        nationalityFilter === "all" || (author.nationality?.trim() ?? "") === nationalityFilter

      const matchesProfession =
        professionFilter === "all" || (author.profession?.trim() ?? "") === professionFilter

      return (
        matchesSearch &&
        matchesQuoteFilter &&
        matchesLifeStatus &&
        matchesNationality &&
        matchesProfession
      )
    })

    return [...filtered].sort((a, b) => {
      const nameA = a.name.toLowerCase()
      const nameB = b.name.toLowerCase()
      const birthA = a.birthYear ?? Number.POSITIVE_INFINITY
      const birthB = b.birthYear ?? Number.POSITIVE_INFINITY

      switch (sortBy) {
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case "name-asc":
          return nameA.localeCompare(nameB)
        case "name-desc":
          return nameB.localeCompare(nameA)
        case "most-quotes":
          return b.quoteCount - a.quoteCount || nameA.localeCompare(nameB)
        case "least-quotes":
          return a.quoteCount - b.quoteCount || nameA.localeCompare(nameB)
        case "birth-asc":
          return birthA - birthB || nameA.localeCompare(nameB)
        case "birth-desc":
          return birthB - birthA || nameA.localeCompare(nameB)
        case "newest":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })
  }, [authors, lifeStatusFilter, nationalityFilter, professionFilter, quoteFilter, search, sortBy])

  function clearFilters() {
    setSearch("")
    setQuoteFilter("all")
    setLifeStatusFilter("all")
    setNationalityFilter("all")
    setProfessionFilter("all")
    setSortBy("newest")
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search authors by name, slug, profession, nationality, or years"
          className="w-full rounded border px-3 py-2 text-sm md:flex-1"
        />
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as SortOption)}
          className="rounded border px-3 py-2 text-sm md:w-56"
        >
          <option value="newest">Arrange: Newest first</option>
          <option value="oldest">Arrange: Oldest first</option>
          <option value="name-asc">Sort: Name A-Z</option>
          <option value="name-desc">Sort: Name Z-A</option>
          <option value="most-quotes">Arrange: Most quotes</option>
          <option value="least-quotes">Arrange: Fewest quotes</option>
          <option value="birth-asc">Sort: Earliest birth year</option>
          <option value="birth-desc">Sort: Latest birth year</option>
        </select>
      </div>

      <div className="rounded-lg border bg-gray-50 p-3">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
            <select
              value={quoteFilter}
              onChange={(event) => setQuoteFilter(event.target.value as QuoteFilter)}
              className="rounded border bg-white px-3 py-2 text-sm"
            >
              <option value="all">Quotes: All authors</option>
              <option value="with-quotes">Quotes: Has quotes</option>
              <option value="without-quotes">Quotes: No quotes</option>
            </select>

            <select
              value={lifeStatusFilter}
              onChange={(event) => setLifeStatusFilter(event.target.value as LifeStatusFilter)}
              className="rounded border bg-white px-3 py-2 text-sm"
            >
              <option value="all">Life status: All</option>
              <option value="living">Life status: Living</option>
              <option value="deceased">Life status: Deceased</option>
              <option value="unknown">Life status: Unknown</option>
            </select>

            <select
              value={nationalityFilter}
              onChange={(event) => setNationalityFilter(event.target.value)}
              className="rounded border bg-white px-3 py-2 text-sm"
            >
              <option value="all">Nationality: All</option>
              {nationalityOptions.map((nationality) => (
                <option key={nationality} value={nationality}>
                  {nationality}
                </option>
              ))}
            </select>

            <select
              value={professionFilter}
              onChange={(event) => setProfessionFilter(event.target.value)}
              className="rounded border bg-white px-3 py-2 text-sm"
            >
              <option value="all">Profession: All</option>
              {professionOptions.map((profession) => (
                <option key={profession} value={profession}>
                  {profession}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
            <div>
              Showing <span className="font-medium text-gray-900">{visibleAuthors.length}</span> of{" "}
              <span className="font-medium text-gray-900">{authors.length}</span> authors
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

      {visibleAuthors.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleAuthors.map((author) => (
            <Link
              key={author.id}
              href={`/admin/authors/${author.id}`}
              className="space-y-2 rounded-lg border bg-white p-4 transition hover:shadow-md"
            >
              <div className="text-lg font-semibold">{author.name}</div>

              {(author.birthYear || author.deathYear) && (
                <div className="text-sm text-gray-500">
                  {author.birthYear ?? "?"} - {author.deathYear ?? "Present"}
                </div>
              )}

              {author.profession || author.nationality ? (
                <div className="text-sm text-gray-500">
                  {[author.profession, author.nationality].filter(Boolean).join(" . ")}
                </div>
              ) : null}

              <div className="text-sm text-gray-600">
                Quotes: <span className="font-medium">{author.quoteCount}</span>
              </div>

              <div className="text-xs text-gray-400">
                Created {formatDateInAppTimeZone(author.createdAt)}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded border border-dashed p-4 text-sm text-gray-500">
          No authors match your search.
        </div>
      )}
    </div>
  )
}
