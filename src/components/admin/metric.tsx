import * as React from "react"
import { formatNumber } from "@/lib/formatters"

export interface MetricProps {
  label: string
  value: string | number
  className?: string
}

export function Metric({ label, value, className = "" }: MetricProps) {
  return (
    <div
      className={`rounded-2xl border border-stone-200 bg-stone-50 p-3 shadow-xs transition duration-150 hover:bg-stone-100/70 ${className}`}
    >
      <div className="text-xl font-bold tracking-tight text-stone-950">
        {typeof value === "number" ? formatNumber(value) : value}
      </div>
      <div className="text-[11px] uppercase tracking-[0.18em] text-stone-500 font-medium mt-0.5">
        {label}
      </div>
    </div>
  )
}
