import { Skeleton } from "@/components/ui/skeleton"

export default function QuotesLoading() {
  return (
    <div className="p-8 space-y-6">
      {/* Page Header Skeleton */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40 rounded-lg" />
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* Filter Tabs Skeleton */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-lg" />
        ))}
      </div>

      {/* Filter Toolbar Skeleton */}
      <div className="flex flex-col gap-3 rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <Skeleton className="h-10 w-72 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
      </div>

      {/* Quote Rows Skeleton */}
      <div className="space-y-2.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <Skeleton className="mt-1 h-4 w-4 rounded" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-4/5 rounded-md" />
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-28 rounded" />
                    <Skeleton className="h-4 w-36 rounded" />
                    <Skeleton className="h-4 w-24 rounded" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-8 w-14 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Skeleton */}
      <div className="flex items-center justify-between pt-4">
        <Skeleton className="h-4 w-36 rounded" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

