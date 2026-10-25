import * as React from "react"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { PublicLayout } from "@/components/public"
import { Pagination } from "@/components/ui/pagination"
import { formatCountWithNoun } from "@/lib/formatters"

export const metadata: Metadata = {
  title: "Authors & Thinkers | Uddhriti",
  description:
    "Explore timeless wisdom from history's greatest philosophers, writers, poets, and leaders.",
}

const PAGE_SIZE = 24
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")

interface AuthorsPageProps {
  searchParams: Promise<{
    q?: string
    letter?: string
    page?: string
  }>
}

export default async function AuthorsPage({ searchParams }: AuthorsPageProps) {
  const { q, letter, page } = await searchParams
  const currentPage = Math.max(1, Number(page) || 1)
  const searchQuery = q?.trim() || ""
  const selectedLetter = letter?.toUpperCase() || ""

  // Build where conditions
  const whereConditions: {
    quoteCount?: { gt: number }
    name?: { contains: string; mode: "insensitive" }
    nameNormalized?: { startsWith: string }
  } = {
    quoteCount: { gt: 0 },
  }

  if (searchQuery) {
    whereConditions.name = {
      contains: searchQuery,
      mode: "insensitive",
    }
  } else if (selectedLetter && selectedLetter !== "ALL") {
    whereConditions.nameNormalized = {
      startsWith: selectedLetter.toLowerCase(),
    }
  }

  const [totalAuthors, authors] = await Promise.all([
    prisma.author.count({ where: whereConditions }),
    prisma.author.findMany({
      where: whereConditions,
      orderBy: searchQuery || selectedLetter ? { name: "asc" } : { quoteCount: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        slug: true,
        profession: true,
        nationality: true,
        birthYear: true,
        deathYear: true,
        imageUrl: true,
        quoteCount: true,
      },
    }),
  ])

  const totalPages = Math.ceil(totalAuthors / PAGE_SIZE)

  function buildHref(newPage: number) {
    const params = new URLSearchParams()
    if (searchQuery) params.set("q", searchQuery)
    if (selectedLetter && selectedLetter !== "ALL") params.set("letter", selectedLetter)
    if (newPage > 1) params.set("page", String(newPage))
    const qs = params.toString()
    return `/authors${qs ? `?${qs}` : ""}`
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12 space-y-8 font-sans">
        {/* Editorial Page Header */}
        <div className="border-b border-stone-900/10 pb-6 sm:pb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-rust)]">
              Literary Directory
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--ink-900)]">
              Authors &amp; Thinkers
            </h1>
            <p className="text-sm sm:text-base text-stone-600 leading-relaxed font-serif">
              Discover profound words from philosophers, statesmen, poets, and visionaries whose ideas shaped civilization.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-stone-500 bg-white/70 rounded-full px-4 py-2 border border-stone-200 shadow-2xs self-start md:self-end">
            <span>Catalog:</span>
            <span className="font-bold text-stone-900">{formatCountWithNoun(totalAuthors, "voice")}</span>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <form method="GET" action="/authors" className="relative flex-1">
              <input
                type="text"
                name="q"
                defaultValue={searchQuery}
                placeholder="Search authors by name, profession, or nationality..."
                className="w-full rounded-2xl border border-stone-300/80 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 shadow-2xs transition-all"
              />
              <button
                type="submit"
                className="absolute right-2 top-2 rounded-xl bg-stone-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-black transition-all cursor-pointer"
              >
                Search
              </button>
            </form>

            {searchQuery && (
              <Link
                href="/authors"
                className="inline-flex items-center justify-center rounded-2xl border border-stone-200 bg-white px-4 py-3 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition-all"
              >
                Clear Search
              </Link>
            )}
          </div>

          {/* Alphabet Bar */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 py-1 overflow-x-auto">
            <Link
              href="/authors"
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                !selectedLetter || selectedLetter === "ALL"
                  ? "bg-stone-900 text-white"
                  : "bg-white/80 text-stone-700 hover:bg-stone-900/5 border border-stone-200"
              }`}
            >
              All
            </Link>
            {ALPHABET.map((char) => {
              const isActive = selectedLetter === char
              return (
                <Link
                  key={char}
                  href={`/authors?letter=${char}`}
                  className={`rounded-lg h-7 w-7 sm:h-8 sm:w-8 inline-flex items-center justify-center text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-stone-900 text-white shadow-2xs"
                      : "bg-white/80 text-stone-700 hover:bg-stone-900/5 border border-stone-200/80"
                  }`}
                >
                  {char}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Authors Grid */}
        {authors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {authors.map((author) => {
              const lifespan =
                author.birthYear || author.deathYear
                  ? `${author.birthYear ?? "?"} – ${author.deathYear ?? (author.birthYear ? "Present" : "")}`
                  : null

              return (
                <Link
                  key={author.id}
                  href={`/authors/${author.slug}`}
                  className="group flex flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-5 shadow-2xs hover:border-stone-400 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div className="flex items-start gap-4">
                    {/* Author Portrait or Monogram */}
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-stone-100 border border-stone-200/80">
                      {author.imageUrl ? (
                        <Image
                          src={author.imageUrl}
                          alt={author.name}
                          fill
                          sizes="56px"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center font-serif text-xl font-bold italic text-stone-400 bg-[var(--page-cream)]">
                          {author.name.charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <h2 className="font-serif text-base font-bold text-stone-900 group-hover:text-[var(--accent-rust)] transition-colors line-clamp-1">
                        {author.name}
                      </h2>
                      {author.profession && (
                        <p className="text-xs text-stone-500 line-clamp-1">
                          {author.profession}
                        </p>
                      )}
                      {author.nationality && (
                        <p className="text-[11px] text-stone-400 line-clamp-1">
                          {author.nationality}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                    <span className="font-mono text-[11px] text-stone-400">
                      {lifespan ?? "Historic Voice"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-semibold text-stone-700">
                      {formatCountWithNoun(author.quoteCount, "quote")}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center space-y-3">
            <span className="text-3xl">📜</span>
            <h3 className="font-serif text-lg font-bold text-stone-900">
              No Authors Found
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              We couldn&apos;t find any authors matching &ldquo;{searchQuery || selectedLetter}&rdquo;. Try browsing all letters or clear your search query.
            </p>
            <Link
              href="/authors"
              className="inline-flex items-center rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-black transition-all"
            >
              Browse All Authors
            </Link>
          </div>
        )}

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalAuthors}
          pageSize={PAGE_SIZE}
          buildHref={buildHref}
        />
      </div>
    </PublicLayout>
  )
}
