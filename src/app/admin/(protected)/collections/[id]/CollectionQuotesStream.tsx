import { prisma } from "@/lib/prisma"
import {
  CollectionQuotesManager,
  type CollectionQuoteItem,
} from "./CollectionQuotesManager"

export async function CollectionQuotesStream({
  collectionId,
  collectionTitle,
}: {
  collectionId: string
  collectionTitle: string
}) {
  const [items, total] = await Promise.all([
    prisma.quoteCollection.findMany({
      where: {
        collectionId,
        quote: { deletedAt: null },
      },
      orderBy: [
        { position: "asc" },
        { quote: { createdAt: "desc" } },
      ],
      take: 100,
      include: {
        quote: {
          select: {
            id: true,
            content: true,
            status: true,
            authorId: true,
            authorName: true,
            authorSlug: true,
            categorySlug: true,
            isVerified: true,
            attributionStatus: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.quoteCollection.count({
      where: {
        collectionId,
        quote: { deletedAt: null },
      },
    }),
  ])

  const serializedItems: CollectionQuoteItem[] = items.map((item) => ({
    quoteId: item.quoteId,
    position: item.position,
    quote: {
      ...item.quote,
      createdAt: item.quote.createdAt.toISOString(),
    },
  }))

  return (
    <CollectionQuotesManager
      collectionId={collectionId}
      collectionTitle={collectionTitle}
      initialQuotes={serializedItems}
      initialTotal={total}
    />
  )
}
