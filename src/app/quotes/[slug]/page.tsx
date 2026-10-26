import * as React from "react"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { PublicLayout, QuoteCard, QuoteActions } from "@/components/public"
import { Badge } from "@/components/ui/badge"

interface IndividualQuotePageProps {
  params: Promise<{ slug: string }>
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function generateMetadata({
  params,
}: IndividualQuotePageProps): Promise<Metadata> {
  const { slug } = await params
  const isUuid = UUID_REGEX.test(slug)

  const quote = await prisma.quote.findFirst({
    where: {
      OR: [{ slug }, ...(isUuid ? [{ id: slug }] : [])],
      status: "PUBLISHED",
      deletedAt: null,
    },
    select: {
      content: true,
      authorName: true,
      meaning: true,
      category: { select: { name: true } },
    },
  })

  if (!quote) {
    return { title: "Quote Not Found | Uddhriti" }
  }

  const author = quote.authorName || "Unknown"
  const cleanSnippet = quote.content.length > 70 ? `${quote.content.slice(0, 70)}...` : quote.content
  const title = `“${cleanSnippet}” — ${author} | Uddhriti`
  const description =
    quote.meaning ||
    `Read the quotation “${cleanSnippet}” by ${author}. Explore its historical context, meaning, and thematic analysis.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

export default async function IndividualQuotePage({
  params,
}: IndividualQuotePageProps) {
  const { slug } = await params
  const isUuid = UUID_REGEX.test(slug)

  const quote = await prisma.quote.findFirst({
    where: {
      OR: [{ slug }, ...(isUuid ? [{ id: slug }] : [])],
      status: "PUBLISHED",
      deletedAt: null,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
          profession: true,
          nationality: true,
          birthYear: true,
          deathYear: true,
          bio: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
        },
      },
      source: {
        select: {
          id: true,
          title: true,
          slug: true,
          type: true,
          year: true,
          publisher: true,
        },
      },
      tags: {
        select: {
          tag: {
            select: {
              id: true,
              name: true,
              slug: true,
              type: true,
            },
          },
        },
      },
    },
  })

  if (!quote) {
    notFound()
  }

  // Canonical redirect: If accessed via raw UUID, redirect to human-readable slug URL
  if (isUuid && quote.slug && quote.slug !== slug) {
    redirect(`/quotes/${quote.slug}`)
  }

  const [moreAuthorQuotes, relatedCategoryQuotes] = await Promise.all([
    quote.authorId
      ? prisma.quote.findMany({
          where: {
            authorId: quote.authorId,
            id: { not: quote.id },
            status: "PUBLISHED",
            deletedAt: null,
          },
          take: 3,
          orderBy: { popularityScore: "desc" },
          include: {
            author: { select: { name: true, slug: true } },
            category: { select: { name: true, slug: true } },
            source: { select: { title: true, year: true } },
            tags: { select: { tag: { select: { name: true } } } },
          },
        })
      : Promise.resolve([]),
    prisma.quote.findMany({
      where: {
        categoryId: quote.categoryId,
        id: { not: quote.id },
        authorId: quote.authorId ? { not: quote.authorId } : undefined,
        status: "PUBLISHED",
        deletedAt: null,
      },
      take: 3,
      orderBy: { popularityScore: "desc" },
      include: {
        author: { select: { name: true, slug: true } },
        category: { select: { name: true, slug: true } },
        source: { select: { title: true, year: true } },
        tags: { select: { tag: { select: { name: true } } } },
      },
    }),
  ])

  const authorName = quote.author?.name || quote.authorName || "Unknown Author"
  const authorLifespan =
    quote.author?.birthYear || quote.author?.deathYear
      ? `${quote.author?.birthYear ?? "?"} – ${quote.author?.deathYear ?? (quote.author?.birthYear ? "Present" : "")}`
      : null

  return (
    <PublicLayout>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12 space-y-12 font-sans">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="text-xs text-stone-500 flex flex-wrap items-center gap-2">
          <Link href="/" className="hover:text-stone-900 transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/quotes" className="hover:text-stone-900 transition-colors">
            Quotes
          </Link>
          <span>/</span>
          <Link
            href={`/categories/${quote.category.slug}`}
            className="hover:text-stone-900 transition-colors font-medium"
          >
            {quote.category.name}
          </Link>
          <span>/</span>
          <span className="font-semibold text-stone-900 truncate max-w-xs">
            {quote.slug || quote.id}
          </span>
        </nav>

        {/* Master Quotation Hero Card */}
        <article className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-10 lg:p-12 shadow-sm space-y-8 relative overflow-hidden">
          {/* Top Classification Badges */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/categories/${quote.category.slug}`}
                className="inline-flex items-center rounded-full bg-[var(--page-cream)] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-stone-800 border border-stone-200 hover:bg-stone-100 transition-colors"
              >
                {quote.category.name}
              </Link>

