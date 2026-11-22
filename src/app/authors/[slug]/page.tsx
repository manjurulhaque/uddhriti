import * as React from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { PublicLayout, QuoteCard, Breadcrumb, AuthorAvatar, JsonLd } from "@/components/public"
import { Pagination } from "@/components/ui/pagination"
import {
  cleanProfession,
  formatCountWithNoun,
  formatDateOfRecord,
  formatEpoch,
  formatLifespan,
  formatWorkType,
  getCategoryMeta,
  normalizeWikimediaThumbnailUrl,
} from "@/lib/formatters"
import { formatSourceYearLabel } from "@/lib/sourceYear"
import { parseSafePageNumber, sanitizeSlug, isSafeExternalUrl, isValidWikidataId } from "@/lib/security/input"
import { BoundedMemoryCache } from "@/lib/cache/bounded-cache"
import { publicQuoteCardSelect, type PublicQuoteCardItem } from "@/lib/quotes/selects"
import {
  extractAuthorMetaDescription,
  generateAuthorPageTitle,
  buildAuthorKnowledgeGraph,
} from "@/lib/authors/seo"
import { getAuthorCompanionThinkers } from "@/lib/authors/bio-generator"

const QUOTES_PER_PAGE = 12
const MAX_AUTHOR_CACHE_ENTRIES = 120
const CACHE_TTL_MS = 15 * 60 * 1000

const authorPage1Cache = new BoundedMemoryCache<string, PublicQuoteCardItem[]>({
  maxSize: MAX_AUTHOR_CACHE_ENTRIES,
  ttlMs: CACHE_TTL_MS,
})

interface AuthorDetailPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}

export const revalidate = 300

export async function generateStaticParams() {
  if (process.env.NODE_ENV === "development") {
    return []
  }

  try {
    const topAuthors = await prisma.author.findMany({
      where: { quoteCount: { gt: 0 } },
      orderBy: { quoteCount: "desc" },
      take: 30,
      select: { slug: true },
    })
    if (!Array.isArray(topAuthors)) return []
    return topAuthors
      .filter((a) => typeof a?.slug === "string" && a.slug.trim().length > 0)
      .map((a) => ({ slug: a.slug.trim() }))
  } catch (error) {
    console.error("Failed to generate static params for authors:", error)
    return []
  }
}

const getAuthorBySlug = React.cache(async (slug: string) => {
  return prisma.author.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      profession: true,
      nationality: true,
      birthYear: true,
      deathYear: true,
      dateOfBirth: true,
      dateOfDeath: true,
      bio: true,
      imageUrl: true,
      quoteCount: true,
      wikipediaUrl: true,
      wikidataId: true,
      sources: {
        select: {
          id: true,
          title: true,
          slug: true,
          type: true,
          year: true,
          yearLabel: true,
          yearApproximate: true,
          publisher: true,
          quoteCount: true,
          externalUrl: true,
        },
        take: 6,
        orderBy: [{ quoteCount: "desc" }, { id: "asc" }],
      },
    },
  })
})

export async function generateMetadata({
  params,
}: AuthorDetailPageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params
  const slug = sanitizeSlug(rawSlug, 150)
  const author = await getAuthorBySlug(slug)

  if (!author) {
    return { title: "Author Not Found" }
  }

  const title = generateAuthorPageTitle(author)
  const desc = extractAuthorMetaDescription(author)
  const authorImageUrl = normalizeWikimediaThumbnailUrl(author.imageUrl)

  return {
    title,
    description: desc,
    alternates: {
      canonical: `/authors/${slug}`,
    },
    openGraph: {
      title: `${author.name} Quotes & Philosophy - Quotzen`,
      description: desc,
      type: "profile",
      ...(authorImageUrl ? { images: [{ url: authorImageUrl, alt: author.name }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: `${author.name} Quotes & Philosophy - Quotzen`,
      description: desc,
      ...(authorImageUrl ? { images: [authorImageUrl] } : {}),
    },
  }
}

function AuthorQuotesSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden="true">
      <div className="border-b border-stone-900/10 pb-4 flex items-center justify-between">
        <div className="h-7 w-48 bg-stone-200/80 rounded-lg" />
        <div className="h-4 w-24 bg-stone-200/80 rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-56 rounded-[1.6rem] bg-stone-100/80 border border-stone-200/80" />
        ))}
      </div>
    </div>
  )
}

