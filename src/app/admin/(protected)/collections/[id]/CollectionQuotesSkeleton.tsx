import { Skeleton } from "@/components/ui/skeleton"

export function CollectionQuotesSkeleton() {
  return (
    <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-44 rounded-md" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3.5 w-72 rounded" />
        </div>
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>

      {/* Table Skeleton */}
      <div className="overflow-hidden rounded-xl border border-stone-200">
        <div className="bg-stone-50/75 border-b border-stone-200 p-3 flex items-center gap-4">
          <Skeleton className="h-4 w-12 rounded" />
          <Skeleton className="h-4 w-48 rounded" />
          <Skeleton className="h-4 w-24 rounded ml-auto" />
          <Skeleton className="h-4 w-16 rounded" />
        </div>
        <div className="divide-y divide-stone-100 p-3 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-2">
              <Skeleton className="h-5 w-8 rounded font-mono" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-4/5 rounded" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-20 rounded" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
              </div>
              <Skeleton className="h-5 w-20 rounded" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-12 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
