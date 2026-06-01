import { z } from "zod"

const quoteStatusSchema = z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"])
const attributionStatusSchema = z.enum(["CONFIRMED", "DISPUTED", "MISATTRIBUTED", "UNKNOWN"])
const maxQuoteTags = 7
const sourceTypeSchema = z.enum([
  "BOOK",
  "SPEECH",
  "ARTICLE",
  "INTERVIEW",
  "SCRIPTURE",
  "LETTER",
  "OTHER",
])

export const quoteSchema = z.object({
  content: z.string().trim().min(5),
  meaning: z.string().trim().optional().nullable(),
  historicalContext: z.string().trim().optional().nullable(),
  modernRelevance: z.string().trim().optional().nullable(),
  authorId: z.string().uuid(),
  categoryId: z.string().uuid(),
  sourceId: z.string().uuid().optional().nullable(),
  language: z.string().trim().min(2).max(10).optional(),
  status: quoteStatusSchema,
  tagIds: z.array(z.string().uuid()).max(maxQuoteTags).optional(),
  isFeatured: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  attributionStatus: attributionStatusSchema.optional(),
  verificationConfidence: z.coerce.number().min(0).max(1).optional(),
  verificationNote: z.string().optional().nullable(),
  adminSortKey: z.coerce.number().int().optional(),
})

export const quoteCreateSchema = quoteSchema.extend({
  sourceTitle: z.string().trim().min(1).max(300).optional(),
  sourceType: sourceTypeSchema.optional(),
})

export const quoteUpdateSchema = quoteSchema.extend({
  sourceTitle: z.string().trim().min(1).max(300).optional(),
  sourceType: sourceTypeSchema.optional(),
  publishedAt: z.union([z.string().trim(), z.date()]).optional().nullable(),
})
