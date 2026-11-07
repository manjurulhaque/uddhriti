import type { Prisma } from "@prisma/client"

export type QuoteSortOption =
  | "newest"
  | "oldest"
  | "author-asc"
  | "author-desc"
  | "category-asc"
  | "category-desc"
  | "status"
  | "content"
  | "needs-attention"

export const quoteSortOptions = [
  { value: "newest", label: "Arrange: Newest first" },
  { value: "oldest", label: "Arrange: Oldest first" },
  { value: "author-asc", label: "Sort: Author A-Z" },
  { value: "author-desc", label: "Sort: Author Z-A" },
  { value: "category-asc", label: "Sort: Category A-Z" },
  { value: "category-desc", label: "Sort: Category Z-A" },
  { value: "status", label: "Sort: Status" },
  { value: "content", label: "Sort: Quote text" },
  { value: "needs-attention", label: "Arrange: Needs attention" },
]

export function getQuoteSort(value: string | string[] | undefined | null): QuoteSortOption {
  if (typeof value !== "string") return "newest"
  if (value === "oldest") return "oldest"
  if (value === "author-asc") return "author-asc"
  if (value === "author-desc") return "author-desc"
  if (value === "category-asc") return "category-asc"
  if (value === "category-desc") return "category-desc"
  if (value === "status") return "status"
  if (value === "content") return "content"
  if (value === "needs-attention") return "needs-attention"
  return "newest"
}

export function buildQuoteOrderBy(sort: QuoteSortOption): Prisma.QuoteOrderByWithRelationInput[] {
  switch (sort) {
    case "oldest":
      return [{ createdAt: "asc" }, { id: "asc" }]
    case "author-asc":
      return [{ authorName: "asc" }, { author: { name: "asc" } }, { createdAt: "desc" }, { id: "asc" }]
    case "author-desc":
      return [{ authorName: "desc" }, { author: { name: "desc" } }, { createdAt: "desc" }, { id: "asc" }]
    case "category-asc":
      return [{ category: { name: "asc" } }, { createdAt: "desc" }, { id: "asc" }]
    case "category-desc":
      return [{ category: { name: "desc" } }, { createdAt: "desc" }, { id: "asc" }]
    case "status":
      return [{ status: "asc" }, { createdAt: "desc" }, { id: "asc" }]
    case "content":
      return [{ content: "asc" }, { id: "asc" }]
    case "needs-attention":
      return [{ isVerified: "asc" }, { adminSortKey: "asc" }, { createdAt: "desc" }, { id: "asc" }]
    case "newest":
    default:
      return [{ createdAt: "desc" }, { id: "asc" }]
  }
}
