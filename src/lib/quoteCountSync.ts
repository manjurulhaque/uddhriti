import { Prisma } from "@prisma/client"

function compactIds(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)))
}

export async function recalculateAuthorQuoteCounts(tx: Prisma.TransactionClient, authorIds: Array<string | null | undefined>) {
  const ids = compactIds(authorIds)
  if (ids.length === 0) return

  await tx.$executeRaw`
    UPDATE "Author" a
    SET "quoteCount" = counts.cnt
    FROM (
      SELECT target.id, COUNT(q.id)::int AS cnt
      FROM unnest(ARRAY[${Prisma.join(ids)}]::uuid[]) AS target(id)
      LEFT JOIN "Quote" q ON q."authorId" = target.id AND q."deletedAt" IS NULL
      GROUP BY target.id
    ) counts
    WHERE a.id = counts.id
  `
}

export async function recalculateSourceQuoteCounts(tx: Prisma.TransactionClient, sourceIds: Array<string | null | undefined>) {
  const ids = compactIds(sourceIds)
  if (ids.length === 0) return

  await tx.$executeRaw`
    UPDATE "Source" s
    SET "quoteCount" = counts.cnt
    FROM (
      SELECT target.id, COUNT(q.id)::int AS cnt
      FROM unnest(ARRAY[${Prisma.join(ids)}]::uuid[]) AS target(id)
      LEFT JOIN "Quote" q ON q."sourceId" = target.id AND q."deletedAt" IS NULL
      GROUP BY target.id
    ) counts
    WHERE s.id = counts.id
  `
}

export async function recalculateCategoryQuoteCounts(
  tx: Prisma.TransactionClient,
  categoryIds: Array<string | null | undefined>
) {
  const ids = compactIds(categoryIds)
  if (ids.length === 0) return

  await tx.$executeRaw`
    UPDATE "Category" c
    SET "quoteCount" = counts.cnt
    FROM (
      SELECT target.id, COUNT(q.id)::int AS cnt
      FROM unnest(ARRAY[${Prisma.join(ids)}]::uuid[]) AS target(id)
      LEFT JOIN "Quote" q ON q."categoryId" = target.id AND q."deletedAt" IS NULL
      GROUP BY target.id
    ) counts
    WHERE c.id = counts.id
  `
}

export async function recalculateTagQuoteCounts(tx: Prisma.TransactionClient, tagIds: Array<string | null | undefined>) {
  const ids = compactIds(tagIds)
  if (ids.length === 0) return

  await tx.$executeRaw`
    UPDATE "Tag" t
    SET "quoteCount" = counts.cnt
    FROM (
      SELECT target.id, COUNT(q.id)::int AS cnt
      FROM unnest(ARRAY[${Prisma.join(ids)}]::uuid[]) AS target(id)
      LEFT JOIN "QuoteTag" qt ON qt."tagId" = target.id
      LEFT JOIN "Quote" q ON q.id = qt."quoteId" AND q."deletedAt" IS NULL
      GROUP BY target.id
    ) counts
    WHERE t.id = counts.id
  `
}
