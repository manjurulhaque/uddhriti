"use server"

import { revalidateDashboardMetrics } from "@/lib/revalidation"

export async function refreshDashboardAction() {
  revalidateDashboardMetrics()
}

