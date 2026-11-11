import * as React from "react"
import { ChevronDownIcon } from "./icons"

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string | string[]
  hint?: string
  options?: SelectOption[]
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      hint,
      options,
      id,
      className = "",
      children,
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId()
    const selectId = id || generatedId
    const errorMessage = Array.isArray(error) ? error[0] : error

    return (
      <div className="w-full space-y-1.5 font-sans">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-700)]"
          >
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            required={required}
            className={`w-full appearance-none rounded-xl border bg-white px-3.5 py-2.5 pr-10 text-sm text-[var(--ink-900)] transition duration-200 ease-out focus:border-[var(--accent-rust)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-rust)]/20 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:opacity-60 cursor-pointer ${
              errorMessage
                ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                : "border-[var(--ink-900)]/15 hover:border-[var(--ink-900)]/30"
            } ${className}`}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-700)]/60">
            <ChevronDownIcon className="h-4 w-4" />
          </div>
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

Select.displayName = "Select"
