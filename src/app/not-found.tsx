import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--page-cream)] text-[var(--ink-900)]">
      <main className="mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-lg animate-rise rounded-[1.75rem] border border-[var(--ink-900)]/10 bg-white px-8 py-10 text-center shadow-[0_18px_50px_rgba(33,37,41,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-rust)]">
            404
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-[var(--ink-900)]">
            Page not found
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--ink-700)]/78">
            The page you&apos;re looking for doesn&apos;t exist or may have been
            moved. The quotations archive is still here — head home to explore.
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex rounded-full bg-[var(--ink-900)] px-6 py-2.5 text-sm font-medium text-[var(--page-cream)] transition hover:opacity-90"
            >
              Go home
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
