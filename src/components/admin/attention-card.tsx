import * as React from "react"
import Link from "next/link"
import { formatNumber } from "@/lib/formatters"

export interface AttentionCardProps {
  title: string
  value: number
  subtitle: string
  href: string
  tone?: "neutral" | "warning" | "danger"
  className?: string
}

export function AttentionCard({
  title,
  value,
  subtitle,
  href,
  tone = "neutral",
  className = "",
}: AttentionCardProps) {
  const toneClass =
    tone === "danger"
      ? "border-red-200 bg-[linear-gradient(180deg,_#fff1f2_0%,_#ffe4e6_100%)] text-red-950"
      : tone === "warning"
      ? "border-amber-200 bg-[linear-gradient(180deg,_#fffbeb_0%,_#fef3c7_100%)] text-amber-950"
      : "border-stone-200 bg-[linear-gradient(180deg,_#ffffff_0%,_#fafaf9_100%)] text-stone-950"

  const titleColor =
    tone === "danger"
      ? "text-red-700"
      : tone === "warning"
      ? "text-amber-800"
      : "text-stone-500"

  const subtitleColor =
    tone === "danger"
      ? "text-red-900/80"
      : tone === "warning"
      ? "text-amber-900/80"
      : "text-stone-700"

  return (
    <Link
      href={href}
      className={`block rounded-[22px] border p-4 shadow-[0_10px_26px_rgba(28,25,23,0.05)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(28,25,23,0.08)] ${toneClass} ${className}`}
    >
      <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${titleColor}`}>
        {title}
      </p>
      <p className="mt-2 text-3xl font-bold tracking-tight">
        {formatNumber(value)}
      </p>
      <p className={`mt-2 text-sm leading-6 ${subtitleColor}`}>
        {subtitle}
      </p>
    </Link>
  )
}
