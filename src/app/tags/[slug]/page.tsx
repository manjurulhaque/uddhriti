import * as React from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { PublicLayout, QuoteCard } from "@/components/public"
import { Pagination } from "@/components/ui/pagination"
import { formatCountWithNoun } from "@/lib/formatters"
import { parseSafePageNumber, sanitizeSlug } from "@/lib/security/input"

const QUOTES_PER_PAGE = 12

interface TagDetailPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({
  params,
}: TagDetailPageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params
  const slug = sanitizeSlug(rawSlug, 150)
  const tag = await prisma.tag.findUnique({
    where: { slug },
    select: { name: true, type: true, description: true },
  })

  if (!tag) {
    return { title: "Tag Not Found" }
  }

  const title = `${tag.name} Quotes`
  const description =
    tag.description ||
    `Browse memorable quotes, maxims, and passages tagged under ${tag.name} (${tag.type.toLowerCase()}).`

  return {
    title,
    description,
    alternates: {
      canonical: `/tags/${slug}`,
    },
    openGraph: {
      title,
      description,
    },
  }
}

export default async function TagDetailPage({
  params,
  searchParams,
}: TagDetailPageProps) {
  const { slug: rawSlug } = await params
  const slug = sanitizeSlug(rawSlug, 150)
  const { page } = await searchParams
  const currentPage = parseSafePageNumber(page, 500)

  const tag = await prisma.tag.findUnique({
    where: { slug },
  })

  if (!tag) {
    notFound()
  }

  const [totalQuotes, quoteTags, relatedTags] = await Promise.all([
    prisma.quoteTag.count({
      where: {
        tagId: tag.id,
        quote: {
          status: "PUBLISHED",
          deletedAt: null,
        },
      },
    }),
    prisma.quoteTag.findMany({
      where: {
        tagId: tag.id,
        quote: {
          status: "PUBLISHED",
          deletedAt: null,
        },
      },
      skip: (currentPage - 1) * QUOTES_PER_PAGE,
      take: QUOTES_PER_PAGE,
      include: {
        quote: {
          include: {
            author: { select: { name: true, slug: true } },
            category: { select: { name: true, slug: true } },
            source: { select: { title: true, year: true } },
            tags: {
              select: {
                tag: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
    prisma.tag.findMany({
      where: {
        id: { not: tag.id },
        type: tag.type,
        quoteCount: { gt: 0 },
      },
      select: { id: true, name: true, slug: true, quoteCount: true },
      take: 8,
      orderBy: { quoteCount: "desc" },
    }),
  ])

  const quotes = quoteTags.map((entry) => entry.quote)
  const totalPages = Math.ceil(totalQuotes / QUOTES_PER_PAGE)

  function buildHref(newPage: number) {
    return `/tags/${slug}${newPage > 1 ? `?page=${newPage}` : ""}`
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12 space-y-10 font-sans">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-xs text-stone-500 flex items-center gap-2">
          <Link href="/" className="hover:text-stone-900 transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/tags" className="hover:text-stone-900 transition-colors">
            Tags
          </Link>
          <span>/</span>
          <span className="font-semibold text-stone-900 truncate">{tag.name}</span>
        </nav>

        {/* Tag Header */}
        <div className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 lg:p-10 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-stone-700">
              {tag.type.replace(/_/g, " ")}
            </span>
            <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-800">
              {formatCountWithNoun(totalQuotes, "quote")}
            </span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--ink-900)]">
            #{tag.name}
          </h1>

          {tag.description && (
            <p className="text-sm sm:text-base text-stone-700 leading-relaxed font-serif max-w-3xl">
              {tag.description}
            </p>
          )}
        </div>

        {/* Quotes Grid */}
        <div className="space-y-6">
          <div className="border-b border-stone-900/10 pb-4 flex items-center justify-between">
            <h2 className="font-serif text-2xl font-bold tracking-tight text-[var(--ink-900)]">
              Quotations Tagged #{tag.name}
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
                  slug={quote.slug}
                  content={quote.content}
                  authorName={quote.author?.name || quote.authorName}
                  authorSlug={quote.author?.slug}
                  category={quote.category.name}
                  categorySlug={quote.category.slug}
                  sourceTitle={quote.source?.title}
                  year={quote.source?.year ? String(quote.source.year) : undefined}
                  tags={quote.tags.map((t) => t.tag.name)}
                  views={quote.views}
                  variant="paper"
                  isVerified={quote.isVerified}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center text-stone-500">
              No quotes tagged with #{tag.name} yet.
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

        {/* Related Tags */}
        {relatedTags.length > 0 && (
          <div className="pt-6 border-t border-stone-200/80 space-y-4">
            <h3 className="font-serif text-xl font-bold text-stone-900">
              Related {tag.type.replace(/_/g, " ")} Motifs
            </h3>
            <div className="flex flex-wrap gap-2">
              {relatedTags.map((item) => (
                <Link
                  key={item.id}
                  href={`/tags/${item.slug}`}
                  className="rounded-xl border border-stone-200/90 bg-white px-3.5 py-1.5 text-xs text-stone-800 hover:border-stone-400 hover:bg-stone-50 transition-all shadow-2xs"
                >
                  <span className="font-medium">#{item.name}</span>{" "}
                  <span className="text-[10px] text-stone-400 font-mono">({item.quoteCount})</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  )
}
