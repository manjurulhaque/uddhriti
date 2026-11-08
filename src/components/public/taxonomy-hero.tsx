import * as React from "react"

export interface TaxonomyHeroStat {
  label: string
  value: React.ReactNode
  isPrimary?: boolean
}

export interface TaxonomyHeroProps {
  title: string
  kicker?: string
  badgeLabel?: string
  badgeClass?: string
  icon?: React.ReactNode
  gradient?: string
  border?: string
  description?: string | null
  stats?: TaxonomyHeroStat[]
  children?: React.ReactNode
  className?: string
}

export function TaxonomyHero({
  title,
  kicker,
  badgeLabel,
  badgeClass = "bg-stone-100 text-stone-700 border-stone-200",
  icon,
  gradient = "from-amber-500/10 via-[var(--accent-rust)]/5 to-transparent",
  border = "border-stone-200/90",
  description,
  stats,
  children,
  className = "",
}: TaxonomyHeroProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border ${border} bg-white p-6 sm:p-8 lg:p-10 shadow-xs ${className}`}
    >
      {/* Ambient Archetype / Motif Gradient */}
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${gradient} opacity-80`}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col md:flex-row md:items-start gap-6 md:gap-8">
        {/* Archetype / Motif Icon Box */}
        {icon && (
          <div className="flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-2xl bg-white border border-stone-200/90 shadow-sm text-4xl sm:text-5xl">
            <span role="img" aria-label={title}>
              {icon}
            </span>
          </div>
        )}

        <div className="space-y-4 flex-1">
          <div className="space-y-2">
            {(kicker || badgeLabel) && (
              <div className="flex flex-wrap items-center gap-2.5">
                {kicker && (
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-rust)]">
                    {kicker}
                  </span>
                )}
                {badgeLabel && (
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${badgeClass}`}>
                    {badgeLabel}
                  </span>
                )}
              </div>
            )}

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--ink-900)]">
              {title}
            </h1>
          </div>

          {description && (
            <p className="text-sm sm:text-base text-stone-700 leading-relaxed font-serif max-w-3xl">
              {description}
            </p>
          )}

          {/* Stat Ribbon */}
          {stats && stats.length > 0 && (
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {stats.map((stat, idx) => (
                <span
                  key={idx}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                    stat.isPrimary
                      ? "bg-stone-100 text-stone-800"
                      : "bg-white/90 border border-stone-200/80 text-stone-700"
                  }`}
                >
                  <span className={stat.isPrimary ? "text-stone-500" : "text-stone-400"}>
                    {stat.label}:
                  </span>
                  <span className={stat.isPrimary ? "font-bold" : ""}>{stat.value}</span>
                </span>
              ))}
            </div>
          )}

          {children}
        </div>
      </div>
    </div>
  )
}

