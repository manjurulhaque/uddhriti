import * as React from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { sanitizeSlug, isSafeExternalUrl } from "@/lib/security/input"
import { prisma } from "@/lib/prisma"
import { publicQuoteCardSelect } from "@/lib/quotes/selects"
import { getSiteUrl } from "@/lib/site"
import { formatEpoch, formatLifespan, normalizeWikimediaThumbnailUrl } from "@/lib/formatters"
import { extractSeoGoldenSnippet } from "@/lib/quotes/context-generator"
import {
  PublicLayout,
  JsonLd,
  QuoteCard,
  QuoteActions,
  Breadcrumb,
  AuthorAvatar,
  QuoteCuratorialNotes,
  QuotePrimarySource,
  QuoteAuthorBriefing,
  QuoteAttributionWarning,
} from "@/components/public"
import { Badge } from "@/components/ui/badge"

interface IndividualQuotePageProps {
  params: Promise<{ slug: string }>
}

export const revalidate = 300

export async function generateStaticParams() {
  // In development, skip querying Prisma on every request to avoid dev-server IPC worker overhead
  if (process.env.NODE_ENV === "development") {
    return []
  }

  try {
    const topQuotes = await prisma.quote.findMany({
      where: { status: "PUBLISHED", deletedAt: null },
      orderBy: { popularityScore: "desc" },
      take: 50,
      select: { slug: true },
    })
    if (!Array.isArray(topQuotes)) return []
    return topQuotes
      .filter((q) => typeof q?.slug === "string" && q.slug.trim().length > 0)
      .map((q) => ({ slug: q.slug.trim() }))
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
      attributionStatus: true,
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
  const seoMeaning = quote.meaning ? extractSeoGoldenSnippet(quote.meaning) : ""
  const description =
    seoMeaning ||
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

  const authorName = quote.author?.name || quote.authorName || "Unknown Author"
  const authorImageUrl = normalizeWikimediaThumbnailUrl(quote.author?.imageUrl)
  const authorLifespan = formatLifespan(quote.author)
  const authorEpoch = formatEpoch(quote.author?.birthYear)
  const wordCount = quote.wordCount || quote.content.trim().split(/\s+/).filter(Boolean).length
  const readingTimeEstimate = Math.max(1, Math.ceil(wordCount / 130))

  const siteUrl = getSiteUrl()
  const quoteUrl = `${siteUrl}/quotes/${quote.slug || quote.id}`
  const authorUrl = quote.author?.slug ? `${siteUrl}/authors/${quote.author.slug}` : undefined

  const pageSeoDescription = quote.meaning ? extractSeoGoldenSnippet(quote.meaning) : undefined

  // Schema.org Quotation structured data for Google Knowledge Graph and Rich Snippets
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Quotation",
    "@id": quoteUrl,
    url: quoteUrl,
    text: quote.content,
    inLanguage: quote.language || "en",
    wordCount,
    ...(pageSeoDescription ? { description: pageSeoDescription, disambiguatingDescription: pageSeoDescription } : {}),
    ...(quote.meaning ? { abstract: quote.meaning } : {}),
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
            ...(isSafeExternalUrl(quote.source.externalUrl) ? { url: quote.source.externalUrl! } : {}),
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
      <JsonLd data={jsonLd} />

      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 sm:py-8 lg:px-12 space-y-8 font-sans">
        {/* Breadcrumb Navigation */}
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Quotes", href: "/quotes" },
            {
              label: `Theme: ${quote.category.name}`,
              href: `/categories/${quote.category.slug}`,
            },
            { label: quote.slug || quote.id },
          ]}
        />

        {/* Master Quotation Hero Card */}
        <article className="rounded-3xl border border-stone-200/90 bg-white p-5 sm:p-7 lg:p-8 shadow-sm space-y-5 relative overflow-hidden">
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

            <div className="flex items-center gap-2">
              {quote.language && quote.language !== "en" && (
                <span className="rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 font-mono text-[11px] uppercase text-stone-500">
                  {quote.language}
                </span>
              )}

              <Link
                href="/quotes/random"
                prefetch={false}
                className="inline-flex items-center gap-1.5 rounded-full border border-stone-300/80 bg-white px-3 py-1 text-xs font-semibold text-stone-700 hover:border-stone-400 hover:bg-stone-50 hover:text-stone-900 transition-all shadow-2xs"
                title="Discover another random quotation from the archive"
              >
                <span className="text-sm" aria-hidden="true">🎲</span>
                <span>Random Quote</span>
              </Link>
            </div>
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

          {/* Scholarly Attribution Warning / Verification Seal */}
          <QuoteAttributionWarning
            attributionStatus={quote.attributionStatus}
            isVerified={quote.isVerified}
            authorName={authorName}
            verificationNote={quote.verificationNote}
          />

          {/* Author Attribution & Thematic Tags Provenance Block */}
          <div className="pt-4 border-t border-stone-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Author Portrait Thumbnail */}
                <AuthorAvatar name={authorName} imageUrl={authorImageUrl} size="md" priority loading="eager" />

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

            {/* Thematic Tags Strip inside Master Quotation Card */}
            {quote.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mr-1 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span>Tags:</span>
                </span>
                {quote.tags.map((entry) => (
                  <Link
                    key={entry.tag.id}
                    href={`/tags/${entry.tag.slug}`}
                    className="group inline-flex items-center gap-1.5 rounded-full border border-stone-200/90 bg-stone-50/90 px-3 py-1 text-xs font-medium text-stone-700 hover:border-stone-400 hover:bg-stone-100 hover:text-stone-900 transition-all shadow-2xs"
                  >
                    <span className="text-stone-400 group-hover:text-stone-600 font-mono text-[11px]">#</span>
                    <span>{entry.tag.name}</span>
                    {entry.tag.type && entry.tag.type !== "TOPIC" && (
                      <span className="text-[9px] font-mono uppercase text-stone-400 group-hover:text-stone-600">
                        {entry.tag.type}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Interactive Actions: Copy, Share, Save */}
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
        <QuoteCuratorialNotes
          meaning={quote.meaning}
          historicalContext={quote.historicalContext}
          modernRelevance={quote.modernRelevance}
        />

        {/* Primary Source Provenance Card */}
        {quote.source && (
          <QuotePrimarySource
            source={quote.source}
            verificationNote={quote.verificationNote}
          />
        )}

        {/* Author Biographical Briefing Card */}
        {quote.author && (
          <QuoteAuthorBriefing
            author={quote.author}
            loading={authorImageUrl ? "eager" : undefined}
          />
        )}

        {/* More Wisdom from this Author (Suspense Streamed) */}
        {quote.authorId && (
          <React.Suspense
            fallback={
              <RelatedQuotesSkeleton
                kicker={`More From ${authorName}`}
                heading="Quotations & Excerpts"
              />
            }
          >
            <MoreAuthorQuotesSection
              quoteId={quote.id}
              authorId={quote.authorId}
              authorName={authorName}
              authorSlug={quote.author?.slug}
            />
          </React.Suspense>
        )}

        {/* Related Quotes on Same Theme (Suspense Streamed) */}
        <React.Suspense
          fallback={
            <RelatedQuotesSkeleton
              kicker="Thematic Exploration"
              heading={`More Quotations on Theme: ${quote.category.name}`}
            />
          }
        >
          <RelatedCategoryQuotesSection
            quoteId={quote.id}
            categoryId={quote.categoryId}
            categoryName={quote.category.name}
            categorySlug={quote.category.slug}
            authorId={quote.authorId}
          />
        </React.Suspense>
      </div>
    </PublicLayout>
  )
}

function RelatedQuotesSkeleton({
  kicker,
  heading,
}: {
  kicker: string
  heading: string
}) {
  return (
    <section className="space-y-6 pt-6 border-t border-stone-200/80 animate-pulse" aria-hidden="true">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-rust)]">
            {kicker}
          </span>
          <h3 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
            {heading}
          </h3>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-56 rounded-[1.6rem] bg-stone-100/80 border border-stone-200/80" />
        ))}
      </div>
    </section>
  )
}

