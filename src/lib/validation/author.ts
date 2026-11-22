import { z } from "zod"

export const authorSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200, "Name cannot exceed 200 characters"),

  slug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase and hyphenated"),

  bio: z.string().trim().max(5_000).optional().nullable(),

  birthYear: z
    .number()
    .int()
    .min(-3000)
    .max(new Date().getFullYear())
    .optional()
    .nullable(),

  deathYear: z
    .number()
    .int()
    .min(-3000)
    .max(new Date().getFullYear())
    .optional()
    .nullable(),

  dateOfBirth: z.coerce.date().optional().nullable(),
  dateOfDeath: z.coerce.date().optional().nullable(),

  profession: z.string().trim().max(200).optional().nullable(),
  nationality: z.string().trim().max(200).optional().nullable(),

  imageUrl: z.string().url().max(2_000).optional().nullable(),
  wikipediaUrl: z.string().url().max(2_000).optional().nullable(),

  wikidataId: z
    .string()
    .trim()
    .regex(/^Q\d+$/, "Wikidata ID must look like Q123")
    .optional()
    .nullable(),
})
