import { revalidatePath, revalidateTag } from "next/cache"

export const ADMIN_DASHBOARD_CACHE_TAG = "admin-dashboard-metrics"
export const HOME_PAGE_CACHE_TAG = "home-page-data"
export const HOME_TAXONOMIES_CACHE_TAG = "home-taxonomies"

// Global in-memory cache invalidation registries (multi-listener Sets)
const publicDataInvalidators = new Set<() => void>()
const dashboardInvalidators = new Set<() => void>()

export function registerPublicDataInvalidator(fn: () => void): () => void {
  publicDataInvalidators.add(fn)
  return () => {
    publicDataInvalidators.delete(fn)
  }
}

export function registerDashboardInvalidator(fn: () => void): () => void {
  dashboardInvalidators.add(fn)
  return () => {
    dashboardInvalidators.delete(fn)
  }
}

function logRevalidationWarning(message: string, err: unknown) {
  if (process.env.NODE_ENV !== "test") {
    console.warn(message, err)
  }
}

export function revalidatePublicSurfaces() {
  try {
    revalidateTag(HOME_PAGE_CACHE_TAG, "max")
    revalidateTag(HOME_TAXONOMIES_CACHE_TAG, "max")
  } catch (err) {
    logRevalidationWarning("Failed to revalidate home cache tags:", err)
  }

  for (const fn of publicDataInvalidators) {
    try {
      fn()
    } catch (err) {
      logRevalidationWarning("Failed to trigger in-memory cache invalidator:", err)
    }
  }

  try {
    revalidatePath("/")
    revalidatePath("/quotes")
    revalidatePath("/authors")
    revalidatePath("/categories")
    revalidatePath("/tags")
    revalidatePath("/feed.xml")
    revalidatePath("/rss.xml")
    revalidatePath("/sitemap.xml")
  } catch (err) {
    logRevalidationWarning("Failed to revalidate public homepage/quotes/authors/categories/tags paths:", err)
  }
  revalidateDashboardMetrics()
}

export function revalidateDashboardMetrics() {
  for (const fn of dashboardInvalidators) {
    try {
      fn()
    } catch (err) {
      logRevalidationWarning("Failed to trigger in-memory dashboard invalidator:", err)
    }
  }

  try {
    revalidateTag(ADMIN_DASHBOARD_CACHE_TAG, "max")
    revalidatePath("/admin/dashboard")
  } catch (err) {
    // Graceful fallback if called outside an active request context
    logRevalidationWarning("Failed to revalidate dashboard metrics cache:", err)
  }
}

/**
 * Revalidates the specific quote detail page, its OpenGraph/Twitter images,
 * and related author/category/tag detail pages.
 */
export function revalidateQuote(
  slug: string,
  options?: {
    oldSlug?: string
    authorSlug?: string
    oldAuthorSlug?: string
    categorySlug?: string
    oldCategorySlug?: string
    tagSlugs?: string[]
  }
) {
  if (!slug) return

  try {
    revalidatePath(`/quotes/${slug}`)
    revalidatePath(`/quotes/${slug}/opengraph-image`)
    revalidatePath(`/quotes/${slug}/twitter-image`)

    if (options?.oldSlug && options.oldSlug !== slug) {
      revalidatePath(`/quotes/${options.oldSlug}`)
      revalidatePath(`/quotes/${options.oldSlug}/opengraph-image`)
      revalidatePath(`/quotes/${options.oldSlug}/twitter-image`)
    }

    if (options?.authorSlug) {
      revalidatePath(`/authors/${options.authorSlug}`)
    }
    if (options?.oldAuthorSlug && options.oldAuthorSlug !== options.authorSlug) {
      revalidatePath(`/authors/${options.oldAuthorSlug}`)
    }

    if (options?.categorySlug) {
      revalidatePath(`/categories/${options.categorySlug}`)
    }
    if (options?.oldCategorySlug && options.oldCategorySlug !== options.categorySlug) {
      revalidatePath(`/categories/${options.oldCategorySlug}`)
    }

    if (options?.tagSlugs) {
      for (const tagSlug of options.tagSlugs) {
        if (tagSlug) revalidatePath(`/tags/${tagSlug}`)
      }
    }
  } catch (err) {
    logRevalidationWarning(`Failed to revalidate quote paths for "${slug}":`, err)
  }
}

export function revalidateAuthor(slug: string, oldSlug?: string) {
  if (!slug) return
  try {
    revalidatePath(`/authors/${slug}`)
    if (oldSlug && oldSlug !== slug) {
      revalidatePath(`/authors/${oldSlug}`)
    }
  } catch (err) {
    logRevalidationWarning(`Failed to revalidate author path for "${slug}":`, err)
  }
}

export function revalidateCategory(slug: string, oldSlug?: string) {
  if (!slug) return
  try {
    revalidatePath(`/categories/${slug}`)
    if (oldSlug && oldSlug !== slug) {
      revalidatePath(`/categories/${oldSlug}`)
    }
  } catch (err) {
    logRevalidationWarning(`Failed to revalidate category path for "${slug}":`, err)
  }
}

export function revalidateTagPage(slug: string, oldSlug?: string) {
  if (!slug) return
  try {
    revalidatePath(`/tags/${slug}`)
    if (oldSlug && oldSlug !== slug) {
      revalidatePath(`/tags/${oldSlug}`)
    }
  } catch (err) {
    logRevalidationWarning(`Failed to revalidate tag path for "${slug}":`, err)
  }
}
