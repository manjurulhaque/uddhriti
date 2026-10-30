import { z } from "zod"

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200, "Name cannot exceed 200 characters"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase and hyphenated"),
  description: z.string().trim().max(2_000).optional().nullable(),
  metaTitle: z.string().trim().max(300).optional().nullable(),
  metaDescription: z.string().trim().max(500).optional().nullable(),
})
