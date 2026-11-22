"use client"

import { Button } from "@/components/ui"

type ErrorPageProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AdminError({ error, reset }: ErrorPageProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 p-4 font-sans">
      <div className="w-full max-w-md rounded-2xl border border-stone-200/90 bg-white p-8 shadow-2xs space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-red-600">
          Admin Error
        </p>
        <h1 className="text-xl font-bold text-stone-900">
          Something went wrong
        </h1>
        <p className="text-sm text-stone-600">
          An error occurred in the admin panel. You can try again or navigate
          back to the dashboard.
        </p>

        {process.env.NODE_ENV === "development" && error.message ? (
          <pre className="overflow-x-auto rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 font-mono">
            {error.message}
          </pre>
        ) : null}

        <div className="flex items-center gap-3 pt-2">
          <Button
            type="button"
            variant="primary"
            onClick={reset}
          >
            Try again
          </Button>
          <Button
            href="/admin/dashboard"
            variant="outline"
          >
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}

