import * as React from "react"
import { formatNumber } from "@/lib/formatters"

export interface StatTileProps {
  label: string
  value: number
  tone?: "light" | "warm"
  className?: string
}

export function StatTile({
  label,
  value,
  tone = "light",
  className = "",
}: StatTileProps) {
  const styles =
    tone === "light"
      ? "border-white/12 bg-white/8 text-white"
      : "border-[var(--ink-900)]/10 bg-white/70 text-[var(--ink-900)]"

  const labelStyles =
    tone === "light" ? "text-white/65" : "text-[var(--ink-700)]/75"

  return (
    <div
      className={`rounded-[1.3rem] border p-4 backdrop-blur-sm transition-transform duration-200 hover:-translate-y-0.5 ${styles} ${className}`}
    >
      <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${labelStyles}`}>
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tracking-tight">
        {formatNumber(value)}
      </p>
    </div>
  )
}
