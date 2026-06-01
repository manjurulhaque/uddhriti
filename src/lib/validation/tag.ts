import { z } from "zod"
import { tagTypeOptions } from "@/lib/tags/catalog"

export const tagSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase and hyphenated"),
  type: z.enum(tagTypeOptions),
  description: z.string().optional().nullable(),
})
