"use client"

import Link from "next/link"

type ErrorPageProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorPageProps) {
  return (
    <div className="min-h-screen bg-[var(--page-cream)] text-[var(--ink-900)]">
      <main className="mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-lg animate-rise rounded-[1.75rem] border border-[var(--ink-900)]/10 bg-white px-8 py-10 shadow-[0_18px_50px_rgba(33,37,41,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-rust)]">
            Something went wrong
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-[var(--ink-900)]">
            This page could not be loaded right now.
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--ink-700)]/78">
            The quotations archive is still online, but this view hit an unexpected error. You can
            try again, or return home while the issue clears.
          </p>

          {process.env.NODE_ENV === "development" && error.message ? (
            <p className="mt-4 rounded-[1.2rem] border border-amber-300/60 bg-amber-50 px-4 py-3 text-left text-xs leading-6 text-amber-900">
              {error.message}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-full bg-[var(--ink-900)] px-5 py-2.5 text-sm font-medium text-[var(--page-cream)] transition hover:opacity-90"
            >
              Try again
            </button>
            <Link
              href="/"
              className="rounded-full border border-[var(--ink-900)]/15 bg-[var(--page-cream)] px-5 py-2.5 text-sm font-medium text-[var(--ink-800)] transition hover:border-[var(--ink-900)]/25"
            >
              Go home
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
