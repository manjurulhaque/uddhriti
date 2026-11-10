import type { Prisma } from "@prisma/client"

/**
 * Standard Prisma selection for Quote Card representations across all public pages.
 * Includes author, category, primary source metadata, and up to 6 linked tags.
 */
export const publicQuoteCardSelect = {
  id: true,
  slug: true,
  content: true,
  authorName: true,
  isVerified: true,
  views: true,
  author: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  source: {
    select: {
      title: true,
      year: true,
      yearLabel: true,
      yearApproximate: true,
    },
  },
  tags: {
    select: {
      tag: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
    take: 6,
  },
} as const satisfies Prisma.QuoteSelect

export type PublicQuoteCardItem = Prisma.QuoteGetPayload<{
  select: typeof publicQuoteCardSelect
}>

