import * as React from "react"
import Link from "next/link"

export interface DashboardCardProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function DashboardCard({
  title,
  subtitle,
  action,
  children,
  className = "",
}: DashboardCardProps) {
  return (
    <section
      className={`rounded-[24px] border border-stone-200 bg-white p-6 shadow-[0_14px_36px_rgba(28,25,23,0.06)] ${className}`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-stone-950">{title}</h2>
          {subtitle && <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </section>
  )
}

export function DashboardLink({
  href,
  label,
  className = "",
}: {
  href: string
  label: string
  className?: string
}) {
  return (
    <Link
      href={href}
      className={`block rounded-2xl border border-stone-200 px-3.5 py-2 text-stone-700 font-medium transition hover:border-stone-300 hover:bg-stone-50 hover:text-stone-900 ${className}`}
    >
      {label}
    </Link>
  )
}

export function DashboardPostAction({
  action,
  label,
  className = "",
}: {
  action: string
  label: string
  className?: string
}) {
  return (
    <form action={action} method="post" className={className}>
      <button
        type="submit"
        className="w-full rounded-2xl border border-stone-200 px-3.5 py-2 text-left text-stone-700 font-medium transition hover:border-stone-300 hover:bg-stone-50 hover:text-stone-900 cursor-pointer"
      >
        {label}
      </button>
    </form>
  )
}

export function ListOrEmpty({
  items,
  empty,
}: {
  items: { key: string; left: React.ReactNode; right: React.ReactNode }[]
  empty: string
}) {
  if (items.length === 0) {
    return <EmptyRow message={empty} />
  }

  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div
          key={item.key}
          className="flex items-center justify-between gap-4 rounded-2xl border border-stone-100 bg-stone-50/70 px-3.5 py-2.5 text-sm transition hover:bg-stone-100/80"
        >
          <span className="text-stone-800 font-medium truncate">{item.left}</span>
          <span className="whitespace-nowrap text-xs text-stone-500 shrink-0 font-medium">
            {item.right}
          </span>
        </div>
      ))}
    </div>
  )
}

export function EmptyRow({ message }: { message: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-stone-300 p-3 text-sm text-stone-500 text-center">
      {message}
    </p>
  )
}


