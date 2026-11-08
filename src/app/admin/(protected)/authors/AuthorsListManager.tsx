"use client"

import { useMemo, useState } from "react"
import { formatDateInAppTimeZone } from "@/lib/datetime"
import { formatLifespan } from "@/lib/formatters"
import { FilterToolbar, AdminEntityCard, AdminEntityCountBadge } from "@/components/admin"
import { Select, EmptyState, Pagination } from "@/components/ui"

const PAGE_SIZE = 24

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
  const [page, setPage] = useState(1)

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

  const totalPages = Math.max(1, Math.ceil(visibleAuthors.length / PAGE_SIZE))
  const paginatedAuthors = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return visibleAuthors.slice(start, start + PAGE_SIZE)
  }, [visibleAuthors, page])

  function clearFilters() {
    setSearch("")
    setQuoteFilter("all")
    setLifeStatusFilter("all")
    setNationalityFilter("all")
    setProfessionFilter("all")
    setSortBy("newest")
    setPage(1)
  }

  const sortOptions = [
    { value: "newest", label: "Arrange: Newest first" },
    { value: "oldest", label: "Arrange: Oldest first" },
    { value: "name-asc", label: "Sort: Name A-Z" },
    { value: "name-desc", label: "Sort: Name Z-A" },
    { value: "most-quotes", label: "Arrange: Most quotes" },
    { value: "least-quotes", label: "Arrange: Fewest quotes" },
    { value: "birth-asc", label: "Sort: Earliest birth year" },
    { value: "birth-desc", label: "Sort: Latest birth year" },
  ]

  return (
    <div className="space-y-4">
      <FilterToolbar
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value)
          setPage(1)
        }}
        searchPlaceholder="Search authors by name, slug, profession, nationality, or years"
        sortValue={sortBy}
        onSortChange={(value) => {
          setSortBy(value as SortOption)
          setPage(1)
        }}
        sortOptions={sortOptions}
        visibleCount={visibleAuthors.length}
        totalCount={authors.length}
        itemLabel="authors"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        filters={
          <>
            <Select
              value={quoteFilter}
              onChange={(event) => {
                setQuoteFilter(event.target.value as QuoteFilter)
                setPage(1)
              }}
              options={[
                { value: "all", label: "Quotes: All authors" },
                { value: "with-quotes", label: "Quotes: Has quotes" },
                { value: "without-quotes", label: "Quotes: No quotes" },
              ]}
            />

            <Select
              value={lifeStatusFilter}
              onChange={(event) => {
                setLifeStatusFilter(event.target.value as LifeStatusFilter)
                setPage(1)
              }}
              options={[
                { value: "all", label: "Life status: All" },
                { value: "living", label: "Life status: Living" },
                { value: "deceased", label: "Life status: Deceased" },
                { value: "unknown", label: "Life status: Unknown" },
              ]}
            />

            <Select
              value={nationalityFilter}
              onChange={(event) => {
                setNationalityFilter(event.target.value)
                setPage(1)
              }}
              options={[
                { value: "all", label: "Nationality: All" },
                ...nationalityOptions.map((nat) => ({ value: nat, label: nat })),
              ]}
            />

            <Select
              value={professionFilter}
              onChange={(event) => {
                setProfessionFilter(event.target.value)
                setPage(1)
              }}
              options={[
                { value: "all", label: "Profession: All" },
                ...professionOptions.map((prof) => ({ value: prof, label: prof })),
              ]}
            />
          </>
        }
      />

      {visibleAuthors.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paginatedAuthors.map((author) => {
              const lifespan = formatLifespan(author)
              const subtitle = [
                author.profession,
                author.nationality,
                lifespan,
              ]
                .filter(Boolean)
                .join(" • ")

              return (
                <AdminEntityCard
                  key={author.id}
                  href={`/admin/authors/${author.id}`}
                  variant="grid"
                  title={author.name}
                  subtitle={subtitle || undefined}
                  badge={<AdminEntityCountBadge count={author.quoteCount} />}
                  meta={
                    <span className="text-[11px] text-stone-400">
                      Added {formatDateInAppTimeZone(author.createdAt)}
                    </span>
                  }
                />
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="pt-2">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={visibleAuthors.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      ) : (
        <EmptyState
          title="No authors match your search"
          description="Try clearing filters or searching for a different keyword."
          variant="stone"
        />
      )}
    </div>
  )
}
