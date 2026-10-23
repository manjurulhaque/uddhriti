import * as React from "react"
import Link from "next/link"
import { formatNumber } from "@/lib/formatters"

export interface StatCardProps {
  title: string
  value: number
  subtitle?: string
  href?: string
  className?: string
}

export function StatCard({
  title,
  value,
  subtitle,
  href,
  className = "",
}: StatCardProps) {
  const content = (
    <div
      className={`rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_4px_12px_rgba(28,25,23,0.03)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(28,25,23,0.07)] hover:border-stone-300 ${className}`}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
        {title}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-stone-950">
        {formatNumber(value)}
      </div>
      {subtitle ? (
        <div className="mt-1.5 text-xs text-stone-500 line-clamp-1">{subtitle}</div>
      ) : null}
    </div>
  )

  if (href && href !== "#") {
    return (
      <Link href={href} className="block group">
        {content}
      </Link>
    )
  }

  return content
}
