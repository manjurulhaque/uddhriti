import * as React from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { PublicLayout } from "@/components/public"
import { formatCountWithNoun } from "@/lib/formatters"

export const metadata: Metadata = {
  title: "Thematic Categories | Uddhriti",
  description:
    "Explore quotations organized by enduring philosophical and human themes: Wisdom, Love, Courage, Science, Truth, and Art.",
}

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { quoteCount: "desc" },
    include: {
      quotes: {
        where: { status: "PUBLISHED", deletedAt: null },
        take: 1,
        orderBy: { popularityScore: "desc" },
        select: {
          content: true,
          authorName: true,
        },
      },
    },
  })

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

          <div className="flex items-center gap-2 text-xs font-mono text-stone-500 bg-white/70 rounded-full px-4 py-2 border border-stone-200 shadow-2xs self-start md:self-end">
            <span>Themes:</span>
            <span className="font-bold text-stone-900">{categories.length} categories</span>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => {
            const sampleQuote = category.quotes[0]
            return (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="group flex flex-col justify-between rounded-3xl border border-stone-200/90 bg-white p-6 shadow-2xs hover:border-stone-400 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent-rust)]">
                      Topic
                    </span>
                    <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-semibold text-stone-700">
                      {formatCountWithNoun(category.quoteCount, "quote")}
                    </span>
                  </div>

                  <h2 className="font-serif text-2xl font-bold tracking-tight text-stone-900 group-hover:text-[var(--accent-rust)] transition-colors">
                    {category.name}
                  </h2>

                  {category.description && (
                    <p className="text-xs text-stone-500 leading-relaxed line-clamp-2">
                      {category.description}
                    </p>
                  )}
                </div>

                {sampleQuote && (
                  <div className="mt-5 pt-4 border-t border-stone-100 space-y-1.5">
                    <blockquote className="font-serif italic text-xs text-stone-700 line-clamp-2 leading-relaxed">
                      &ldquo;{sampleQuote.content}&rdquo;
                    </blockquote>
                    <p className="text-[11px] text-stone-400 font-sans text-right">
                      — {sampleQuote.authorName || "Anonymous"}
                    </p>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </PublicLayout>
  )
}
