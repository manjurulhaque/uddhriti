import { z } from "zod"

const visibilitySchema = z.enum(["PUBLIC", "PRIVATE", "EDITORIAL"])

export const collectionSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase and hyphenated"),
  description: z.string().optional().nullable(),
  visibility: visibilitySchema,
})
