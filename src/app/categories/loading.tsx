import * as React from "react"
import { PublicLayout } from "@/components/public"
import { Skeleton } from "@/components/ui/skeleton"

export default function CategoriesLoading() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12 space-y-8 font-sans" aria-busy="true" aria-label="Loading categories directory...">
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

        {/* Categories Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col justify-between rounded-[2rem] border border-stone-200/90 bg-white/95 p-6 shadow-2xs space-y-5"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <Skeleton className="h-6 w-32 rounded-lg" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-4/5 rounded" />
              </div>

              <div className="rounded-xl bg-[#faf6f0]/70 border border-stone-200/60 p-3 space-y-1.5">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-4 w-full rounded" />
              </div>

              <div className="flex items-center justify-between border-t border-stone-100 pt-3">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-4 w-4 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  )
}
