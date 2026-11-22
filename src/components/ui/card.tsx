import * as React from "react"

export type CardTone = "paper" | "cream" | "sand" | "mist" | "ink" | "stone"

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: CardTone
  hoverEffect?: boolean
}

const toneStyles: Record<CardTone, string> = {
  paper:
    "border-[var(--ink-900)]/8 bg-white text-[var(--ink-900)] shadow-[0_16px_42px_rgba(33,37,41,0.06)]",
  cream:
    "border-[var(--ink-900)]/8 bg-[var(--page-cream)] text-[var(--ink-900)] shadow-sm",
  sand:
    "border-[var(--ink-900)]/8 bg-[linear-gradient(180deg,#fffdf8,#f5ebd6)] text-[var(--ink-900)] shadow-[0_16px_42px_rgba(33,37,41,0.06)]",
  mist:
    "border-[var(--ink-900)]/8 bg-[linear-gradient(180deg,#ffffff,#edf1f4)] text-[var(--ink-900)] shadow-[0_16px_42px_rgba(33,37,41,0.06)]",
  ink:
    "border-white/10 bg-[linear-gradient(180deg,#1f2937,#27364a)] text-white shadow-[0_20px_60px_rgba(33,37,41,0.18)]",
  stone:
    "border-stone-200 bg-white text-stone-900 shadow-[0_14px_36px_rgba(28,25,23,0.06)]",
}

export function Card({
  tone = "paper",
  hoverEffect = false,
  className = "",
  children,
  ...props
}: CardProps) {
  const hoverClass = hoverEffect
    ? "transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(33,37,41,0.12)]"
    : ""

  return (
    <div
      className={`rounded-[1.75rem] border p-6 ${toneStyles[tone]} ${hoverClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mb-4 flex flex-col space-y-1.5 ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`text-xl font-semibold tracking-tight leading-snug ${className}`}
      {...props}
    >
      {children}
    </h3>
  )
}

export function CardDescription({
  className = "",
  tone = "paper",
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & { tone?: CardTone }) {
  const textColor = tone === "ink" ? "text-white/65" : "text-[var(--ink-700)]/75"
  return (
    <p className={`text-sm leading-6 ${textColor} ${className}`} {...props}>
      {children}
    </p>
  )
}

export function CardContent({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mt-2 ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`mt-5 flex items-center justify-between border-t border-black/5 pt-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Convenience Panel component with title, subtitle, and tone presets,
 * providing direct drop-in compatibility with existing page layouts.
 */
export function Panel({
  title,
  subtitle,
  children,
  tone = "paper",
  className = "",
  action,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  tone?: CardTone
  className?: string
  action?: React.ReactNode
}) {
  return (
    <Card tone={tone} className={className}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>{title}</CardTitle>
          {subtitle && (
            <CardDescription tone={tone} className="mt-1.5">
              {subtitle}
            </CardDescription>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
      <CardContent className="mt-5">{children}</CardContent>
    </Card>
  )
}
