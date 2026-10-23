import * as React from "react"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string | string[]
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  onClear?: () => void
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      onClear,
      id,
      value,
      required,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId()
    const inputId = id || generatedId
    const isClearable = Boolean(onClear && value && String(value).length > 0)
    const errorMessage = Array.isArray(error) ? error[0] : error

    return (
      <div className="w-full space-y-1.5 font-sans">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-700)]"
          >
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="pointer-events-none absolute left-3.5 flex items-center text-[var(--ink-700)]/60">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            value={value}
            disabled={disabled}
            required={required}
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[var(--ink-900)] placeholder:text-[var(--ink-700)]/45 transition duration-200 ease-out focus:border-[var(--accent-rust)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-rust)]/20 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:opacity-60 ${
              leftIcon ? "pl-10" : ""
            } ${rightIcon || isClearable ? "pr-10" : ""} ${
              errorMessage
                ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                : "border-[var(--ink-900)]/15 hover:border-[var(--ink-900)]/30"
            } ${className}`}
            {...props}
          />

          {isClearable && !rightIcon && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-3 flex h-5 w-5 items-center justify-center rounded-full text-[var(--ink-700)]/50 hover:bg-black/5 hover:text-[var(--ink-900)]"
              aria-label="Clear input"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {rightIcon && (
            <div className="pointer-events-none absolute right-3.5 flex items-center text-[var(--ink-700)]/60">
              {rightIcon}
            </div>
          )}
        </div>

        {errorMessage ? (
          <p className="text-xs text-red-600 font-medium">{errorMessage}</p>
        ) : hint ? (
          <p className="text-xs text-[var(--ink-700)]/70">{hint}</p>
        ) : null}
      </div>
    )
  }
)

Input.displayName = "Input"
