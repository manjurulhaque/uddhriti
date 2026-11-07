import { revalidatePath, revalidateTag } from "next/cache"

export const ADMIN_DASHBOARD_CACHE_TAG = "admin-dashboard-metrics"
export const HOME_PAGE_CACHE_TAG = "home-page-data"
export const HOME_TAXONOMIES_CACHE_TAG = "home-taxonomies"

// Global in-memory cache invalidation registry
let onPublicDataInvalidated: (() => void) | null = null

export function registerPublicDataInvalidator(fn: () => void) {
  onPublicDataInvalidated = fn
}

export function revalidatePublicSurfaces() {
  try {
    revalidateTag(HOME_PAGE_CACHE_TAG, "max")
    revalidateTag(HOME_TAXONOMIES_CACHE_TAG, "max")
  } catch (err) {
    console.warn("Failed to revalidate home cache tags:", err)
  }

  if (onPublicDataInvalidated) {
    try {
      onPublicDataInvalidated()
    } catch (err) {
      console.warn("Failed to trigger in-memory cache invalidator:", err)
    }
  }

  try {
    revalidatePath("/")
    revalidatePath("/quotes")
    revalidatePath("/authors")
    revalidatePath("/categories")
    revalidatePath("/tags")
  } catch (err) {
    console.warn("Failed to revalidate public homepage/quotes/authors/categories/tags paths:", err)
  }
  revalidateDashboardMetrics()
}

export function revalidateDashboardMetrics() {
  try {
    revalidateTag(ADMIN_DASHBOARD_CACHE_TAG, "max")
    revalidatePath("/admin/dashboard")
  } catch (err) {
    // Graceful fallback if called outside an active request context
    console.warn("Failed to revalidate dashboard metrics cache:", err)
  }
}
