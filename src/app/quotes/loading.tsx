import * as React from "react"
import { PublicLayout } from "@/components/public"
import { Skeleton } from "@/components/ui/skeleton"

export default function QuotesBrowseLoading() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12 space-y-8 font-sans" aria-busy="true" aria-label="Loading quotations archive...">
        {/* Editorial Header Skeleton */}
        <div className="border-b border-stone-900/10 pb-6 sm:pb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-10 sm:h-12 w-80 rounded-xl" />
            <Skeleton className="h-5 w-full max-w-md rounded" />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-end">
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="h-8 w-36 rounded-full" />
          </div>
        </div>

        {/* Search & Sort Controls Skeleton */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Skeleton className="h-12 flex-1 rounded-2xl" />
            <Skeleton className="h-12 w-full sm:w-64 rounded-2xl" />
          </div>

          {/* Category Filter Pills Skeleton */}
          <div className="flex items-center gap-2 overflow-hidden py-1">
            <Skeleton className="h-7 w-16 rounded" />
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 shrink-0 rounded-full" />
            ))}
          </div>
        </div>

        {/* Quotes 3-Column Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[1.75rem] border border-stone-200/90 bg-white/95 p-6 shadow-2xs space-y-5"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-14 rounded" />
              </div>
              <div className="space-y-2.5 py-2">
                <Skeleton className="h-5 w-full rounded" />
                <Skeleton className="h-5 w-11/12 rounded" />
                <Skeleton className="h-5 w-3/4 rounded" />
              </div>
              <div className="flex items-center justify-between border-t border-stone-100 pt-4">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-28 rounded" />
                </div>
                <Skeleton className="h-7 w-16 rounded-full" />
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
