import * as React from "react"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string | string[]
  hint?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      hint,
      id,
      required,
      className = "",
      disabled,
      rows = 3,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId()
    const textareaId = id || generatedId
    const errorMessage = Array.isArray(error) ? error[0] : error

    return (
      <div className="w-full space-y-1.5 font-sans">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-700)]"
          >
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          disabled={disabled}
          className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[var(--ink-900)] placeholder:text-[var(--ink-700)]/45 transition duration-200 ease-out focus:border-[var(--accent-rust)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-rust)]/20 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:opacity-60 ${
            errorMessage
              ? "border-red-400 focus:border-red-500 focus:ring-red-200"
              : "border-[var(--ink-900)]/15 hover:border-[var(--ink-900)]/30"
          } ${className}`}
          {...props}
        />

        {errorMessage ? (
          <p className="text-xs text-red-600 font-medium">{errorMessage}</p>
        ) : hint ? (
          <p className="text-xs text-[var(--ink-700)]/70">{hint}</p>
        ) : null}
      </div>
    )
  }
)

Textarea.displayName = "Textarea"
