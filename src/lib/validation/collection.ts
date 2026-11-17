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

export const collectionQuotesAddSchema = z.object({
  quoteIds: z.array(z.string().uuid("Invalid quote ID")).min(1, "At least one quote must be selected"),
  position: z.number().int().optional(),
})

export const collectionQuotesRemoveSchema = z.object({
  quoteIds: z.array(z.string().uuid("Invalid quote ID")).min(1, "At least one quote must be selected"),
})

export const collectionQuotesReorderSchema = z.object({
  items: z
    .array(
      z.object({
        quoteId: z.string().uuid("Invalid quote ID"),
        position: z.number().int(),
      })
    )
    .min(1, "Items cannot be empty"),
})

