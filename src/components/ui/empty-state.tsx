import * as React from "react"
import { Button } from "./button"

export interface EmptyStateActionConfig {
  label: string
  onClick?: () => void
  href?: string
}

export interface EmptyStateProps {
  title?: string
  message?: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode | EmptyStateActionConfig
  variant?: "light" | "dark" | "stone"
  className?: string
}

export function EmptyState({
  title,
  message,
  description,
  icon,
  action,
  variant = "light",
  className = "",
}: EmptyStateProps) {
  const displayTitle = title || message || "No items found"

  const variantStyles = {
    light:
      "border-[var(--ink-900)]/12 bg-white/70 text-[var(--ink-700)]/80",
    dark:
      "border-white/12 bg-white/5 text-white/75",
    stone:
      "border-stone-300 bg-stone-50/70 text-stone-600",
  }[variant]

  const titleColor =
    variant === "dark" ? "text-white" : "text-[var(--ink-900)]"
  const descColor =
    variant === "dark" ? "text-white/60" : "text-[var(--ink-700)]/70"

  const renderAction = () => {
    if (!action) return null
    if (React.isValidElement(action)) return action
    if (typeof action === "object" && "label" in action) {
      const config = action as EmptyStateActionConfig
      return (
        <Button
          variant="secondary"
          size="xs"
          onClick={config.onClick}
          href={config.href}
        >
          {config.label}
        </Button>
      )
    }
    return action as React.ReactNode
  }

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-[1.4rem] border border-dashed p-8 text-center transition-all ${variantStyles} ${className}`}
    >
      {icon ? (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-black/5 text-[var(--ink-700)]/70">
          {icon}
        </div>
      ) : null}

      <p className={`text-sm font-semibold tracking-wide ${titleColor}`}>
        {displayTitle}
      </p>

      {description ? (
        <p className={`mt-1.5 max-w-sm text-xs leading-5 ${descColor}`}>
          {description}
        </p>
      ) : null}

      {action ? <div className="mt-4">{renderAction()}</div> : null}
    </div>
  )
}

/**
 * Drop-in backwards-compatible Empty component for public pages
 */
export function Empty({
  message,
  variant = "light",
}: {
  message: string
  variant?: "light" | "dark"
}) {
  return <EmptyState message={message} variant={variant} />
}
