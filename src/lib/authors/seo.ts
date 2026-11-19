/**
 * SEO & Knowledge Graph Entity Optimization for Authors
 *
 * Provides:
 * 1. Sentence-aware, high-CTR meta description generation (140-160 characters).
 * 2. Search-intent calibrated page titles (e.g. "Marcus Aurelius Quotes & Stoic Philosophy | Quotzen").
 * 3. Deep Schema.org Knowledge Graph (@graph) construction:
 *    - Person entity with knowsAbout, sameAs, hasOccupation, and workExample relationships.
 *    - BreadcrumbList for rich Google search result breadcrumbs.
 *    - CollectionPage linking the author entity to their Quotzen quotation archive.
 */

import { cleanProfession, formatLifespan, normalizeWikimediaThumbnailUrl } from "@/lib/formatters"
import { getSiteUrl } from "@/lib/site"
import { isSafeExternalUrl, isValidWikidataId } from "@/lib/security/input"

export interface AuthorSeoData {
  name: string
  slug: string
  bio?: string | null
  profession?: string | null
  nationality?: string | null
  birthYear?: number | null
  deathYear?: number | null
  dateOfBirth?: Date | string | null
  dateOfDeath?: Date | string | null
  imageUrl?: string | null
  wikipediaUrl?: string | null
  wikidataId?: string | null
  quoteCount?: number
  topCategories?: Array<{ id: string; name: string; slug: string }>
  sources?: Array<{
    id: string
    title: string
    slug: string
    type?: string | null
    year?: number | null
  }>
  faqs?: Array<{
    question: string
    answer: string
  }>
  companionThinkers?: {
    influences?: string[]
    influenced?: string[]
    contrasts?: string[]
  }
}

/**
 * Extracts a clean, sentence-aware SEO meta description strictly between 120 and 160 characters.
 * Prevents mid-sentence and mid-word truncation.
 */
export function extractAuthorMetaDescription(author: {
  name: string
  profession?: string | null
  bio?: string | null
}): string {
  const cleanedRole = cleanProfession(author.profession)
  const roleClause = cleanedRole ? `, ${cleanedRole}` : ""

  if (author.bio && author.bio.trim().length > 20) {
    const rawParagraphs = author.bio
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(Boolean)

    // Skip blockquote callouts (e.g. "> **Core Worldview**...") to find the first narrative prose paragraph
    const narrativeParagraph = rawParagraphs.find((p) => !p.startsWith(">"))
    const targetParagraph = narrativeParagraph || rawParagraphs[0] || ""

    // Strip markdown formatting for clean plain text SERP output
    const p1 = targetParagraph
      .replace(/^>+\s*/gm, "")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      .replace(/^(?:Core Worldview|Defining Crucible)[:\-]?\s*/i, "")
      .replace(/[ \t]{2,}/g, " ")
      .trim()

    // 1. If paragraph 1 itself is already <= 160 characters and has closing punctuation
    if (p1.length >= 70 && p1.length <= 160 && /[.!?]$/.test(p1)) {
      return p1
    }

    // 2. Try to capture complete sentences that fit under 158 characters
    const sentences = p1.match(/[^.!?]+[.!?]+/g)
    if (sentences && sentences.length > 0) {
      let accumulated = ""
      for (const sentence of sentences) {
        const candidate = accumulated ? `${accumulated} ${sentence.trim()}` : sentence.trim()
        if (candidate.length <= 160) {
          accumulated = candidate
        } else {
          break
        }
      }
      if (accumulated.length >= 70) {
        return accumulated
      }
    }

    // 3. Fallback: Truncate at the last word boundary before 155 chars + ellipsis
    if (p1.length > 155) {
      const truncated = p1.slice(0, 152)
      const lastSpace = truncated.lastIndexOf(" ")
      const cleanSub = lastSpace > 60 ? truncated.slice(0, lastSpace) : truncated
      return `${cleanSub.replace(/[,;:\s]+$/, "")}...`
    }

    return p1
  }

  // Fallback for authors without biography
  return `Explore timeless quotes, philosophy, and ideas by ${author.name}${roleClause}. Discover curated wisdom on resilience, purpose, and thoughtful living.`
}

/**
 * Generates an intent-optimized HTML title tag for author pages.
 */
export function generateAuthorPageTitle(author: {
  name: string
  profession?: string | null
}): string {
  const cleanedRole = cleanProfession(author.profession)
  if (cleanedRole) {
    return `${author.name} Quotes & Philosophy - ${cleanedRole}`
  }
  return `${author.name} Quotes & Philosophy - Quotzen`
}

/**
 * Constructs a rich Schema.org Knowledge Graph array containing:
 * - Person (core entity)
 * - BreadcrumbList (rich search path)
 * - CollectionPage (curated quotes archive)
 */
