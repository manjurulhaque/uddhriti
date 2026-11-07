export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--page-cream)] text-[var(--ink-900)]">
      {/* Header Skeleton */}
      <div className="sticky top-0 z-40 w-full border-b border-stone-900/8 bg-[var(--page-cream)]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-stone-300 animate-pulse" />
            <div className="h-5 w-24 rounded bg-stone-200 animate-pulse" />
          </div>
          <div className="hidden md:flex items-center gap-3">
            <div className="h-6 w-16 rounded-full bg-stone-200/70 animate-pulse" />
            <div className="h-6 w-16 rounded-full bg-stone-200/70 animate-pulse" />
            <div className="h-6 w-16 rounded-full bg-stone-200/70 animate-pulse" />
          </div>
          <div className="h-8 w-28 rounded-full bg-stone-200 animate-pulse" />
        </div>
      </div>

      {/* Main Skeleton */}
      <main className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10 space-y-6 sm:space-y-8">
        {/* Hero Section Skeleton */}
        <div className="overflow-hidden rounded-[2rem] border border-[var(--ink-900)]/10 bg-[#1e293b] p-6 sm:p-8 lg:p-12 shadow-[0_24px_80px_rgba(33,37,41,0.18)]">
          <div className="grid gap-8 lg:grid-cols-[1.35fr_0.85fr]">
            <div className="space-y-6">
              <div className="h-6 w-44 rounded-full bg-white/10 animate-pulse" />
              <div className="space-y-3">
                <div className="h-10 sm:h-14 w-full rounded-2xl bg-white/10 animate-pulse" />
                <div className="h-10 sm:h-14 w-4/5 rounded-2xl bg-white/10 animate-pulse" />
              </div>
              <div className="h-4 w-3/4 rounded bg-white/10 animate-pulse" />
              <div className="h-12 w-full rounded-2xl bg-white/10 animate-pulse" />
            </div>

            <div className="space-y-4">
              <div className="h-52 w-full rounded-[1.6rem] bg-white/10 animate-pulse" />
              <div className="h-28 w-full rounded-[1.4rem] bg-white/10 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Reflect by Feeling Skeleton */}
        <div className="rounded-[2rem] border border-[var(--ink-900)]/10 bg-white p-6 sm:p-8 lg:p-10 shadow-[0_16px_50px_rgba(33,37,41,0.06)] space-y-6">
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-stone-200 animate-pulse" />
            <div className="h-7 w-64 rounded bg-stone-200 animate-pulse" />
          </div>
          <div className="flex gap-2.5 overflow-hidden">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-14 w-28 shrink-0 rounded-2xl bg-stone-100 animate-pulse" />
            ))}
          </div>
          <div className="h-32 w-full rounded-2xl bg-stone-100/80 animate-pulse" />
        </div>
      </main>
    </div>
  )
}
