export type Author = {
  id: string
  name: string
  slug?: string
  profession?: string | null
  nationality?: string | null
  birthYear?: number | null
  deathYear?: number | null
  quoteCount?: number
}

export type Category = {
  id: string
  name: string
  slug?: string
}

export type Source = {
  id: string
  title: string
}

export type Tag = {
  id: string
  name: string
  type: string
  description?: string | null
}

export type QuoteEditorMode = "create" | "edit"

export const STATUSES = ["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"] as const
export const ATTRIBUTION_STATUSES = ["CONFIRMED", "DISPUTED", "MISATTRIBUTED", "UNKNOWN"] as const
export const SOURCE_TYPES = ["BOOK", "SPEECH", "ARTICLE", "INTERVIEW", "SCRIPTURE", "LETTER", "OTHER"] as const
export const FORM_DEFAULTS_STORAGE_KEY = "admin:new-quote-defaults"
export const MAX_SELECTED_TAGS = 7

export type QuoteEditorFormState = {
  content: string
  meaning: string
  historicalContext: string
  modernRelevance: string
  authorId: string
  categoryId: string
  sourceId: string
  sourceTitle: string
  sourceType: (typeof SOURCE_TYPES)[number]
  language: string
  status: (typeof STATUSES)[number]
  tagIds: string[]
  publishedAt: string
  isFeatured: boolean
  isVerified: boolean
  attributionStatus: (typeof ATTRIBUTION_STATUSES)[number]
  verificationNote: string
}

export type QuoteEditorFormProps = {
  mode: QuoteEditorMode
  authors: Author[]
  categories: Category[]
  sources: Source[]
  tags: Tag[]
  quoteId?: string
  initialForm?: Partial<QuoteEditorFormState>
}

export const EMPTY_FORM: QuoteEditorFormState = {
  content: "",
  meaning: "",
  historicalContext: "",
  modernRelevance: "",
  authorId: "",
  categoryId: "",
  sourceId: "",
  sourceTitle: "",
  sourceType: "BOOK",
  language: "en",
  status: "DRAFT",
  tagIds: [],
  publishedAt: "",
  isFeatured: false,
  isVerified: false,
  attributionStatus: "UNKNOWN",
  verificationNote: "",
}

export type StoredDefaults = {
  authorId?: string
  categoryId?: string
  sourceId?: string
  sourceType?: (typeof SOURCE_TYPES)[number]
  language?: string
  status?: (typeof STATUSES)[number]
  tagIds?: string[]
}

export function serializeFormState(form: QuoteEditorFormState): string {
  return JSON.stringify({
    ...form,
    tagIds: [...form.tagIds].sort(),
  })
}

export function buildInitialForm(initialForm?: Partial<QuoteEditorFormState>): QuoteEditorFormState {
  return {
    ...EMPTY_FORM,
    ...initialForm,
    tagIds: initialForm?.tagIds ?? EMPTY_FORM.tagIds,
  }
}

export function validateForm(form: QuoteEditorFormState): string | null {
  if (!form.content.trim()) return "Quote content is required."
  if (form.content.trim().length < 5) return "Quote content must be at least 5 characters."
  if (!form.authorId) return "Please select an author."
  if (!form.categoryId) return "Please select a category."
  return null
}
