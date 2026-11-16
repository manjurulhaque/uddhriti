import * as React from "react"
import { PublicLayout } from "@/components/public"
import { Skeleton } from "@/components/ui/skeleton"

export default function QuoteDetailLoading() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 sm:py-8 lg:px-12 space-y-8 font-sans" aria-busy="true" aria-label="Loading quotation...">
        {/* Breadcrumb Navigation Skeleton */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-12 rounded" />
          <span className="text-stone-300">/</span>
          <Skeleton className="h-4 w-16 rounded" />
          <span className="text-stone-300">/</span>
          <Skeleton className="h-4 w-28 rounded" />
        </div>

        {/* Master Quotation Hero Card Skeleton */}
        <article className="rounded-3xl border border-stone-200/90 bg-white p-5 sm:p-7 lg:p-8 shadow-sm space-y-6">
          {/* Top Badges & Metrics */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-20 rounded" />
              <Skeleton className="h-5 w-24 rounded" />
            </div>
          </div>

          {/* Main Quotation Text Skeleton */}
          <div className="space-y-3.5 py-4 sm:py-6">
            <Skeleton className="h-8 sm:h-10 w-full rounded-xl" />
            <Skeleton className="h-8 sm:h-10 w-11/12 rounded-xl" />
            <Skeleton className="h-8 sm:h-10 w-3/4 rounded-xl" />
          </div>

          {/* Attribution & Author Identity */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-stone-100 pt-5">
            <div className="flex items-center gap-3.5">
              <Skeleton className="h-12 w-12 rounded-2xl shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-6 w-44 rounded-lg" />
                <Skeleton className="h-4 w-32 rounded" />
              </div>
            </div>

            {/* Interaction Buttons Skeleton */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-20 rounded-full" />
              <Skeleton className="h-9 w-20 rounded-full" />
              <Skeleton className="h-9 w-9 rounded-full" />
            </div>
          </div>
        </article>

        {/* Curatorial Notes Skeleton */}
        <div className="rounded-3xl border border-stone-200/80 bg-white/70 p-6 space-y-4">
          <Skeleton className="h-5 w-48 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-5/6 rounded" />
          </div>
        </div>

        {/* Author Briefing Skeleton */}
        <div className="rounded-3xl border border-stone-200/90 bg-white p-6 space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-2xl shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-48 rounded-lg" />
              <Skeleton className="h-4 w-36 rounded" />
            </div>
          </div>
          <div className="space-y-2 pt-2">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-4/5 rounded" />
          </div>
        </div>

        {/* Related Quotes Grid Skeleton */}
        <div className="space-y-6 pt-6 border-t border-stone-200/80">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-3 w-32 rounded" />
              <Skeleton className="h-6 w-56 rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-56 rounded-[1.6rem] bg-stone-100/80 border border-stone-200/80" />
            ))}
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
