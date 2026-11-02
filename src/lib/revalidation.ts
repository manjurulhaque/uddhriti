import { revalidatePath, revalidateTag } from "next/cache"

export const ADMIN_DASHBOARD_CACHE_TAG = "admin-dashboard-metrics"

export function revalidatePublicSurfaces() {
  revalidatePath("/")
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
