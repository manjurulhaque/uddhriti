import * as React from "react"

export type BadgeVariant =
  | "neutral"
  | "warm"
  | "rust"
  | "gold"
  | "success"
  | "warning"
  | "danger"
  | "dark"
  | "outline"

export type BadgeSize = "xs" | "sm" | "md"

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
  icon?: React.ReactNode
}

const variantStyles: Record<BadgeVariant, string> = {
  neutral:
    "bg-[var(--page-cream)] text-[var(--ink-700)] border border-[var(--ink-900)]/10",
  warm:
    "bg-[var(--accent-sand)]/25 text-[#92400e] border border-[var(--accent-sand)]/40",
  rust:
    "bg-[var(--accent-rust)]/12 text-[var(--accent-rust)] border border-[var(--accent-rust)]/25",
  gold:
    "bg-[var(--accent-gold)]/20 text-[#854d0e] border border-[var(--accent-gold)]/40",
  success:
    "bg-emerald-50 text-emerald-800 border border-emerald-200/80",
  warning:
    "bg-amber-50 text-amber-900 border border-amber-200/80",
  danger:
    "bg-red-50 text-red-800 border border-red-200/80",
  dark:
    "bg-[var(--ink-900)] text-white/90 border border-white/10",
  outline:
    "bg-transparent text-[var(--ink-700)] border border-[var(--ink-900)]/15",
}

const dotColors: Record<BadgeVariant, string> = {
  neutral: "bg-[var(--ink-700)]",
  warm: "bg-[#b45309]",
  rust: "bg-[var(--accent-rust)]",
  gold: "bg-[var(--accent-gold)]",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  dark: "bg-white",
  outline: "bg-[var(--ink-700)]",
}

const sizeStyles: Record<BadgeSize, string> = {
  xs: "px-2 py-0.5 text-[10px] tracking-[0.14em]",
  sm: "px-2.5 py-1 text-[11px] tracking-[0.12em]",
  md: "px-3.5 py-1.5 text-xs tracking-[0.10em]",
}

export function Badge({
  variant = "neutral",
  size = "sm",
  dot = false,
  icon,
  children,
  className = "",
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium uppercase transition-colors ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotColors[variant]}`}
          aria-hidden="true"
        />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  )
}
