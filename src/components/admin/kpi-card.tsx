import * as React from "react"
import Link from "next/link"
import { formatNumber } from "@/lib/formatters"

export interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  href?: string
  className?: string
}

export function KpiCard({
  title,
  value,
  subtitle,
  href,
  className = "",
}: KpiCardProps) {
  const content = (
    <div
      className={`rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_10px_26px_rgba(28,25,23,0.05)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(28,25,23,0.08)] ${className}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
        {title}
      </p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-stone-950">
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
      {subtitle ? (
        <p className="mt-2 text-xs leading-5 text-stone-600 line-clamp-2">{subtitle}</p>
      ) : null}
    </div>
  )

  return href ? (
    <Link href={href} className="block group">
      {content}
    </Link>
  ) : (
    content
  )
}
