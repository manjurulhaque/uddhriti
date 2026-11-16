import * as React from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { PublicLayout } from "@/components/public"
import { formatCountWithNoun } from "@/lib/formatters"
import { sanitizeSearchQuery } from "@/lib/security/input"
import { registerPublicDataInvalidator } from "@/lib/revalidation"

export const metadata: Metadata = {
  title: "Literary Tags & Catalog",
  description:
    "Browse quotes across nuanced dimensions: philosophical schools, emotional states, timeless virtues, literary eras, and human values.",
}

export const revalidate = 300

interface TagItem {
  id: string
  name: string
  slug: string
  type: string
  quoteCount: number
}

// In-memory cache for default tags index (15 min TTL)
let cachedDefaultTags: {
  tags: TagItem[]
  timestamp: number
} | null = null

registerPublicDataInvalidator(() => {
  cachedDefaultTags = null
})

async function loadTagsPageData(searchQuery?: string): Promise<TagItem[]> {
  const isDefault = !searchQuery
  const now = Date.now()

  if (isDefault && cachedDefaultTags && now - cachedDefaultTags.timestamp < 15 * 60 * 1000) {
    return cachedDefaultTags.tags
  }

  const whereConditions = {
    quoteCount: { gt: 0 },
    ...(searchQuery
      ? {
          name: {
            contains: searchQuery,
            mode: "insensitive" as const,
          },
        }
      : {}),
  }

  const tags = await prisma.tag.findMany({
    where: whereConditions,
    orderBy: [{ type: "asc" }, { quoteCount: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      quoteCount: true,
    },
  })

  if (isDefault) {
    cachedDefaultTags = {
      tags,
      timestamp: now,
    }
  }

  return tags
}

interface TagsPageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function TagsPage({ searchParams }: TagsPageProps) {
  const { q } = await searchParams
  const searchQuery = sanitizeSearchQuery(q, 100)
  const tags = await loadTagsPageData(searchQuery)

  // Group tags by type
  const groupedTags = tags.reduce((acc, tag) => {
    const key = tag.type
    if (!acc[key]) acc[key] = []
    acc[key].push(tag)
    return acc
  }, {} as Record<string, typeof tags>)

  const sortedTypes = Object.keys(groupedTags).sort()

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12 space-y-8 font-sans">
        {/* Editorial Header */}
        <div className="border-b border-stone-900/10 pb-6 sm:pb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-rust)]">
              Taxonomy Index
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--ink-900)]">
              Thematic Tags &amp; Motifs
            </h1>
            <p className="text-sm sm:text-base text-stone-600 leading-relaxed font-serif">
              Fine-grained indexing of concepts, virtues, human emotions, historic eras, and philosophical schools.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-end">
            <Link
              href="/quotes/random"
              prefetch={false}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-rust)]/30 bg-[#c76b3e]/10 px-3.5 py-1.5 text-xs font-semibold text-[var(--accent-rust)] transition hover:bg-[#c76b3e]/20 hover:border-[var(--accent-rust)]/50 hover:scale-[1.02] active:scale-[0.98] shadow-2xs"
              title="Discover a random quotation from the archive"
            >
              <span className="text-sm" aria-hidden="true">🎲</span>
              <span>Random Quote</span>
            </Link>

            <div className="flex items-center gap-2 text-xs font-mono text-stone-500 bg-white/70 rounded-full px-4 py-2 border border-stone-200 shadow-2xs">
              <span>Tags:</span>
              <span className="font-bold text-stone-900">{formatCountWithNoun(tags.length, "active tag")}</span>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <form method="GET" action="/tags" className="relative flex-1">
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="Search tags by keyword (e.g. stoicism, hope, justice, solitude)..."
              className="w-full rounded-2xl border border-stone-300/80 bg-white px-4 py-3 text-base sm:text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 shadow-2xs transition-all"
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
              href="/tags"
              className="inline-flex items-center justify-center rounded-2xl border border-stone-200 bg-white px-4 py-3 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition-all"
            >
              Clear Search
            </Link>
          )}
        </div>

        {/* Grouped Tag Clouds */}
        {sortedTypes.length > 0 ? (
          <div className="space-y-8">
            {sortedTypes.map((type) => {
              const group = groupedTags[type]
              return (
                <section
                  key={type}
                  className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[var(--accent-rust)]" />
                      <h2 className="font-serif text-xl font-bold tracking-tight text-[var(--ink-900)]">
                        {type.replace(/_/g, " ")}
                      </h2>
                    </div>
                    <span className="text-xs font-mono text-stone-400">
                      {group.length} tags
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {group.map((tag) => (
                      <Link
                        key={tag.id}
                        href={`/tags/${tag.slug}`}
                        className="group inline-flex items-center gap-2 rounded-xl border border-stone-200/90 bg-stone-50/60 px-3.5 py-2 text-xs text-stone-800 hover:border-stone-900 hover:bg-white hover:shadow-2xs transition-all"
                      >
                        <span className="font-medium group-hover:text-stone-950">
                          {tag.name}
                        </span>
                        <span className="rounded-full bg-stone-200/80 px-2 py-0.5 text-[10px] font-mono font-semibold text-stone-600 group-hover:bg-stone-900 group-hover:text-white transition-colors">
                          {tag.quoteCount}
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center text-stone-500">
            No tags found matching &ldquo;{searchQuery}&rdquo;.
          </div>
        )}
      </div>
    </PublicLayout>
  )
}