export function buildAuthorKnowledgeGraph(author: AuthorSeoData): Record<string, unknown> {
  const siteUrl = getSiteUrl()
  const authorUrl = `${siteUrl}/authors/${author.slug}`
  const authorImageUrl = normalizeWikimediaThumbnailUrl(author.imageUrl)
  const cleanedProfession = cleanProfession(author.profession)
  const metaDesc = extractAuthorMetaDescription(author)
  const lifespan = formatLifespan(author)

  // Disambiguating description (e.g., "Roman Emperor & Stoic Philosopher (121–180 AD)")
  const disambiguation = [
    cleanedProfession,
    author.nationality,
    lifespan ? `(${lifespan})` : null,
  ]
    .filter(Boolean)
    .join(" ")

  // External authority identifiers (Wikidata, Wikipedia)
  const sameAsList: string[] = []
  if (isSafeExternalUrl(author.wikipediaUrl)) sameAsList.push(author.wikipediaUrl!)
  if (isValidWikidataId(author.wikidataId)) {
    sameAsList.push(`https://www.wikidata.org/wiki/${author.wikidataId}`)
  }

  // Entity topical domains (knowsAbout) from curated quote categories
  const knowsAbout: string[] = author.topCategories?.map((c) => c.name) || []

  // Works relationships (workExample)
  const workExamples =
    author.sources && author.sources.length > 0
      ? author.sources.slice(0, 6).map((source) => ({
          "@type": source.type === "BOOK" ? "Book" : "CreativeWork",
          "@id": `${siteUrl}/sources/${source.slug}`,
          name: source.title,
          url: `${siteUrl}/sources/${source.slug}`,
          ...(source.year ? { datePublished: String(source.year) } : {}),
        }))
      : undefined

  // Birth/Death date parsing
  const birthDate = author.dateOfBirth
    ? author.dateOfBirth instanceof Date
      ? author.dateOfBirth.toISOString().split("T")[0]
      : String(author.dateOfBirth).split("T")[0]
    : author.birthYear
    ? String(author.birthYear)
    : undefined

  const deathDate = author.dateOfDeath
    ? author.dateOfDeath instanceof Date
      ? author.dateOfDeath.toISOString().split("T")[0]
      : String(author.dateOfDeath).split("T")[0]
    : author.deathYear
    ? String(author.deathYear)
    : undefined

  const personEntity: Record<string, unknown> = {
    "@type": "Person",
    "@id": `${authorUrl}#person`,
    name: author.name,
    url: authorUrl,
    mainEntityOfPage: authorUrl,
    description: metaDesc,
    ...(disambiguation ? { disambiguatingDescription: disambiguation } : {}),
    ...(authorImageUrl ? { image: authorImageUrl } : {}),
    ...(cleanedProfession ? { jobTitle: cleanedProfession } : {}),
    ...(cleanedProfession
      ? {
          hasOccupation: {
            "@type": "Occupation",
            name: cleanedProfession,
          },
        }
      : {}),
    ...(author.nationality ? { nationality: author.nationality } : {}),
    ...(birthDate ? { birthDate } : {}),
    ...(deathDate ? { deathDate } : {}),
    ...(sameAsList.length > 0 ? { sameAs: sameAsList } : {}),
    ...(knowsAbout.length > 0 ? { knowsAbout } : {}),
    ...(workExamples ? { workExample: workExamples } : {}),
    ...(author.companionThinkers
      ? (() => {
          const related = [
            ...(author.companionThinkers.influences || []),
            ...(author.companionThinkers.influenced || []),
            ...(author.companionThinkers.contrasts || []),
          ]
            .map((n) => n.trim())
            .filter((n) => n.length > 1)
          return related.length > 0
            ? {
                relatedTo: related.map((name) => ({
                  "@type": "Person",
                  name,
                })),
              }
            : {}
        })()
      : {}),
  }

  const breadcrumbEntity: Record<string, unknown> = {
    "@type": "BreadcrumbList",
    "@id": `${authorUrl}#breadcrumbs`,
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Authors",
        item: `${siteUrl}/authors`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: author.name,
        item: authorUrl,
      },
    ],
  }

  const collectionEntity: Record<string, unknown> = {
    "@type": "CollectionPage",
    "@id": authorUrl,
    url: authorUrl,
    name: `${author.name} Quotes & Wisdom Archive`,
    description: metaDesc,
    about: { "@id": `${authorUrl}#person` },
    isPartOf: {
      "@type": "WebSite",
      "@id": `${siteUrl}#website`,
      name: "Quotzen",
      url: siteUrl,
    },
  }

  const graph: Array<Record<string, unknown>> = [
    personEntity,
    breadcrumbEntity,
    collectionEntity,
  ]

  if (author.faqs && author.faqs.length > 0) {
    const faqPageEntity: Record<string, unknown> = {
      "@type": "FAQPage",
      "@id": `${authorUrl}#faq`,
      isPartOf: { "@id": authorUrl },
      mainEntity: author.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    }
    graph.push(faqPageEntity)
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  }
}
