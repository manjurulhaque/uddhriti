import * as React from "react"
import { PublicLayout } from "@/components/public"
import { Skeleton } from "@/components/ui/skeleton"

export default function TagsLoading() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12 space-y-8 font-sans" aria-busy="true" aria-label="Loading tags directory...">
        {/* Editorial Header Skeleton */}
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

        {/* Search Input Skeleton */}
        <Skeleton className="h-12 w-full rounded-2xl" />

        {/* Grouped Tags Skeletons */}
        <div className="space-y-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-[2rem] border border-stone-200/90 bg-white/95 p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <Skeleton className="h-6 w-44 rounded-lg" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>
              <div className="flex flex-wrap gap-2.5">
                {Array.from({ length: 8 }).map((_, j) => (
                  <Skeleton key={j} className="h-8 w-28 rounded-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  )
}
