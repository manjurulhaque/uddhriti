import * as React from "react"
import { Button } from "./button"
import { AlertCircleIcon, CloseIcon } from "./icons"

export interface FormFieldProps {
  label?: string
  htmlFor?: string
  required?: boolean
  error?: string | string[]
  hint?: string
  children: React.ReactNode
  className?: string
}

export function FormField({
  label,
  htmlFor,
  required = false,
  error,
  hint,
  children,
  className = "",
}: FormFieldProps) {
  const errorMessage = Array.isArray(error) ? error[0] : error

  return (
    <div className={`w-full space-y-1.5 font-sans ${className}`}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-700)]"
        >
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}

      {children}

      {errorMessage ? (
        <p className="text-xs text-red-600 font-medium">{errorMessage}</p>
      ) : hint ? (
        <p className="text-xs text-[var(--ink-700)]/70">{hint}</p>
      ) : null}
    </div>
  )
}

export interface FormSectionProps {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  badge?: React.ReactNode
}

export function FormSection({
  title,
  description,
  children,
  className = "",
  badge,
}: FormSectionProps) {
  return (
    <section
      className={`rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-4 ${className}`}
    >
      {(title || description || badge) && (
        <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-3 mb-2">
          <div>
            {title && (
              <h3 className="text-sm font-bold tracking-tight text-stone-900 uppercase">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-xs text-stone-500 mt-0.5">{description}</p>
            )}
          </div>
          {badge && <div className="shrink-0">{badge}</div>}
        </div>
      )}

      <div className="space-y-4">{children}</div>
    </section>
  )
}

export interface FormActionsProps {
  submitLabel?: string
  isSubmitting?: boolean
  submittingLabel?: string
  cancelHref?: string
  onCancel?: () => void
  cancelLabel?: string
  onDelete?: () => void
  deleteLabel?: string
  isDeleting?: boolean
  className?: string
  align?: "left" | "right" | "between"
}

export function FormActions({
  submitLabel = "Save Changes",
  isSubmitting = false,
  submittingLabel = "Saving...",
  cancelHref,
  onCancel,
  cancelLabel = "Cancel",
  onDelete,
  deleteLabel = "Delete",
  isDeleting = false,
  className = "",
  align = "between",
}: FormActionsProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-3 pt-4 border-t border-stone-200/80 ${
        align === "between"
          ? "justify-between"
          : align === "right"
          ? "justify-end"
          : "justify-start"
      } ${className}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          disabled={isSubmitting || isDeleting}
        >
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>

        {cancelHref ? (
          <Button
            href={cancelHref}
            variant="ghost"
            disabled={isSubmitting || isDeleting}
          >
            {cancelLabel}
          </Button>
        ) : onCancel ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting || isDeleting}
          >
            {cancelLabel}
          </Button>
        ) : null}
      </div>

      {onDelete && (
        <Button
          type="button"
          variant="danger"
          onClick={onDelete}
          isLoading={isDeleting}
          disabled={isSubmitting || isDeleting}
        >
          {deleteLabel}
        </Button>
      )}
    </div>
  )
}

export interface FormErrorBannerProps {
  error?: string | null
  onDismiss?: () => void
  className?: string
}

export function FormErrorBanner({
  error,
  onDismiss,
  className = "",
}: FormErrorBannerProps) {
  if (!error) return null

  return (
    <div
      className={`rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-start justify-between gap-3 ${className}`}
      role="alert"
    >
      <div className="flex items-center gap-2">
        <AlertCircleIcon className="h-4 w-4 text-red-600 shrink-0" />
        <span className="font-medium">{error}</span>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md p-1 text-red-500 hover:bg-red-100 hover:text-red-800 cursor-pointer"
          aria-label="Dismiss error"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
