import { z } from "zod"

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase and hyphenated"),
  description: z.string().optional().nullable(),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
})

