import { Skeleton } from "@/components/ui/skeleton"

export default function EditCollectionLoading() {
  return (
    <div className="p-8 max-w-4xl space-y-8">
      {/* Page Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64 rounded-lg" />
        <Skeleton className="h-4 w-96 rounded-md" />
      </div>

      {/* Collection Form Card Skeleton */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-2xs space-y-6">
        <div className="border-b border-stone-100 pb-4 space-y-1.5">
          <Skeleton className="h-5 w-44 rounded-md" />
          <Skeleton className="h-3.5 w-72 rounded" />
        </div>
        <div className="space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        </div>
      </div>

      {/* Quotes in Collection Skeleton */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-48 rounded-md" />
            <Skeleton className="h-3.5 w-80 rounded" />
          </div>
          <Skeleton className="h-8 w-28 rounded-xl" />
        </div>
        <div className="space-y-2.5 pt-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
