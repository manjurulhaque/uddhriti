import * as React from "react"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { sanitizeSlug } from "@/lib/security/input"
import { prisma } from "@/lib/prisma"
import { getSiteUrl } from "@/lib/site"
import { formatEpoch, formatLifespan, normalizeWikimediaThumbnailUrl } from "@/lib/formatters"
import { PublicLayout, QuoteCard, QuoteActions } from "@/components/public"
import { Badge } from "@/components/ui/badge"

interface IndividualQuotePageProps {
  params: Promise<{ slug: string }>
}

export const revalidate = 300

export async function generateStaticParams() {
  try {
    const topQuotes = await prisma.quote.findMany({
      where: { status: "PUBLISHED", deletedAt: null },
      orderBy: { popularityScore: "desc" },
      take: 50,
      select: { slug: true },
    })
    return topQuotes.map((q) => ({ slug: q.slug }))
  } catch (error) {
    console.error("Failed to generate static params for quotes:", error)
    return []
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const getQuoteBySlug = React.cache(async (slug: string) => {
  const isUuid = UUID_REGEX.test(slug)
  return prisma.quote.findFirst({
    where: isUuid
      ? { id: slug, status: "PUBLISHED", deletedAt: null }
      : { slug, status: "PUBLISHED", deletedAt: null },
    select: {
      id: true,
      slug: true,
      content: true,
      authorName: true,
      meaning: true,
      historicalContext: true,
      modernRelevance: true,
      verificationNote: true,
      isFeatured: true,
      isVerified: true,
      views: true,
      language: true,
      wordCount: true,
      authorId: true,
      categoryId: true,
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
          wikipediaUrl: true,
          quoteCount: true,
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
          yearLabel: true,
          publisher: true,
          description: true,
          externalUrl: true,
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
})

export async function generateMetadata({
  params,
}: IndividualQuotePageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params
  const slug = sanitizeSlug(rawSlug, 150)
  const quote = await getQuoteBySlug(slug)

  if (!quote) {
    return { title: "Quote Not Found" }
  }

  const author = quote.authorName || "Unknown"
  const cleanSnippet = quote.content.length > 70 ? `${quote.content.slice(0, 70)}...` : quote.content
  const title = `“${cleanSnippet}” — ${author}`
  const description =
    quote.meaning ||
    `Read the quotation “${cleanSnippet}” by ${author}. Explore its historical context, meaning, and thematic analysis.`

  return {
    title,
    description,
    alternates: {
      canonical: `/quotes/${slug}`,
    },
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
  const { slug: rawSlug } = await params
  const slug = sanitizeSlug(rawSlug, 150)
  const isUuid = UUID_REGEX.test(slug)

  const quote = await getQuoteBySlug(slug)

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
          orderBy: [{ popularityScore: "desc" }, { id: "asc" }],
          select: {
            id: true,
            slug: true,
            content: true,
            authorName: true,
            isVerified: true,
            views: true,
            author: { select: { name: true, slug: true } },
            category: { select: { name: true, slug: true } },
            source: { select: { title: true, year: true } },
            tags: { select: { tag: { select: { name: true } } } },
          },
        })
      : Promise.resolve([]),
    quote.categoryId
      ? prisma.quote.findMany({
          where: {
            categoryId: quote.categoryId,
            id: { not: quote.id },
            ...(quote.authorId ? { authorId: { not: quote.authorId } } : {}),
            status: "PUBLISHED",
            deletedAt: null,
          },
          take: 3,
          orderBy: [{ popularityScore: "desc" }, { id: "asc" }],
          select: {
            id: true,
            slug: true,
            content: true,
            authorName: true,
            isVerified: true,
            views: true,
            author: { select: { name: true, slug: true } },
            category: { select: { name: true, slug: true } },
            source: { select: { title: true, year: true } },
            tags: { select: { tag: { select: { name: true } } } },
          },
        })
      : Promise.resolve([]),
  ])

  const authorName = quote.author?.name || quote.authorName || "Unknown Author"
  const authorImageUrl = normalizeWikimediaThumbnailUrl(quote.author?.imageUrl)
  const authorLifespan = formatLifespan(quote.author)
  const authorEpoch = formatEpoch(quote.author?.birthYear)
  const wordCount = quote.wordCount || quote.content.trim().split(/\s+/).filter(Boolean).length
  const readingTimeEstimate = Math.max(1, Math.ceil(wordCount / 130))

  const siteUrl = getSiteUrl()
  const quoteUrl = `${siteUrl}/quotes/${quote.slug || quote.id}`
  const authorUrl = quote.author?.slug ? `${siteUrl}/authors/${quote.author.slug}` : undefined

  // Schema.org Quotation structured data for Google Knowledge Graph and Rich Snippets
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Quotation",
    "@id": quoteUrl,
    url: quoteUrl,
    text: quote.content,
    inLanguage: quote.language || "en",
    wordCount,
    author: {
      "@type": "Person",
      name: authorName,
      ...(authorUrl ? { url: authorUrl } : {}),
      ...(quote.author?.profession ? { jobTitle: quote.author.profession } : {}),
    },
    ...(quote.source
      ? {
          citation: {
            "@type": "CreativeWork",
            name: quote.source.title,
            ...(quote.source.year ? { datePublished: String(quote.source.year) } : {}),
            ...(quote.source.publisher ? { publisher: { "@type": "Organization", name: quote.source.publisher } } : {}),
            ...(quote.source.externalUrl ? { url: quote.source.externalUrl } : {}),
          },
        }
      : {}),
    about: {
      "@type": "Thing",
      name: quote.category.name,
      ...(quote.category.description ? { description: quote.category.description } : {}),
    },
    keywords: quote.tags.map((t) => t.tag.name).join(", "),
  }

  return (
    <PublicLayout>
      {/* Schema.org JSON-LD Script */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

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
            Theme: {quote.category.name}
          </Link>
          <span>/</span>
          <span className="font-semibold text-stone-900 truncate max-w-xs">
            {quote.slug || quote.id}
          </span>
        </nav>

        {/* Master Quotation Hero Card */}
        <article className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-10 lg:p-12 shadow-sm space-y-8 relative overflow-hidden">
          {/* Top Classification Badges & Reading Metrics */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/categories/${quote.category.slug}`}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--page-cream)] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-stone-800 border border-stone-200 hover:bg-stone-100 transition-colors"
              >
                <span className="text-stone-500 font-normal">Theme:</span>
                <span>{quote.category.name}</span>
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

              <span className="inline-flex items-center text-[11px] font-medium text-stone-500 bg-stone-100/70 border border-stone-200/60 rounded-full px-2.5 py-0.5">
                {wordCount} words · ~{readingTimeEstimate} min reflection
              </span>
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
                {authorImageUrl ? (
                  <Image
                    src={authorImageUrl}
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
                  {authorEpoch && (
                    <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.2 text-[10px] font-semibold text-amber-800">
                      {authorEpoch}
                    </span>
                  )}
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

        {/* Primary Source Provenance Deep-Dive Card */}
        {quote.source && (
          <section className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-rust)]/10 text-[var(--accent-rust)] text-base">
                  📖
                </span>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-rust)] block">
                    Primary Literary Source
                  </span>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-stone-900">
                    {quote.source.title} {quote.source.year ? `(${quote.source.year})` : ""}
                  </h3>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-stone-100 border border-stone-200 px-3 py-0.5 font-semibold text-stone-700 uppercase text-[10px] tracking-wider">
                  {quote.source.type.toLowerCase()}
                </span>
                {quote.source.publisher && (
                  <span className="text-stone-500 text-xs">
                    Published by {quote.source.publisher}
                  </span>
                )}
              </div>
            </div>

            {quote.source.description && (
              <p className="font-serif text-xs sm:text-sm text-stone-700 leading-relaxed italic">
                {quote.source.description}
              </p>
            )}

            {quote.verificationNote && (
              <div className="rounded-xl bg-stone-50 border border-stone-200/80 p-3 text-xs text-stone-700 flex items-start gap-2">
                <span className="font-bold text-stone-900 shrink-0">Verification Reference:</span>
                <span className="font-mono text-stone-600">{quote.verificationNote}</span>
              </div>
            )}

            {quote.source.externalUrl && (
              <div className="pt-1">
                <a
                  href={quote.source.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-rust)] hover:underline"
                >
                  <span>Examine primary text in historical library catalog</span>
                  <span aria-hidden="true">↗</span>
                </a>
              </div>
            )}
          </section>
        )}

        {/* Author Biographical Briefing Card */}
        {quote.author && (
          <section className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
              <div className="flex items-center gap-4">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-stone-100 border border-stone-200 shadow-2xs">
                  {quote.author.imageUrl ? (
                    <Image
                      src={quote.author.imageUrl}
                      alt={authorName}
                      fill
                      sizes="56px"
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-serif text-2xl font-bold italic text-stone-400 bg-[var(--page-cream)]">
                      {authorName.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-rust)] block">
                    About the Thinker
                  </span>
                  <Link
                    href={`/authors/${quote.author.slug}`}
                    className="font-serif text-xl font-bold text-stone-900 hover:text-[var(--accent-rust)] transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>{authorName}</span>
                  </Link>
                  <div className="flex flex-wrap items-center gap-x-2 text-xs text-stone-500 mt-0.5">
                    {quote.author.profession && <span>{quote.author.profession}</span>}
                    {quote.author.nationality && <span>· {quote.author.nationality}</span>}
                    {authorLifespan && <span className="font-mono">({authorLifespan})</span>}
                    {authorEpoch && (
                      <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.2 text-[10px] font-semibold text-amber-800">
                        {authorEpoch}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href={`/authors/${quote.author.slug}`}
                  className="text-xs font-semibold text-stone-800 hover:text-[var(--accent-rust)] transition-colors"
                >
                  View all {quote.author.quoteCount || "collected"} reflections &rarr;
                </Link>
                {quote.author.wikipediaUrl && (
                  <a
                    href={quote.author.wikipediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-stone-400 hover:text-stone-700 transition-colors"
                    title="Read Wikipedia biography"
                  >
                    Wikipedia ↗
                  </a>
                )}
              </div>
            </div>

            {quote.author.bio && (
              <p className="font-serif text-xs sm:text-sm text-stone-700 leading-relaxed">
                {quote.author.bio}
              </p>
            )}
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
                  isVerified={item.isVerified}
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
                  Thematic Exploration
                </span>
                <h3 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
                  More Quotations on Theme: {quote.category.name}
                </h3>
              </div>
              <Link
                href={`/categories/${quote.category.slug}`}
                className="text-xs font-semibold text-stone-800 hover:text-[var(--accent-rust)] transition-colors"
              >
                Browse theme &rarr;
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
                  isVerified={item.isVerified}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </PublicLayout>
  )
}