              {quote.isFeatured && (
                <Badge variant="gold" size="sm">
                  Featured Voice
                </Badge>
              )}

              {quote.isVerified && (
                <Badge variant="success" size="sm" dot>
                  Verified Citation
                </Badge>
              )}
            </div>

            {quote.language && quote.language !== "en" && (
              <span className="rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 font-mono text-[11px] uppercase text-stone-500">
                {quote.language}
              </span>
            )}
          </div>

          {/* Primary Quotation Statement */}
          <div className="space-y-4">
            <div className="font-serif text-5xl sm:text-6xl text-[var(--accent-gold)] leading-none select-none -mb-3">
              &ldquo;
            </div>
            <blockquote className="font-serif text-2xl sm:text-3xl lg:text-4xl text-[var(--ink-900)] leading-relaxed sm:leading-relaxed font-normal">
              {quote.content}
            </blockquote>
          </div>

          {/* Author Attribution Card */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 pt-6 border-t border-stone-100">
            <div className="flex items-center gap-4">
              {/* Author Portrait Thumbnail */}
              <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-2xl bg-stone-100 border border-stone-200 shadow-2xs">
                {quote.author?.imageUrl ? (
                  <Image
                    src={quote.author.imageUrl}
                    alt={authorName}
                    fill
                    sizes="64px"
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-serif text-2xl font-bold italic text-stone-400 bg-[var(--page-cream)]">
                    {authorName.charAt(0)}
                  </div>
                )}
              </div>

              {/* Author Details */}
              <div className="space-y-0.5">
                {quote.author?.slug ? (
                  <Link
                    href={`/authors/${quote.author.slug}`}
                    className="font-serif text-lg sm:text-xl font-bold text-stone-900 hover:text-[var(--accent-rust)] transition-colors block"
                  >
                    — {authorName}
                  </Link>
                ) : (
                  <p className="font-serif text-lg sm:text-xl font-bold text-stone-900">
                    — {authorName}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-stone-500">
                  {quote.author?.profession && <span>{quote.author.profession}</span>}
                  {quote.author?.nationality && <span>· {quote.author.nationality}</span>}
                  {authorLifespan && <span className="font-mono">({authorLifespan})</span>}
                </div>
              </div>
            </div>

            {/* Source Provenance Citation */}
            {quote.source && (
              <div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 px-4 py-3 text-xs text-stone-700 space-y-0.5 self-start sm:self-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                  Primary Source
                </span>
                <p className="font-medium text-stone-900">
                  {quote.source.title}
                  {quote.source.year ? ` (${quote.source.year})` : ""}
                </p>
                <p className="text-[11px] text-stone-500">
                  {quote.source.type.toLowerCase()}
                  {quote.source.publisher ? ` · ${quote.source.publisher}` : ""}
                </p>
              </div>
            )}
          </div>

          {/* Interactive Actions: Copy, Share, Save, Views */}
          <QuoteActions
            id={quote.id}
            slug={quote.slug}
            content={quote.content}
            authorName={authorName}
            authorSlug={quote.author?.slug}
            category={quote.category?.name}
            categorySlug={quote.category?.slug}
            sourceTitle={quote.source?.title}
            year={quote.source?.year ? String(quote.source.year) : undefined}
            tags={quote.tags.map((t) => t.tag.name)}
            views={quote.views}
          />
        </article>

        {/* Curatorial & Scholarly Analysis Grid */}
        {(quote.meaning || quote.historicalContext || quote.modernRelevance) && (
          <section className="space-y-6">
            <div className="border-b border-stone-900/10 pb-3">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-rust)]">
                Curatorial Notes
              </span>
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[var(--ink-900)] mt-0.5">
                Meaning &amp; Historical Context
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {quote.meaning && (
                <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-2xs space-y-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                    <span>💡</span> Philosophical Meaning
                  </span>
                  <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-serif">
                    {quote.meaning}
                  </p>
                </div>
              )}

              {quote.historicalContext && (
                <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-2xs space-y-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                    <span>📜</span> Historical Context
                  </span>
                  <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-serif">
                    {quote.historicalContext}
                  </p>
                </div>
              )}

              {quote.modernRelevance && (
                <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-2xs space-y-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                    <span>🌱</span> Modern Relevance
                  </span>
                  <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-serif">
                    {quote.modernRelevance}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Thematic Tags Section */}
        {quote.tags.length > 0 && (
          <div className="space-y-3 pt-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Thematic Motifs &amp; Tags
            </span>
            <div className="flex flex-wrap gap-2">
              {quote.tags.map((entry) => (
                <Link
                  key={entry.tag.id}
                  href={`/tags/${entry.tag.slug}`}
                  className="rounded-xl border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-medium text-stone-800 hover:border-stone-900 hover:bg-stone-50 transition-all shadow-2xs"
                >
                  #{entry.tag.name}{" "}
                  <span className="text-[10px] text-stone-400 font-mono">
                    ({entry.tag.type.toLowerCase()})
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* More Wisdom from this Author */}
        {moreAuthorQuotes.length > 0 && (
          <section className="space-y-6 pt-6 border-t border-stone-200/80">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-rust)]">
                  More From {authorName}
                </span>
                <h3 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
                  Quotations &amp; Excerpts
                </h3>
              </div>
              {quote.author?.slug && (
                <Link
                  href={`/authors/${quote.author.slug}`}
                  className="text-xs font-semibold text-stone-800 hover:text-[var(--accent-rust)] transition-colors"
                >
                  View all &rarr;
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {moreAuthorQuotes.map((item) => (
                <QuoteCard
                  key={item.id}
                  id={item.id}
                  slug={item.slug}
                  content={item.content}
                  authorName={item.author?.name || item.authorName}
                  authorSlug={item.author?.slug}
                  category={item.category.name}
                  categorySlug={item.category.slug}
                  sourceTitle={item.source?.title}
                  year={item.source?.year ? String(item.source.year) : undefined}
                  tags={item.tags.map((t) => t.tag.name)}
                  views={item.views}
                  variant="paper"
                />
              ))}
            </div>
          </section>
        )}

        {/* Related Quotes on Same Theme */}
        {relatedCategoryQuotes.length > 0 && (
          <section className="space-y-6 pt-6 border-t border-stone-200/80">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-rust)]">
                  Topic Exploration
                </span>
                <h3 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
                  More Quotations on {quote.category.name}
                </h3>
              </div>
              <Link
                href={`/categories/${quote.category.slug}`}
                className="text-xs font-semibold text-stone-800 hover:text-[var(--accent-rust)] transition-colors"
              >
                Browse category &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedCategoryQuotes.map((item) => (
                <QuoteCard
                  key={item.id}
                  id={item.id}
                  slug={item.slug}
                  content={item.content}
                  authorName={item.author?.name || item.authorName}
                  authorSlug={item.author?.slug}
                  category={item.category.name}
                  categorySlug={item.category.slug}
                  sourceTitle={item.source?.title}
                  year={item.source?.year ? String(item.source.year) : undefined}
                  tags={item.tags.map((t) => t.tag.name)}
                  views={item.views}
                  variant="paper"
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </PublicLayout>
  )
}
