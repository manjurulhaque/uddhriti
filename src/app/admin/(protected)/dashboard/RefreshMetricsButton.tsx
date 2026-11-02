"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
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
    <button
      type="button"
      onClick={handleRefresh}
      disabled={isPending}
      title="Refresh cached metrics from database"
      className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-3.5 py-2 text-sm font-medium text-stone-700 shadow-2xs transition hover:border-stone-400 hover:bg-stone-50 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
    >
      <svg
        className={`h-3.5 w-3.5 ${isPending ? "animate-spin text-stone-900" : "text-stone-500"}`}
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
      <span>{isPending ? "Refreshing..." : "Refresh"}</span>
    </button>
  )
}