async function MoreAuthorQuotesSection({
  quoteId,
  authorId,
  authorName,
  authorSlug,
}: {
  quoteId: string
  authorId: string
  authorName: string
  authorSlug?: string | null
}) {
  const moreAuthorQuotes = await prisma.quote.findMany({
    where: {
      authorId,
      id: { not: quoteId },
      status: "PUBLISHED",
      deletedAt: null,
    },
    take: 3,
    orderBy: [{ popularityScore: "desc" }, { id: "asc" }],
    select: publicQuoteCardSelect,
  })

  if (moreAuthorQuotes.length === 0) return null

  return (
    <section className="space-y-6 pt-6 border-t border-stone-200/80" aria-labelledby="more-author-heading">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-rust)]">
            More From {authorName}
          </span>
          <h3 id="more-author-heading" className="font-serif text-2xl font-bold tracking-tight text-stone-900">
            Quotations &amp; Excerpts
          </h3>
        </div>
        {authorSlug && (
          <Link
            href={`/authors/${authorSlug}`}
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
  )
}

async function RelatedCategoryQuotesSection({
  quoteId,
  categoryId,
  categoryName,
  categorySlug,
  authorId,
}: {
  quoteId: string
  categoryId: string
  categoryName: string
  categorySlug: string
  authorId?: string | null
}) {
  const relatedCategoryQuotes = await prisma.quote.findMany({
    where: {
      categoryId,
      id: { not: quoteId },
      ...(authorId ? { authorId: { not: authorId } } : {}),
      status: "PUBLISHED",
      deletedAt: null,
    },
    take: 3,
    orderBy: [{ popularityScore: "desc" }, { id: "asc" }],
    select: publicQuoteCardSelect,
  })

  if (relatedCategoryQuotes.length === 0) return null

  return (
    <section className="space-y-6 pt-6 border-t border-stone-200/80" aria-labelledby="related-theme-heading">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-rust)]">
            Thematic Exploration
          </span>
          <h3 id="related-theme-heading" className="font-serif text-2xl font-bold tracking-tight text-stone-900">
            More Quotations on Theme: {categoryName}
          </h3>
        </div>
        <Link
          href={`/categories/${categorySlug}`}
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
  )
}
