import { z } from "zod"

const workTypeSchema = z.enum([
  "BOOK",
  "SPEECH",
  "ARTICLE",
  "INTERVIEW",
  "SCRIPTURE",
  "LETTER",
  "OTHER",
])

export const sourceSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase and hyphenated"),
  type: workTypeSchema,
  year: z.number().int().min(-3000).max(3000).optional().nullable(),
  yearLabel: z.string().trim().max(50).optional().nullable(),
  yearApproximate: z.boolean().optional(),
  publisher: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  externalUrl: z.string().url().optional().nullable(),
  authorId: z.string().uuid().optional().nullable(),
})
