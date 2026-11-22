import { Skeleton } from "@/components/ui/skeleton"

export default function FaqsLoading() {
  return (
    <div className="p-8 space-y-6">
      {/* Page Header Skeleton */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* FAQ Rows Skeleton */}
      <div className="space-y-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-5 w-2/3 rounded-md" />
                <Skeleton className="h-3.5 w-36 rounded" />
              </div>
              <Skeleton className="h-6 w-28 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

