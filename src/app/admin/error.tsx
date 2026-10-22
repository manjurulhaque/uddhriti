"use client"

type ErrorPageProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AdminError({ error, reset }: ErrorPageProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-xl border bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-red-600">
          Admin Error
        </p>
        <h1 className="mt-2 text-xl font-bold text-gray-900">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          An error occurred in the admin panel. You can try again or navigate
          back to the dashboard.
        </p>

        {process.env.NODE_ENV === "development" && error.message ? (
          <pre className="mt-4 overflow-x-auto rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
            {error.message}
          </pre>
        ) : null}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            Try again
          </button>
          <a
            href="/admin/dashboard"
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