async function getAuthorQuotes({
  authorId,
  currentPage,
}: {
  authorId: string
  currentPage: number
}): Promise<PublicQuoteCardItem[]> {
  const isPage1 = currentPage === 1
  if (isPage1) {
    const cached = authorPage1Cache.get(authorId)
    if (cached) return cached
  }

  const quotes = await prisma.quote.findMany({
    where: {
      authorId,
      status: "PUBLISHED",
      deletedAt: null,
    },
    orderBy: [{ popularityScore: "desc" }, { id: "asc" }],
    skip: (currentPage - 1) * QUOTES_PER_PAGE,
    take: QUOTES_PER_PAGE,
    select: publicQuoteCardSelect,
  })

  if (isPage1) {
    authorPage1Cache.set(authorId, quotes)
  }

  return quotes
}

async function AuthorQuotesSection({
  authorId,
  authorName,
  authorSlug,
  totalQuotes,
  searchParams,
}: {
  authorId: string
  authorName: string
  authorSlug: string
  totalQuotes: number
  searchParams: Promise<{ page?: string }>
}) {
  const { page } = await searchParams
  const currentPage = parseSafePageNumber(page, 500)
  const quotes = await getAuthorQuotes({ authorId, currentPage })
  const totalPages = Math.ceil(totalQuotes / QUOTES_PER_PAGE)

  function buildHref(newPage: number) {
    return `/authors/${authorSlug}${newPage > 1 ? `?page=${newPage}` : ""}`
  }

  return (
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
              authorName={authorName}
              authorSlug={authorSlug}
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
  )
}

