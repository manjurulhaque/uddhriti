import * as React from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { PublicLayout } from "@/components/public"
import { formatCountWithNoun, formatNumber, getCategoryMeta } from "@/lib/formatters"
import { registerPublicDataInvalidator } from "@/lib/revalidation"

export const metadata: Metadata = {
  title: "Thematic Categories",
  description:
    "Explore timeless quotations organized by enduring philosophical and human themes: Wisdom, Love, Courage, Science, Truth, and Art.",
}

export const revalidate = 300

interface CategoryItem {
  id: string
  name: string
  slug: string
  description: string | null
  quoteCount: number
  quotes: Array<{
    content: string
    authorName: string | null
  }>
}

interface CategoriesPageData {
  categories: CategoryItem[]
  maxCategoryQuotes: number
  totalQuotesCount: number
}

// In-memory cache with 15-minute TTL
let cachedCategoriesData: {
  data: CategoriesPageData
  timestamp: number
} | null = null

registerPublicDataInvalidator(() => {
  cachedCategoriesData = null
})

async function loadCategoriesPageData(): Promise<CategoriesPageData> {
  const now = Date.now()
  if (cachedCategoriesData && now - cachedCategoriesData.timestamp < 15 * 60 * 1000) {
    return cachedCategoriesData.data
  }

  const categories = await prisma.category.findMany({
    orderBy: [{ quoteCount: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      quoteCount: true,
      quotes: {
        where: { status: "PUBLISHED", deletedAt: null },
        take: 1,
        orderBy: [{ popularityScore: "desc" }, { id: "asc" }],
        select: {
          content: true,
          authorName: true,
        },
      },
    },
  })

  const maxCategoryQuotes = Math.max(...categories.map((c) => c.quoteCount), 1)
  const totalQuotesCount = categories.reduce((sum, c) => sum + c.quoteCount, 0)

  const data: CategoriesPageData = {
    categories,
    maxCategoryQuotes,
    totalQuotesCount,
  }

  cachedCategoriesData = {
    data,
    timestamp: now,
  }

  return data
}

export default async function CategoriesPage() {
  const { categories, maxCategoryQuotes, totalQuotesCount } = await loadCategoriesPageData()

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
              Thematic Categories
            </h1>
            <p className="text-sm sm:text-base text-stone-600 leading-relaxed font-serif">
              Navigate human wisdom across fundamental realms of experience, thought, morality, and understanding.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-end">
            <div className="flex items-center gap-2 text-xs font-mono text-stone-600 bg-white/90 rounded-full px-4 py-2 border border-stone-200 shadow-2xs">
              <span>Themes:</span>
              <span className="font-bold text-stone-900">{categories.length} realms</span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-stone-600 bg-white/90 rounded-full px-4 py-2 border border-stone-200 shadow-2xs">
              <span>Archived:</span>
              <span className="font-bold text-[var(--accent-rust)]">{formatNumber(totalQuotesCount)} reflections</span>
            </div>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => {
            const meta = getCategoryMeta(category.name)
            const sampleQuote = category.quotes[0]
            const percentage = Math.max(15, Math.round((category.quoteCount / maxCategoryQuotes) * 100))

            return (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-[1.75rem] border bg-gradient-to-b ${meta.gradient} bg-white p-6 shadow-2xs transition-all duration-300 hover:-translate-y-1 hover:shadow-lg active:scale-[0.99] h-full ${meta.border}`}
              >
                <div className="space-y-4">
                  {/* Top Bar: Icon + Badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-2xl transition-transform duration-300 group-hover:scale-110">
                      {meta.icon}
                    </span>

                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${meta.badge}`}>
                      {formatCountWithNoun(category.quoteCount, "quote")}
                    </span>
                  </div>

                  <div>
                    <h2 className="font-serif text-2xl font-bold tracking-tight text-stone-900 group-hover:text-[var(--accent-rust)] transition-colors">
                      {category.name}
                    </h2>

                    {category.description ? (
                      <p className="text-xs text-stone-600 leading-relaxed mt-1 line-clamp-2">
                        {category.description}
                      </p>
                    ) : (
                      <p className="text-xs text-stone-500 italic mt-1">
                        Curated philosophical reflections and memorable passages on {category.name.toLowerCase()}.
                      </p>
                    )}
                  </div>

                  {/* Relative Collection Depth Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      <span>Archive Depth</span>
                      <span>{percentage}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent-rust)] transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Featured Excerpt Quote */}
                  <div className="rounded-xl border border-stone-200/80 bg-white/90 p-3.5 space-y-1.5 shadow-2xs">
                    <blockquote className="font-serif italic text-xs text-stone-800 line-clamp-3 leading-relaxed">
                      {sampleQuote?.content
                        ? `“${sampleQuote.content}”`
                        : `Explore preserved literary quotations and philosophical passages on ${category.name.toLowerCase()}.`}
                    </blockquote>
                    {sampleQuote?.authorName && (
                      <p className="text-[11px] text-stone-500 font-sans text-right">
                        — {sampleQuote.authorName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-3 text-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent-rust)]">
                    Explore Theme
                  </span>

                  <span className="font-bold text-[var(--accent-rust)] group-hover:translate-x-1 transition-transform">
                    &rarr;
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </PublicLayout>
  )
}
