"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { formatDateInAppTimeZone } from "@/lib/datetime"
import { formatLifespan } from "@/lib/formatters"
import {
  FilterToolbar,
  AdminEntityCard,
  AdminEntityCountBadge,
  AdminBulkActionBar,
} from "@/components/admin"
import { Select, EmptyState, Pagination } from "@/components/ui"
import { AuthorBioGeneratorModal } from "@/components/admin/authors/AuthorBioGeneratorModal"
import { BatchBioGeneratorModal } from "@/components/admin/authors/BatchBioGeneratorModal"

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
  hasBio?: boolean
  bio?: string | null
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
type BioFilter = "all" | "missing-bio" | "has-bio"

export function AuthorsListManager({ authors }: { authors: AuthorItem[] }) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [quoteFilter, setQuoteFilter] = useState<QuoteFilter>("all")
  const [lifeStatusFilter, setLifeStatusFilter] = useState<LifeStatusFilter>("all")
  const [nationalityFilter, setNationalityFilter] = useState("all")
  const [professionFilter, setProfessionFilter] = useState("all")
  const [bioFilter, setBioFilter] = useState<BioFilter>("all")
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isBatchBioOpen, setIsBatchBioOpen] = useState(false)
  const [studioAuthor, setStudioAuthor] = useState<AuthorItem | null>(null)

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
    bioFilter !== "all" ||
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

      const matchesBioFilter =
        bioFilter === "all" ||
        (bioFilter === "missing-bio" && !author.hasBio) ||
        (bioFilter === "has-bio" && Boolean(author.hasBio))

      return (
        matchesSearch &&
        matchesQuoteFilter &&
        matchesLifeStatus &&
        matchesNationality &&
        matchesProfession &&
        matchesBioFilter
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
  }, [authors, lifeStatusFilter, nationalityFilter, professionFilter, quoteFilter, bioFilter, search, sortBy])

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
    setBioFilter("all")
    setSortBy("newest")
    setPage(1)
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  function handleSelectMissingBios() {
    const missing = visibleAuthors.filter((a) => !a.hasBio).map((a) => a.id)
    setSelectedIds(missing)
  }

  function handleSelectAllVisible() {
    setSelectedIds(visibleAuthors.map((a) => a.id))
  }

  async function handleApplyStudioBio(newBio: string) {
    if (!studioAuthor) return
    try {
      await fetch(`/api/admin/authors/${studioAuthor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: newBio }),
      })
      router.refresh()
    } catch {
      // Ignore
    }
  }

  const missingBioCount = useMemo(
    () => visibleAuthors.filter((a) => !a.hasBio).length,
    [visibleAuthors]
  )

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
      {/* Sticky Bulk Action Bar */}
      <AdminBulkActionBar
        selectedCount={selectedIds.length}
        entityLabel="author"
        onDeselectAll={() => setSelectedIds([])}
      >
        <button
          type="button"
          onClick={() => setIsBatchBioOpen(true)}
          className="bg-violet-600 text-white font-semibold text-xs px-3 py-1.5 rounded-lg hover:bg-violet-700 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
        >
          <span>⚡</span>
          <span>Batch Generate Bios ({selectedIds.length})</span>
        </button>

        {missingBioCount > 0 && (
          <button
            type="button"
            onClick={handleSelectMissingBios}
            className="bg-stone-800 text-stone-200 text-xs px-2.5 py-1.5 rounded-lg hover:bg-stone-700 transition cursor-pointer"
          >
            Select All Missing Bios ({missingBioCount})
          </button>
        )}

        <button
          type="button"
          onClick={handleSelectAllVisible}
          className="bg-stone-800 text-stone-200 text-xs px-2.5 py-1.5 rounded-lg hover:bg-stone-700 transition cursor-pointer"
        >
          Select All Visible ({visibleAuthors.length})
        </button>
      </AdminBulkActionBar>

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
              value={bioFilter}
              onChange={(event) => {
                setBioFilter(event.target.value as BioFilter)
                setPage(1)
              }}
              options={[
                { value: "all", label: "Bio: All authors" },
                { value: "missing-bio", label: "Bio: Missing bio" },
                { value: "has-bio", label: "Bio: Has biography" },
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
                  selected={selectedIds.includes(author.id)}
                  onSelect={() => toggleSelect(author.id)}
                  badge={
                    <div className="flex items-center gap-1.5">
                      {!author.hasBio && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
                          No Bio
                        </span>
                      )}
                      <AdminEntityCountBadge count={author.quoteCount} />
                    </div>
                  }
                  meta={
                    <div className="flex items-center justify-between w-full pt-1">
                      <span className="text-[11px] text-stone-400">
                        Added {formatDateInAppTimeZone(author.createdAt)}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setStudioAuthor(author)
                          }}
                          className="text-[11px] font-medium text-violet-700 hover:text-violet-900 bg-violet-50 hover:bg-violet-100 border border-violet-200/60 px-2 py-0.5 rounded-md transition cursor-pointer"
                          title="Open AI Bio Studio"
                        >
                          ✨ Bio Studio
                        </button>
                        {author.quoteCount > 0 && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              router.push(`/admin/quotes?author=${author.slug}`)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                e.stopPropagation()
                                router.push(`/admin/quotes?author=${author.slug}`)
                              }
                            }}
                            className="text-xs font-semibold text-stone-700 hover:text-black hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                            title={`View ${author.quoteCount} quotes by ${author.name}`}
                          >
                            Quotes &rarr;
                          </span>
                        )}
                      </div>
                    </div>
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

      {/* Batch Bio Generator Modal */}
      <BatchBioGeneratorModal
        isOpen={isBatchBioOpen}
        onClose={() => {
          setIsBatchBioOpen(false)
          setSelectedIds([])
        }}
        authorIds={selectedIds}
        authors={authors}
        onComplete={() => {
          router.refresh()
        }}
      />

      {/* Individual Author AI Bio Studio Modal */}
      {studioAuthor && (
        <AuthorBioGeneratorModal
          isOpen={Boolean(studioAuthor)}
          onClose={() => setStudioAuthor(null)}
          author={{
            id: studioAuthor.id,
            name: studioAuthor.name,
            profession: studioAuthor.profession,
            nationality: studioAuthor.nationality,
            birthYear: studioAuthor.birthYear,
            deathYear: studioAuthor.deathYear,
            currentBio: studioAuthor.bio,
          }}
          onApplyBio={handleApplyStudioBio}
        />
      )}
    </div>
  )
}