function renderBioParagraphWithLinks(text: string): React.ReactNode {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  if (!linkRegex.test(text)) {
    return text
  }

  linkRegex.lastIndex = 0
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = linkRegex.exec(text)) !== null) {
    const [fullMatch, linkText, href] = match
    const matchIndex = match.index

    if (matchIndex > lastIndex) {
      parts.push(text.slice(lastIndex, matchIndex))
    }

    const isInternal = href.startsWith("/")
    if (isInternal) {
      parts.push(
        <Link
          key={`${href}-${matchIndex}`}
          href={href}
          className="text-[var(--accent-rust)] font-medium underline decoration-[var(--accent-rust)]/35 underline-offset-2 hover:decoration-[var(--accent-rust)] transition-colors"
        >
          {linkText}
        </Link>
      )
    } else if (isSafeExternalUrl(href)) {
      parts.push(
        <a
          key={`${href}-${matchIndex}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--accent-rust)] font-medium underline decoration-[var(--accent-rust)]/35 underline-offset-2 hover:decoration-[var(--accent-rust)] transition-colors"
        >
          {linkText}
        </a>
      )
    } else {
      parts.push(linkText)
    }

    lastIndex = matchIndex + fullMatch.length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}

function renderBioParagraph(paragraph: string, index: number): React.ReactNode {
  const trimmed = paragraph.trim()
  if (trimmed.startsWith(">")) {
    const rawLines = trimmed
      .split("\n")
      .map((line) => line.replace(/^>\s?/, "").trim())
      .filter(Boolean)

    return (
      <blockquote
        key={index}
        className="my-3 rounded-r-xl border-l-4 border-[var(--accent-rust,#991b1b)] bg-amber-50/50 p-3.5 text-stone-800 shadow-2xs font-serif leading-relaxed text-sm sm:text-base space-y-2"
      >
        {rawLines.map((line, lIdx) => {
          // Check for bold title like **Core Worldview**: or **Defining Crucible**:
          const titleMatch = line.match(/^(\*\*.*?\*\*[:]?)\s*(.*)$/)
          if (titleMatch) {
            const rawTitle = titleMatch[1].replace(/\*\*/g, "")
            let restText = titleMatch[2].trim()
            // Strip outer italics markers if present: *text* or _text_
            if (
              (restText.startsWith("*") && restText.endsWith("*")) ||
              (restText.startsWith("_") && restText.endsWith("_"))
            ) {
              restText = restText.slice(1, -1).trim()
            }
            return (
              <div key={lIdx} className="space-y-0.5">
                <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-amber-900/90 block">
                  {rawTitle}
                </span>
                <p className="italic text-stone-900 font-serif text-sm sm:text-base">
                  {renderBioParagraphWithLinks(restText)}
                </p>
              </div>
            )
          }

          return (
            <div key={lIdx}>
              {renderBioParagraphWithLinks(line)}
            </div>
          )
        })}
      </blockquote>
    )
  }

  return (
    <p key={index}>
      {renderBioParagraphWithLinks(paragraph)}
    </p>
  )
}

export default async function AuthorDetailPage({
  params,
  searchParams,
}: AuthorDetailPageProps) {
  const { slug: rawSlug } = await params
  const slug = sanitizeSlug(rawSlug, 150)

  const author = await getAuthorBySlug(slug)

  if (!author) {
    notFound()
  }

  const companionThinkers = getAuthorCompanionThinkers(author.name)
  const companionNames = companionThinkers
    ? [
        ...companionThinkers.influences,
        ...companionThinkers.influenced,
        ...companionThinkers.contrasts,
      ]
    : []

  const [topCategoriesRaw, relatedAuthors, authorFaqs, matchedCompanionAuthors] = await Promise.all([
    prisma.quote.findMany({
      where: {
        authorId: author.id,
        status: "PUBLISHED",
        deletedAt: null,
      },
      select: {
        category: { select: { id: true, name: true, slug: true } },
      },
      take: 24,
    }),
    prisma.author.findMany({
      where: {
        id: { not: author.id },
        quoteCount: { gt: 0 },
        ...(author.nationality || author.profession
          ? {
              OR: [
                author.profession ? { profession: author.profession } : {},
                author.nationality ? { nationality: author.nationality } : {},
              ],
            }
          : {}),
      },
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
      take: 4,
      orderBy: [{ quoteCount: "desc" }, { name: "asc" }],
    }),
    prisma.fAQ.findMany({
      where: {
        pageType: "AUTHOR",
        pageSlug: author.slug,
      },
      orderBy: { position: "asc" },
      select: { id: true, question: true, answer: true },
    }),
    companionNames.length > 0
      ? prisma.author.findMany({
          where: {
            name: { in: companionNames, mode: "insensitive" },
          },
          select: { name: true, slug: true },
        })
      : Promise.resolve([]),
  ])

  const authorSlugMap = new Map<string, string>()
  for (const m of matchedCompanionAuthors) {
    authorSlugMap.set(m.name.toLowerCase(), m.slug)
  }

  // Aggregate active thematic domains directly from distinct categories
  const categoryCountMap = new Map<string, { id: string; name: string; slug: string; quoteCount: number }>()
  for (const q of topCategoriesRaw) {
    if (q.category) {
      const existing = categoryCountMap.get(q.category.id)
      if (existing) {
        existing.quoteCount++
      } else {
        categoryCountMap.set(q.category.id, {
          id: q.category.id,
          name: q.category.name,
          slug: q.category.slug,
          quoteCount: 1,
        })
      }
    }
  }
  const topCategories = Array.from(categoryCountMap.values()).sort((a, b) => b.quoteCount - a.quoteCount)

  const totalQuotes = author.quoteCount

  const lifespan = formatLifespan(author)
  const epoch = formatEpoch(author.birthYear)
  const authorImageUrl = normalizeWikimediaThumbnailUrl(author.imageUrl)
  const cleanedProfession = cleanProfession(author.profession)
  const dateOfBirthFormatted = formatDateOfRecord(author.dateOfBirth)
  const dateOfDeathFormatted = formatDateOfRecord(author.dateOfDeath)

  const jsonLd = buildAuthorKnowledgeGraph({
    ...author,
    topCategories,
    sources: author.sources,
    faqs: authorFaqs,
    companionThinkers: companionThinkers || undefined,
  })

  return (
    <PublicLayout>
      <JsonLd data={jsonLd} />
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12 space-y-10 font-sans">
        {/* Breadcrumb Navigation */}
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Authors", href: "/authors" },
            { label: author.name },
          ]}
        />

        {/* Author Profile Hero Card */}
        <div className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 lg:p-10 shadow-xs relative overflow-hidden">
          {/* Subtle Ambient Decorative Tint */}
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-amber-500/10 via-[var(--accent-rust)]/5 to-transparent blur-3xl"
            aria-hidden="true"
          />

          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start relative z-10">
            {/* Portrait Frame or Regal Monogram Seal */}
            <AuthorAvatar
              name={author.name}
              imageUrl={authorImageUrl}
              size="xl"
              priority
              loading="eager"
              showBadge
              badgeLabel="Thinker"
              className="border-2 border-stone-200/90 shadow-md"
            />

            {/* Author Information */}
            <div className="space-y-4 flex-1">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {cleanedProfession && (
                      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-rust)]">
                        {cleanedProfession}
                      </span>
                    )}
                    {author.nationality && (
                      <span className="text-xs font-medium text-stone-500">
                        {cleanedProfession ? "• " : ""}{author.nationality}
                      </span>
                    )}
                    {lifespan && (
                      <span className="text-xs font-mono font-medium text-stone-500">
                        • {lifespan}
                      </span>
                    )}
                    {epoch && (
                      <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
                        {epoch}
                      </span>
                    )}
                  </div>

                  <Link
                    href="/quotes/random"
                    prefetch={false}
                    className="inline-flex items-center gap-1.5 rounded-full border border-stone-300/80 bg-white/90 px-3 py-1 text-xs font-semibold text-stone-700 hover:border-stone-400 hover:bg-white hover:text-stone-900 transition-all shadow-2xs"
                    title="Discover a random quotation from the archive"
                  >
                    <span className="text-sm" aria-hidden="true">🎲</span>
                    <span>Random Quote</span>
                  </Link>
                </div>

                <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--ink-900)]">
                  {author.name}
                </h1>

                {/* Exact Birth & Death Dates Chronology if Recorded */}
                {(dateOfBirthFormatted || dateOfDeathFormatted) && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-600 font-mono mt-2 pt-1 border-t border-stone-100">
                    {dateOfBirthFormatted && (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-stone-400 font-sans font-medium uppercase tracking-wider text-[10px]">Born:</span>
                        <span className="font-medium text-stone-800">{dateOfBirthFormatted}</span>
                      </span>
                    )}
                    {dateOfBirthFormatted && dateOfDeathFormatted && (
                      <span className="text-stone-300">•</span>
                    )}
                    {dateOfDeathFormatted && (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-stone-400 font-sans font-medium uppercase tracking-wider text-[10px]">Died:</span>
                        <span className="font-medium text-stone-800">{dateOfDeathFormatted}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Biography */}
              {author.bio && (
                <div className="text-sm sm:text-base text-stone-700 leading-relaxed font-serif max-w-3xl border-l-2 border-[var(--accent-rust)]/40 pl-4 py-1 space-y-2">
                  {author.bio.split("\n\n").map((paragraph, index) =>
                    renderBioParagraph(paragraph, index)
                  )}
                </div>
              )}

              {/* Authority & External Catalog Links */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3.5 py-1 text-xs font-semibold text-stone-800">
                  <span className="text-stone-500">Quotes:</span>
                  <span className="font-bold">{totalQuotes}</span>
                </span>

                {author.sources.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/80 px-3 py-1 text-xs font-semibold text-amber-900">
                    <span className="text-amber-700">Works:</span>
                    <span className="font-bold">{author.sources.length}</span>
                  </span>
                )}

                {isSafeExternalUrl(author.wikipediaUrl) && (
                  <a
                    href={author.wikipediaUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-stone-200/90 bg-white px-3.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition-all shadow-2xs"
                  >
                    <span>Wikipedia</span>
                    <svg className="h-3 w-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}

                {isValidWikidataId(author.wikidataId) && (
                  <a
                    href={`https://www.wikidata.org/wiki/${author.wikidataId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-stone-200/90 bg-white px-3.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition-all shadow-2xs"
                  >
                    <span>Wikidata ({author.wikidataId})</span>
                    <svg className="h-3 w-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Thematic Focus & Philosophical Domains */}
        {topCategories.length > 0 && (
          <section className="space-y-3" aria-labelledby="thematic-focus-heading">
            <div className="flex items-center justify-between border-b border-stone-900/10 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-base" aria-hidden="true">🧭</span>
                <h2 id="thematic-focus-heading" className="font-serif text-lg sm:text-xl font-bold tracking-tight text-[var(--ink-900)]">
                  Thematic Focus &amp; Philosophical Domains
                </h2>
              </div>
              <span className="text-xs text-stone-500 font-mono">
                Explore by category
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {topCategories.map((cat) => {
                const meta = getCategoryMeta(cat.name)
                return (
                  <Link
                    key={cat.id}
                    href={`/categories/${cat.slug}`}
                    className={`inline-flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-medium transition-all shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 ${meta.border} bg-white hover:bg-stone-50/80 text-stone-800`}
                  >
                    <span className="text-base leading-none" aria-hidden="true">{meta.icon}</span>
                    <span className="font-semibold text-stone-900">{cat.name}</span>
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-mono font-bold text-stone-600">
                      {cat.quoteCount}
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Intellectual Lineage & Influences Shelf */}
        {companionThinkers && (
          <section className="space-y-4" aria-labelledby="intellectual-lineage-heading">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-stone-900/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg" aria-hidden="true">🏛️</span>
                <h2 id="intellectual-lineage-heading" className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[var(--ink-900)]">
                  Intellectual Lineage &amp; Influences
                </h2>
              </div>
              <span className="text-xs font-mono text-stone-500">
                Roots, successors &amp; contrasting schools
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Roots & Mentors */}
              <div className="flex flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-5 shadow-2xs space-y-3.5">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5 font-sans">
                      <span>🏛️</span> Roots &amp; Mentors
                    </span>
                    <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60 font-semibold">
                      {companionThinkers.influences.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 font-sans">
                    Formative teachers, ancient masters &amp; classical traditions
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {companionThinkers.influences.map((thinker) => {
                    const slug = authorSlugMap.get(thinker.toLowerCase())
                    const href = slug ? `/authors/${slug}` : `/search?q=${encodeURIComponent(thinker)}`
                    return (
                      <Link
                        key={thinker}
                        href={href}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200/80 bg-stone-50/70 hover:bg-amber-50/70 hover:border-amber-300/80 px-2.5 py-1 text-xs font-medium text-stone-800 hover:text-amber-950 transition shadow-2xs group"
                      >
                        <span>{thinker}</span>
                        {slug && (
                          <span className="text-[10px] text-amber-600/70 group-hover:text-amber-800" title="View author profile">
                            →
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>

              {/* Successors & Heirs */}
              <div className="flex flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-5 shadow-2xs space-y-3.5">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5 font-sans">
                      <span>🌿</span> Successors &amp; Heirs
                    </span>
                    <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200/60 font-semibold">
                      {companionThinkers.influenced.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 font-sans">
                    Thinkers, writers &amp; modern leaders who carried ideas forward
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {companionThinkers.influenced.map((thinker) => {
                    const slug = authorSlugMap.get(thinker.toLowerCase())
                    const href = slug ? `/authors/${slug}` : `/search?q=${encodeURIComponent(thinker)}`
                    return (
                      <Link
                        key={thinker}
                        href={href}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200/80 bg-stone-50/70 hover:bg-indigo-50/70 hover:border-indigo-300/80 px-2.5 py-1 text-xs font-medium text-stone-800 hover:text-indigo-950 transition shadow-2xs group"
                      >
                        <span>{thinker}</span>
                        {slug && (
                          <span className="text-[10px] text-indigo-600/70 group-hover:text-indigo-800" title="View author profile">
                            →
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>

              {/* Contrasting Voices */}
              <div className="flex flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-5 shadow-2xs space-y-3.5">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-rust,#991b1b)] flex items-center gap-1.5 font-sans">
                      <span>⚖️</span> Contrasting Voices
                    </span>
                    <span className="text-[10px] font-mono text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60 font-semibold">
                      {companionThinkers.contrasts.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 font-sans">
                    Opposing worldviews, rival philosophical schools &amp; critiques
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {companionThinkers.contrasts.map((thinker) => {
                    const slug = authorSlugMap.get(thinker.toLowerCase())
                    const href = slug ? `/authors/${slug}` : `/search?q=${encodeURIComponent(thinker)}`
                    return (
                      <Link
                        key={thinker}
                        href={href}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200/80 bg-stone-50/70 hover:bg-rose-50/70 hover:border-rose-300/80 px-2.5 py-1 text-xs font-medium text-stone-800 hover:text-rose-950 transition shadow-2xs group"
                      >
                        <span>{thinker}</span>
                        {slug && (
                          <span className="text-[10px] text-rose-600/70 group-hover:text-rose-800" title="View author profile">
                            →
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Notable Works & Citations Shelf */}
        {author.sources.length > 0 && (
          <section className="space-y-4" aria-labelledby="notable-works-heading">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-stone-900/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg" aria-hidden="true">📖</span>
                <h2 id="notable-works-heading" className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[var(--ink-900)]">
                  Notable Works &amp; Cited Sources
                </h2>
              </div>
              <span className="text-xs font-mono text-stone-500">
                {formatCountWithNoun(author.sources.length, "work")} in library
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {author.sources.map((source) => {
                const sourceYear = formatSourceYearLabel(source)
                return (
                  <div
                    key={source.id}
                    className="group relative flex flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-5 shadow-2xs hover:border-[var(--accent-rust)]/40 hover:shadow-sm transition-all"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900 border border-amber-500/20">
                          {formatWorkType(source.type)}
                        </span>
                        {sourceYear && (
                          <span className="font-mono text-xs text-stone-500">
                            {sourceYear}
                          </span>
                        )}
                      </div>

                      <h3 className="font-serif text-base sm:text-lg font-bold text-stone-900 group-hover:text-[var(--accent-rust)] transition-colors leading-snug">
                        <em>{source.title}</em>
                      </h3>

                      {source.publisher && (
                        <p className="text-xs text-stone-500 line-clamp-1">
                          Pub: {source.publisher}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                      <span className="font-mono text-stone-600 font-medium">
                        {formatCountWithNoun(source.quoteCount, "quote")}
                      </span>

                      {isSafeExternalUrl(source.externalUrl) && (
                        <a
                          href={source.externalUrl!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-[var(--accent-rust)] hover:underline"
                          aria-label={`External reference for ${source.title}`}
                        >
                          <span>Reference</span>
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Quotes Section (Suspense-isolated to preserve static generation of author profile) */}
        <React.Suspense fallback={<AuthorQuotesSkeleton />}>
          <AuthorQuotesSection
            authorId={author.id}
            authorName={author.name}
            authorSlug={author.slug}
            totalQuotes={totalQuotes}
            searchParams={searchParams}
          />
        </React.Suspense>

        {/* Frequently Asked Questions (FAQPage Schema Supported) */}
        {authorFaqs.length > 0 && (
          <section className="space-y-4 pt-6 border-t border-stone-200/80" aria-labelledby="author-faqs-heading">
            <div className="flex items-center justify-between border-b border-stone-900/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg" aria-hidden="true">💡</span>
                <h2 id="author-faqs-heading" className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[var(--ink-900)]">
                  Frequently Asked Questions
                </h2>
              </div>
              <span className="text-xs font-mono text-stone-500">
                Schema: FAQPage
              </span>
            </div>

            <div className="space-y-3">
              {authorFaqs.map((faq) => (
                <details
                  key={faq.id}
                  className="group rounded-2xl border border-stone-200/90 bg-white p-5 shadow-2xs transition-all hover:border-[var(--accent-rust)]/35 open:shadow-xs"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 font-serif text-base sm:text-lg font-bold text-stone-900 list-none select-none">
                    <span>{faq.question}</span>
                    <span className="text-stone-400 group-open:rotate-180 transition-transform text-xs font-mono" aria-hidden="true">
                      ▼
                    </span>
                  </summary>
                  <div className="mt-3.5 pt-3 border-t border-stone-100 text-sm sm:text-base text-stone-700 leading-relaxed font-sans">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Related Thinkers & Contemporary Voices */}
        {relatedAuthors.length > 0 && (
          <section className="pt-6 border-t border-stone-200/80 space-y-4" aria-labelledby="related-thinkers-heading">
            <div className="flex items-center justify-between">
              <h3 id="related-thinkers-heading" className="font-serif text-xl font-bold text-stone-900">
                Related Thinkers &amp; Contemporary Voices
              </h3>
              <Link
                href="/authors"
                className="text-xs font-semibold text-[var(--accent-rust)] hover:underline"
              >
                Browse All Authors →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {relatedAuthors.map((item) => {
                const itemLifespan = formatLifespan(item)
                const itemCleanProf = cleanProfession(item.profession)

                return (
                  <Link
                    key={item.id}
                    href={`/authors/${item.slug}`}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs hover:border-[var(--accent-rust)]/40 hover:shadow-xs transition-all space-y-3"
                  >
                    <div className="space-y-3">
                      {/* Portrait Thumbnail / Monogram */}
                      <div className="flex items-center gap-3">
                        <AuthorAvatar name={item.name} imageUrl={item.imageUrl} size="sm" />

                        <div className="min-w-0 flex-1">
                          <p className="font-serif font-bold text-stone-900 text-sm group-hover:text-[var(--accent-rust)] transition-colors truncate">
                            {item.name}
                          </p>
                          {itemLifespan && (
                            <p className="text-[11px] font-mono text-stone-500 truncate">
                              {itemLifespan}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Profession & Nationality */}
                      {(item.nationality || itemCleanProf) && (
                        <p className="text-xs text-stone-600 truncate border-t border-stone-100 pt-2">
                          <span className="font-medium">{itemCleanProf ?? "Thinker"}</span>
                          {item.nationality && <span className="text-stone-400"> • {item.nationality}</span>}
                        </p>
                      )}
                    </div>

                    <div className="border-t border-stone-100 pt-2 flex items-center justify-between text-[11px] font-mono text-stone-500">
                      <span>{formatCountWithNoun(item.quoteCount, "quote")}</span>
                      <span className="text-[var(--accent-rust)] font-bold group-hover:translate-x-0.5 transition-transform">→</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </PublicLayout>
  )
}
