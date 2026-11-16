import * as React from "react"
import { PublicLayout } from "@/components/public"
import { Skeleton } from "@/components/ui/skeleton"

export default function SavedQuotesLoading() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12 space-y-8 font-sans" aria-busy="true" aria-label="Loading saved quotes...">
        <div className="border-b border-stone-900/10 pb-6 sm:pb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-10 sm:h-12 w-72 rounded-xl" />
            <Skeleton className="h-5 w-full max-w-md rounded" />
          </div>
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>

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
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-7 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  )
}
