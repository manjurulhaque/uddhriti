import { z } from "zod"

export const authorSchema = z.object({
  name: z.string().min(1, "Name is required"),

  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase and hyphenated"),

  bio: z.string().optional().nullable(),

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

  profession: z.string().optional().nullable(),
  nationality: z.string().optional().nullable(),

  imageUrl: z.string().url().optional().nullable(),
  wikipediaUrl: z.string().url().optional().nullable(),

  wikidataId: z
    .string()
    .regex(/^Q\d+$/, "Wikidata ID must look like Q123")
    .optional()
    .nullable(),
})
