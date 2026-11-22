import * as React from "react"
import { PublicLayout } from "@/components/public"
import { Skeleton } from "@/components/ui/skeleton"

export default function AuthorDetailLoading() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12 space-y-10 font-sans" aria-busy="true" aria-label="Loading author profile...">
        {/* Breadcrumb Skeleton */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-12 rounded" />
          <span className="text-stone-300">/</span>
          <Skeleton className="h-4 w-16 rounded" />
          <span className="text-stone-300">/</span>
          <Skeleton className="h-4 w-32 rounded" />
        </div>

        {/* Master Author Profile Hero Skeleton */}
        <div className="rounded-[2.5rem] border border-stone-200/90 bg-white/95 p-6 sm:p-8 lg:p-10 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start gap-6 sm:gap-8">
            <Skeleton className="h-28 w-28 sm:h-36 sm:w-36 rounded-[2rem] shrink-0" />
            <div className="space-y-4 flex-1">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-8 sm:h-10 w-64 rounded-xl" />
                <Skeleton className="h-4 w-48 rounded" />
              </div>
              <div className="space-y-2 max-w-3xl border-l-2 border-stone-200 pl-4 py-1">
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-5/6 rounded" />
                <Skeleton className="h-4 w-2/3 rounded" />
              </div>
              <div className="flex gap-2.5 pt-2">
                <Skeleton className="h-7 w-24 rounded-full" />
                <Skeleton className="h-7 w-20 rounded-full" />
                <Skeleton className="h-7 w-28 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Quotes Section Skeleton */}
        <div className="space-y-6">
          <div className="border-b border-stone-900/10 pb-4 flex items-center justify-between">
            <Skeleton className="h-7 w-48 rounded-lg" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 rounded-[1.6rem] bg-stone-100/80 border border-stone-200/80" />
            ))}
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
