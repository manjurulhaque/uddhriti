import * as React from "react"
import { PublicLayout } from "@/components/public"
import { Skeleton } from "@/components/ui/skeleton"

export default function AuthorsLoading() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12 space-y-8 font-sans" aria-busy="true" aria-label="Loading authors directory...">
        {/* Editorial Page Header Skeleton */}
        <div className="border-b border-stone-900/10 pb-6 sm:pb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-10 sm:h-12 w-80 rounded-xl" />
            <Skeleton className="h-5 w-full max-w-md rounded" />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-end">
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="h-8 w-32 rounded-full" />
          </div>
        </div>

        {/* Search & Alphabet Toolbar Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-2xl" />

          {/* Alphabet Bar Skeleton */}
          <div className="flex items-center gap-1.5 overflow-hidden py-1">
            <Skeleton className="h-8 w-12 shrink-0 rounded-xl" />
            {Array.from({ length: 16 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-8 shrink-0 rounded-xl" />
            ))}
          </div>
        </div>

        {/* Authors Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col justify-between rounded-[1.75rem] border border-amber-900/10 bg-white/95 p-5 shadow-2xs space-y-4"
            >
              <div className="flex items-start gap-3.5">
                <Skeleton className="h-12 w-12 rounded-2xl shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-5 w-32 rounded" />
                  <Skeleton className="h-3.5 w-24 rounded" />
                  <Skeleton className="h-4 w-16 rounded" />
                </div>
              </div>
              <Skeleton className="h-4 w-28 rounded" />
              <div className="rounded-xl border border-amber-900/10 bg-[#faf6f0]/70 p-3 space-y-1.5">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-4/5 rounded" />
              </div>
              <div className="flex items-center justify-between border-t border-stone-100 pt-3">
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-4 w-16 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Skeleton */}
        <div className="flex items-center justify-between pt-6 border-t border-stone-200">
          <Skeleton className="h-5 w-36 rounded" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20 rounded-xl" />
            <Skeleton className="h-9 w-20 rounded-xl" />
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
