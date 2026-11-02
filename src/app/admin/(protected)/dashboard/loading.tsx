import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-10 px-6 py-8 md:px-8">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-9 w-48 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-32 rounded-full" />
          <Skeleton className="h-9 w-32 rounded-full" />
        </div>
      </div>

      {/* Primary 8-col Stats Shell */}
      <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-2xs">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2 p-3">
              <Skeleton className="h-4 w-16 rounded" />
              <Skeleton className="h-8 w-20 rounded" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* KPI Cards (4 cols) */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-3">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-8 w-24 rounded" />
            <Skeleton className="h-3 w-36 rounded" />
          </div>
        ))}
      </div>

      {/* Chart Card */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-2xs space-y-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-56 rounded-md" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-44 w-full rounded-xl" />
      </div>

      {/* 3-Column Breakdown Cards */}
      <div className="grid gap-6 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-4">
            <Skeleton className="h-5 w-44 rounded-md" />
            <div className="space-y-3">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      {/* 3-Column Recent Activity Cards */}
      <div className="grid gap-6 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-4">
            <Skeleton className="h-5 w-36 rounded-md" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="space-y-1.5 py-1">
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

