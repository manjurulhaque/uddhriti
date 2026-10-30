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
  title: z.string().trim().min(1, "Title is required").max(300, "Title cannot exceed 300 characters"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(300)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase and hyphenated"),
  type: workTypeSchema,
  year: z.number().int().min(-3000).max(3000).optional().nullable(),
  yearLabel: z.string().trim().max(50).optional().nullable(),
  yearApproximate: z.boolean().optional(),
  publisher: z.string().trim().max(200).optional().nullable(),
  location: z.string().trim().max(200).optional().nullable(),
  description: z.string().trim().max(3_000).optional().nullable(),
  externalUrl: z.string().url().max(2_000).optional().nullable(),
  authorId: z.string().uuid().optional().nullable(),
})
