import * as React from "react"
import Link from "next/link"
import { Button } from "../ui/button"

export interface PageHeaderActionItem {
  label: string
  href: string
  variant?: "primary" | "secondary" | "rust" | "outline" | "danger"
  icon?: React.ReactNode
}

export interface PageHeaderProps {
  title: string | React.ReactNode
  description?: string | React.ReactNode
  badge?: React.ReactNode
  backHref?: string
  backLabel?: string
  actions?: React.ReactNode
  primaryAction?: PageHeaderActionItem
  secondaryAction?: PageHeaderActionItem
  children?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  badge,
  backHref,
  backLabel = "Back",
  actions,
  primaryAction,
  secondaryAction,
  children,
  className = "",
}: PageHeaderProps) {
  return (
    <div className={`space-y-4 font-sans ${className}`}>
      {backHref && (
        <div>
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-900 transition-colors"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>{backLabel}</span>
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-stone-950 sm:text-3xl">
              {title}
            </h1>
            {badge && <div className="inline-flex items-center">{badge}</div>}
          </div>

          {description && (
            <p className="text-sm text-stone-500 max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {actions}

          {secondaryAction && (
            <Button
              href={secondaryAction.href}
              variant={secondaryAction.variant || "secondary"}
              size="sm"
              leftIcon={secondaryAction.icon}
            >
              {secondaryAction.label}
            </Button>
          )}

          {primaryAction && (
            <Button
              href={primaryAction.href}
              variant={primaryAction.variant || "primary"}
              size="sm"
              leftIcon={primaryAction.icon}
            >
              {primaryAction.label}
            </Button>
          )}
        </div>
      </div>

      {children && <div className="pt-1">{children}</div>}
    </div>
  )
}
