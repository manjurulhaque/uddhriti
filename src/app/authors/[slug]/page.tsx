import * as React from "react"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { PublicLayout, QuoteCard } from "@/components/public"
import { Pagination } from "@/components/ui/pagination"
import { formatCountWithNoun, formatEpoch, formatLifespan } from "@/lib/formatters"
import { getSiteUrl } from "@/lib/site"
import { parseSafePageNumber, sanitizeSlug } from "@/lib/security/input"

const QUOTES_PER_PAGE = 12

interface AuthorDetailPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}

export const revalidate = 300

export async function generateStaticParams() {
  try {
    const topAuthors = await prisma.author.findMany({
      where: { quoteCount: { gt: 0 } },
      orderBy: { quoteCount: "desc" },
      take: 30,
      select: { slug: true },
    })
    return topAuthors.map((a) => ({ slug: a.slug }))
  } catch (error) {
    console.error("Failed to generate static params for authors:", error)
    return []
  }
}

export async function generateMetadata({
  params,
}: AuthorDetailPageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params
  const slug = sanitizeSlug(rawSlug, 150)
  const author = await prisma.author.findUnique({
    where: { slug },
    select: { name: true, profession: true, bio: true, quoteCount: true },
  })

  if (!author) {
    return { title: "Author Not Found" }
  }

  const desc =
    author.bio?.slice(0, 160) ||
    `Read timeless quotes and philosophical thoughts by ${author.name}${
      author.profession ? `, ${author.profession}` : ""
    }.`

  return {
    title: `${author.name} Quotes`,
    description: desc,
    alternates: {
      canonical: `/authors/${slug}`,
    },
    openGraph: {
      title: `${author.name} Quotes - Quotzen`,
      description: desc,
    },
  }
}

