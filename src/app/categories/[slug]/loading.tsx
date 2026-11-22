import * as React from "react"
import { PublicLayout } from "@/components/public"
import { Skeleton } from "@/components/ui/skeleton"

export default function CategoryDetailLoading() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12 space-y-10 font-sans" aria-busy="true" aria-label="Loading category quotations...">
        {/* Breadcrumb Skeleton */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-12 rounded" />
          <span className="text-stone-300">/</span>
          <Skeleton className="h-4 w-20 rounded" />
          <span className="text-stone-300">/</span>
          <Skeleton className="h-4 w-28 rounded" />
        </div>

        {/* Taxonomy Hero Skeleton */}
        <div className="rounded-[2.5rem] border border-stone-200/90 bg-white/95 p-6 sm:p-8 lg:p-10 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-2xl" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-8 sm:h-10 w-56 rounded-xl" />
              </div>
            </div>
            <Skeleton className="h-8 w-28 rounded-full" />
          </div>

          <Skeleton className="h-5 w-full max-w-2xl rounded" />

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Skeleton className="h-7 w-28 rounded-full" />
            <Skeleton className="h-7 w-36 rounded-full" />
            <Skeleton className="h-7 w-32 rounded-full" />
          </div>
        </div>

        {/* Thinker Shelf Skeleton */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-stone-900/10 pb-3">
            <Skeleton className="h-6 w-48 rounded-lg" />
            <Skeleton className="h-4 w-32 rounded" />
          </div>
          <div className="flex gap-4 overflow-hidden py-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 shrink-0 w-52">
                <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sort Toolbar Skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64 rounded-xl" />
          <Skeleton className="h-5 w-24 rounded" />
        </div>

        {/* Quotes Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
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
