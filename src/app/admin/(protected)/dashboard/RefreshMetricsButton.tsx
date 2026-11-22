"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui"
import { refreshDashboardAction } from "./actions"

export function RefreshMetricsButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleRefresh = () => {
    startTransition(async () => {
      await refreshDashboardAction()
      router.refresh()
    })
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      isLoading={isPending}
      disabled={isPending}
      title="Refresh cached metrics from database"
      leftIcon={
        !isPending ? (
          <svg
            className="h-3.5 w-3.5 text-stone-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        ) : undefined
      }
    >
      {isPending ? "Refreshing..." : "Refresh"}
    </Button>
  )
}