export default async function AuthorDetailPage({
  params,
  searchParams,
}: AuthorDetailPageProps) {
  const { slug: rawSlug } = await params
  const slug = sanitizeSlug(rawSlug, 150)
  const { page } = await searchParams
  const currentPage = parseSafePageNumber(page, 500)

  const author = await prisma.author.findUnique({
    where: { slug },
    include: {
      sources: {
        select: { id: true, title: true, type: true, year: true, quoteCount: true },
        take: 5,
        orderBy: { quoteCount: "desc" },
      },
    },
  })

  if (!author) {
    notFound()
  }

  const [totalQuotes, quotes, relatedAuthors] = await Promise.all([
    prisma.quote.count({
      where: {
        authorId: author.id,
        status: "PUBLISHED",
        deletedAt: null,
      },
    }),
    prisma.quote.findMany({
      where: {
        authorId: author.id,
        status: "PUBLISHED",
        deletedAt: null,
      },
      orderBy: { popularityScore: "desc" },
      skip: (currentPage - 1) * QUOTES_PER_PAGE,
      take: QUOTES_PER_PAGE,
      include: {
        category: { select: { name: true, slug: true } },
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
        id: { not: author.id },
        quoteCount: { gt: 0 },
        OR: [
          author.profession ? { profession: author.profession } : {},
          author.nationality ? { nationality: author.nationality } : {},
        ],
      },
      select: { id: true, name: true, slug: true, profession: true, quoteCount: true },
      take: 4,
      orderBy: { quoteCount: "desc" },
    }),
  ])

  const totalPages = Math.ceil(totalQuotes / QUOTES_PER_PAGE)

  const lifespan = formatLifespan(author)
  const epoch = formatEpoch(author.birthYear)

  const siteUrl = getSiteUrl()
  const authorUrl = `${siteUrl}/authors/${author.slug}`

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": authorUrl,
    url: authorUrl,
    name: author.name,
    ...(author.imageUrl ? { image: author.imageUrl } : {}),
    ...(author.bio ? { description: author.bio } : {}),
    ...(author.profession ? { jobTitle: author.profession } : {}),
    ...(author.nationality ? { nationality: author.nationality } : {}),
    ...(author.birthYear ? { birthDate: String(author.birthYear) } : {}),
    ...(author.deathYear ? { deathDate: String(author.deathYear) } : {}),
    ...(author.wikipediaUrl ? { sameAs: [author.wikipediaUrl] } : {}),
  }

  function buildHref(newPage: number) {
    return `/authors/${slug}${newPage > 1 ? `?page=${newPage}` : ""}`
  }

  return (
    <PublicLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12 space-y-10 font-sans">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="text-xs text-stone-500 flex items-center gap-2">
          <Link href="/" className="hover:text-stone-900 transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/authors" className="hover:text-stone-900 transition-colors">
            Authors
          </Link>
          <span>/</span>
          <span className="font-semibold text-stone-900 truncate">{author.name}</span>
        </nav>

        {/* Author Profile Hero Card */}
        <div className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 lg:p-10 shadow-xs relative overflow-hidden">
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
            {/* Portrait or Monogram */}
            <div className="relative h-28 w-28 sm:h-36 sm:w-36 shrink-0 overflow-hidden rounded-2xl bg-stone-100 border border-stone-200 shadow-sm">
              {author.imageUrl ? (
                <Image
                  src={author.imageUrl}
                  alt={author.name}
                  fill
                  sizes="(max-width: 640px) 112px, 144px"
                  unoptimized
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-serif text-4xl sm:text-5xl font-bold italic text-stone-400 bg-[var(--page-cream)]">
                  {author.name.charAt(0)}
                </div>
              )}
            </div>

            {/* Author Information */}
            <div className="space-y-4 flex-1">
              <div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1.5">
                  {author.profession && (
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-rust)]">
                      {author.profession}
                    </span>
                  )}
                  {author.nationality && (
                    <span className="text-xs text-stone-400">• {author.nationality}</span>
                  )}
                  {lifespan && (
                    <span className="text-xs font-mono text-stone-500">• {lifespan}</span>
                  )}
                  {epoch && (
                    <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                      {epoch}
                    </span>
                  )}
                </div>

                <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--ink-900)]">
                  {author.name}
                </h1>
              </div>

              {author.bio && (
                <p className="text-sm sm:text-base text-stone-700 leading-relaxed font-serif max-w-3xl border-l-2 border-[var(--accent-rust)]/40 pl-4 py-0.5">
                  {author.bio}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-800">
                  <span>Quotes:</span>
                  <span className="font-bold">{totalQuotes}</span>
                </span>

                {author.wikipediaUrl && (
                  <a
                    href={author.wikipediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-stone-200/80 bg-white px-3.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition-all shadow-2xs"
                  >
                    <span>Wikipedia Biography</span>
                    <svg className="h-3 w-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quotes Section */}
        <div className="space-y-6">
          <div className="border-b border-stone-900/10 pb-4 flex items-center justify-between">
            <h2 className="font-serif text-2xl font-bold tracking-tight text-[var(--ink-900)]">
              Quotations &amp; Wisdom
            </h2>
            <span className="text-xs text-stone-500 font-mono">
              Showing {quotes.length} of {totalQuotes}
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
                  authorName={author.name}
                  authorSlug={author.slug}
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
              No quotes published yet for this author.
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

        {/* Related Thinkers */}
        {relatedAuthors.length > 0 && (
          <div className="pt-6 border-t border-stone-200/80 space-y-4">
            <h3 className="font-serif text-xl font-bold text-stone-900">
              Related Thinkers &amp; Contemporary Voices
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {relatedAuthors.map((item) => (
                <Link
                  key={item.id}
                  href={`/authors/${item.slug}`}
                  className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-2xs hover:border-stone-400 hover:shadow-xs transition-all space-y-1 block"
                >
                  <p className="font-serif font-bold text-stone-900 text-sm hover:text-[var(--accent-rust)] transition-colors">
                    {item.name}
                  </p>
                  <p className="text-xs text-stone-500 truncate">{item.profession ?? "Thinker"}</p>
                  <p className="text-[11px] font-mono text-stone-400 pt-1">
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
