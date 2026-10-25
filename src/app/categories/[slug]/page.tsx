import * as React from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { PublicLayout, QuoteCard } from "@/components/public"
import { Pagination } from "@/components/ui/pagination"
import { formatCountWithNoun } from "@/lib/formatters"

const QUOTES_PER_PAGE = 12

interface CategoryDetailPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({
  params,
}: CategoryDetailPageProps): Promise<Metadata> {
  const { slug } = await params
  const category = await prisma.category.findUnique({
    where: { slug },
    select: { name: true, description: true, metaTitle: true, metaDescription: true },
  })

  if (!category) {
    return { title: "Category Not Found | Uddhriti" }
  }

  const title = category.metaTitle || `${category.name} Quotes | Uddhriti`
  const description =
    category.metaDescription ||
    category.description ||
    `Explore memorable quotations, aphorisms, and insights about ${category.name}.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
  }
}

export default async function CategoryDetailPage({
  params,
  searchParams,
}: CategoryDetailPageProps) {
  const { slug } = await params
  const { page } = await searchParams
  const currentPage = Math.max(1, Number(page) || 1)

  const category = await prisma.category.findUnique({
    where: { slug },
  })

  if (!category) {
    notFound()
  }

  const [totalQuotes, quotes, topAuthors, siblingCategories] = await Promise.all([
    prisma.quote.count({
      where: {
        categoryId: category.id,
        status: "PUBLISHED",
        deletedAt: null,
      },
    }),
    prisma.quote.findMany({
      where: {
        categoryId: category.id,
        status: "PUBLISHED",
        deletedAt: null,
      },
      orderBy: { popularityScore: "desc" },
      skip: (currentPage - 1) * QUOTES_PER_PAGE,
      take: QUOTES_PER_PAGE,
      include: {
        author: { select: { name: true, slug: true } },
        source: { select: { title: true, year: true } },
        tags: {
          select: {
            tag: { select: { name: true } },
          },
        },
      },
    }),
    prisma.author.findMany({
      where: {
        quotes: {
          some: {
            categoryId: category.id,
            status: "PUBLISHED",
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        profession: true,
        quoteCount: true,
      },
      take: 6,
      orderBy: { quoteCount: "desc" },
    }),
    prisma.category.findMany({
      where: {
        id: { not: category.id },
        quoteCount: { gt: 0 },
      },
      select: { id: true, name: true, slug: true, quoteCount: true },
      take: 6,
      orderBy: { quoteCount: "desc" },
    }),
  ])

  const totalPages = Math.ceil(totalQuotes / QUOTES_PER_PAGE)

  function buildHref(newPage: number) {
    return `/categories/${slug}${newPage > 1 ? `?page=${newPage}` : ""}`
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12 space-y-10 font-sans">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="text-xs text-stone-500 flex items-center gap-2">
          <Link href="/" className="hover:text-stone-900 transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/categories" className="hover:text-stone-900 transition-colors">
            Categories
          </Link>
          <span>/</span>
          <span className="font-semibold text-stone-900 truncate">{category.name}</span>
        </nav>

        {/* Category Header */}
        <div className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 lg:p-10 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-rust)]">
              Thematic Collection
            </span>
            <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-800">
              {formatCountWithNoun(totalQuotes, "curated quote")}
            </span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--ink-900)]">
            {category.name}
          </h1>

          {category.description && (
            <p className="text-sm sm:text-base text-stone-700 leading-relaxed font-serif max-w-3xl">
              {category.description}
            </p>
          )}
        </div>

        {/* Top Voices in this Category */}
        {topAuthors.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Key Thinkers in {category.name}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {topAuthors.map((author) => (
                <Link
                  key={author.id}
                  href={`/authors/${author.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-stone-200/90 bg-white px-3.5 py-1.5 text-xs text-stone-800 hover:border-stone-400 hover:bg-stone-50 shadow-2xs transition-all"
                >
                  <span className="font-medium">{author.name}</span>
                  <span className="text-[10px] text-stone-400">({author.quoteCount})</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Quotes Grid */}
        <div className="space-y-6">
          <div className="border-b border-stone-900/10 pb-4 flex items-center justify-between">
            <h2 className="font-serif text-2xl font-bold tracking-tight text-[var(--ink-900)]">
              Quotations on {category.name}
            </h2>
            <span className="text-xs text-stone-500 font-mono">
              Page {currentPage} of {totalPages || 1}
            </span>
          </div>

          {quotes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quotes.map((quote) => (
                <QuoteCard
                  key={quote.id}
                  id={quote.id}
                  content={quote.content}
                  authorName={quote.author?.name || quote.authorName}
                  category={category.name}
                  sourceTitle={quote.source?.title}
                  year={quote.source?.year ? String(quote.source.year) : undefined}
                  tags={quote.tags.map((t) => t.tag.name)}
                  views={quote.views}
                  variant="paper"
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center text-stone-500">
              No quotes published in this category yet.
            </div>
          )}

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalQuotes}
            pageSize={QUOTES_PER_PAGE}
            buildHref={buildHref}
          />
        </div>

        {/* Sibling Categories */}
        {siblingCategories.length > 0 && (
          <div className="pt-6 border-t border-stone-200/80 space-y-4">
            <h3 className="font-serif text-xl font-bold text-stone-900">
              Explore More Thematic Topics
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {siblingCategories.map((item) => (
                <Link
                  key={item.id}
                  href={`/categories/${item.slug}`}
                  className="rounded-xl border border-stone-200/80 bg-white p-3 shadow-2xs hover:border-stone-400 hover:shadow-xs transition-all space-y-1 block text-center"
                >
                  <p className="font-serif font-bold text-stone-900 text-sm hover:text-[var(--accent-rust)] transition-colors line-clamp-1">
                    {item.name}
                  </p>
                  <p className="text-[10px] font-mono text-stone-400">
                    {formatCountWithNoun(item.quoteCount, "quote")}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  )
}
