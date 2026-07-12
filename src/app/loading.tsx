export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--page-cream)] text-[var(--ink-900)]">
      <main className="mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-md animate-rise rounded-[1.75rem] border border-[var(--ink-900)]/10 bg-white px-8 py-10 text-center shadow-[0_18px_50px_rgba(33,37,41,0.08)]">
          <div
            className="mx-auto h-10 w-10 rounded-full border-2 border-[var(--accent-gold)] border-t-[var(--accent-rust)]"
            role="status"
            aria-label="Loading"
          />
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-rust)]">
            Quotations Archive
          </p>
          <p className="mt-3 text-lg font-semibold text-[var(--ink-900)]">Loading the collection</p>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-700)]/78">
            Gathering quotes, voices, and editorial highlights.
          </p>
        </div>
      </main>
    </div>
  )
}
