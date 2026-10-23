import * as React from "react"
import Link from "next/link"

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "rust"
  | "outline"
  | "ghost"
  | "danger"

export type ButtonSize = "xs" | "sm" | "md" | "lg"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  href?: string
  target?: string
  rel?: string
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--ink-900)] text-white hover:bg-[var(--ink-800)] active:bg-black border border-transparent shadow-[0_2px_8px_rgba(33,37,41,0.12)]",
  secondary:
    "bg-white text-[var(--ink-900)] border border-[var(--ink-900)]/12 hover:bg-[var(--page-cream)] active:bg-stone-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
  rust:
    "bg-[var(--accent-rust)] text-white hover:brightness-105 active:brightness-95 border border-transparent shadow-[0_4px_14px_rgba(199,107,62,0.25)]",
  outline:
    "bg-transparent text-[var(--ink-900)] border border-[var(--ink-900)]/18 hover:bg-[var(--ink-900)]/5 active:bg-[var(--ink-900)]/10",
  ghost:
    "bg-transparent text-[var(--ink-700)] hover:text-[var(--ink-900)] hover:bg-[var(--ink-900)]/6 active:bg-[var(--ink-900)]/10 border border-transparent",
  danger:
    "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 active:bg-red-200 shadow-sm",
}

const sizeStyles: Record<ButtonSize, string> = {
  xs: "px-2.5 py-1 text-xs rounded-full gap-1.5",
  sm: "px-3.5 py-1.5 text-xs font-medium rounded-full gap-2",
  md: "px-5 py-2.5 text-sm font-medium rounded-full gap-2",
  lg: "px-6 py-3 text-base font-semibold rounded-full gap-2.5",
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      href,
      target,
      rel,
      children,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      "inline-flex items-center justify-center font-sans tracking-wide transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-rust)] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer"

    const combinedClasses = `${baseClasses} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`

    const content = (
      <>
        {isLoading ? (
          <svg
            className="animate-spin -ml-0.5 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          leftIcon
        )}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </>
    )

    if (href) {
      return (
        <Link href={href} target={target} rel={rel} className={combinedClasses}>
          {content}
        </Link>
      )
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={combinedClasses}
        {...props}
      >
        {content}
      </button>
    )
  }
)

Button.displayName = "Button"
