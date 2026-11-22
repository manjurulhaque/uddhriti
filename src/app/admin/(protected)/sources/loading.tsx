import { Skeleton } from "@/components/ui/skeleton"

export default function SourcesLoading() {
  return (
    <div className="p-8 space-y-6">
      {/* Page Header Skeleton */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36 rounded-lg" />
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* Filter Toolbar Skeleton */}
      <div className="flex flex-col gap-3 rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-10 w-72 rounded-xl" />
        <Skeleton className="h-10 w-44 rounded-xl" />
      </div>

      {/* Source Entity Rows Skeleton */}
      <div className="space-y-2.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-52 rounded-md" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3.5 w-32 rounded" />
                  <Skeleton className="h-3.5 w-20 rounded" />
                  <Skeleton className="h-3.5 w-24 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-16 rounded-lg" />
                <Skeleton className="h-8 w-16 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

