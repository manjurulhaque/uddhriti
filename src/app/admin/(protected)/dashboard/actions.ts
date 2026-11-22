"use server"

import { getAdmin } from "@/lib/auth/getAdmin"
import { revalidateDashboardMetrics } from "@/lib/revalidation"

export async function refreshDashboardAction() {
  const admin = await getAdmin()
  if (!admin) {
    throw new Error("Unauthorized")
  }
  revalidateDashboardMetrics()
}

