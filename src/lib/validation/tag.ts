import { z } from "zod"
import { tagTypeOptions } from "@/lib/tags/catalog"

export const tagSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Tag name cannot exceed 100 characters"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase and hyphenated"),
  type: z.enum(tagTypeOptions),
  description: z.string().trim().max(1_000).optional().nullable(),
})
