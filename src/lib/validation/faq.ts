import { z } from "zod"

const pageTypeSchema = z.enum([
  "TAG",
  "CATEGORY",
  "AUTHOR",
  "QUOTE",
  "COLLECTION",
])

export const faqSchema = z.object({
  question: z.string().trim().min(1, "Question is required"),
  answer: z.string().trim().min(1, "Answer is required"),
  pageType: pageTypeSchema,
  pageSlug: z.string().trim().min(1, "Page slug is required"),
  position: z.number().int().min(0).optional(),
})
