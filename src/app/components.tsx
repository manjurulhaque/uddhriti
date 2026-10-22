export function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value)
}

export function StatTile({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "light" | "warm"
}) {
  const styles =
    tone === "light"
      ? "border-white/12 bg-white/8 text-white"
      : "border-[var(--ink-900)]/10 bg-white/70 text-[var(--ink-900)]"

  const labelStyles = tone === "light" ? "text-white/62" : "text-[var(--ink-700)]/72"

  return (
    <div className={`rounded-[1.3rem] border p-4 backdrop-blur-sm ${styles}`}>
      <p className={`text-[11px] uppercase tracking-[0.18em] ${labelStyles}`}>{label}</p>
      <p className="mt-2 text-3xl font-semibold">{formatNumber(value)}</p>
    </div>
  )
}

export function InsightCard({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <article className="rounded-[1.4rem] border border-[var(--ink-900)]/8 bg-[var(--page-cream)] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-rust)]">
        {eyebrow}
      </p>
      <h3 className="mt-3 text-lg font-semibold text-[var(--ink-900)]">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-[var(--ink-700)]/78">{description}</p>
    </article>
  )
}

export function Panel({
  title,
  subtitle,
  children,
  tone = "paper",
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  tone?: "paper" | "sand" | "mist" | "ink"
}) {
  const toneClasses =
    tone === "ink"
      ? "border-[var(--ink-900)]/10 bg-[linear-gradient(180deg,#1f2937,#27364a)] text-white shadow-[0_20px_60px_rgba(33,37,41,0.18)]"
      : tone === "sand"
      ? "border-[var(--ink-900)]/8 bg-[linear-gradient(180deg,#fffdf8,#f5ebd6)] text-[var(--ink-900)]"
      : tone === "mist"
      ? "border-[var(--ink-900)]/8 bg-[linear-gradient(180deg,#ffffff,#edf1f4)] text-[var(--ink-900)]"
      : "border-[var(--ink-900)]/8 bg-white text-[var(--ink-900)]"

  const subtitleClass = tone === "ink" ? "text-white/62" : "text-[var(--ink-700)]/72"

  return (
    <section className={`rounded-[1.75rem] border p-6 shadow-[0_16px_42px_rgba(33,37,41,0.07)] ${toneClasses}`}>
      <h3 className="text-xl font-semibold">{title}</h3>
      {subtitle ? <p className={`mt-2 text-sm leading-7 ${subtitleClass}`}>{subtitle}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  )
}

export function Empty({
  message,
  variant = "light",
}: {
  message: string
  variant?: "light" | "dark"
}) {
  const classes =
    variant === "dark"
      ? "border-white/10 bg-white/6 text-white/72"
      : "border-[var(--ink-900)]/10 bg-white text-[var(--ink-700)]/78"

  return <div className={`rounded-[1.4rem] border border-dashed p-6 text-sm ${classes}`}>{message}</div>
}

export function QuoteMeta({
  authorName,
  category,
  sourceTitle,
  year,
  tags,
  className = "",
  variant = "light",
}: {
  authorName?: string | null
  category?: string | null
  sourceTitle?: string | null
  year?: string | null
  tags: string[]
  className?: string
  variant?: "light" | "dark"
}) {
  const meta = [category || null, sourceTitle || null, year || null].filter(Boolean)
  const nameClass = variant === "dark" ? "text-white/88" : "text-[var(--ink-800)]"
  const metaClass = variant === "dark" ? "text-white/58" : "text-[var(--ink-700)]/72"
  const tagClass =
    variant === "dark"
      ? "bg-white/10 text-white/76"
      : "bg-[var(--page-cream)] text-[var(--ink-700)]"

  return (
    <div className={className}>
      <p className={`text-sm font-medium ${nameClass}`}>
        {authorName ? `- ${authorName}` : "- Unknown author"}
      </p>
      {meta.length > 0 ? <p className={`mt-1 text-xs ${metaClass}`}>{meta.join(" / ")}</p> : null}
      {tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${tagClass}`}
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
