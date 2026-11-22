import * as React from "react"
import Link from "next/link"

export interface FilterTabItem<T extends string = string> {
  value: T
  label: string
  href?: string
  count?: number | string
  badge?: string | number
  icon?: React.ReactNode
}

export interface FilterTabsProps<T extends string = string> {
  items: FilterTabItem<T>[]
  activeValue: T
  onSelect?: (value: T) => void
  label?: string
  variant?: "pills" | "segmented" | "clean"
  size?: "sm" | "md"
  className?: string
}

export function FilterTabs<T extends string = string>({
  items,
  activeValue,
  onSelect,
  label,
  variant = "pills",
  size = "sm",
  className = "",
}: FilterTabsProps<T>) {
  const isPills = variant === "pills"
  const isSegmented = variant === "segmented"

  const sizeClasses = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-3.5 py-1.5 text-sm",
  }[size]

  const containerClasses = isSegmented
    ? "inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-stone-100 border border-stone-200/80"
    : "flex flex-wrap items-center gap-1.5"

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {label && (
        <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider shrink-0 mr-1 select-none">
          {label}:
        </span>
      )}

      <div className={containerClasses} role="tablist">
        {items.map((item) => {
          const isActive = item.value === activeValue

          const activeClasses = isActive
            ? "bg-neutral-900 text-white font-medium shadow-xs"
            : isSegmented
            ? "text-stone-600 hover:text-stone-900 hover:bg-white/60 font-medium"
            : isPills
            ? "bg-white text-stone-600 border border-stone-200 hover:border-stone-300 hover:text-stone-900 hover:bg-stone-50 font-medium"
            : "text-stone-600 hover:text-stone-950 font-medium hover:bg-stone-100/80 rounded-lg"

          const baseClass = `inline-flex items-center gap-1.5 rounded-lg transition-all duration-150 select-none ${sizeClasses} ${activeClasses}`

          const content = (
            <>
              {item.icon && (
                <span
                  className={`shrink-0 ${
                    isActive ? "text-white" : "text-stone-400"
                  }`}
                >
                  {item.icon}
                </span>
              )}
              <span>{item.label}</span>
              {item.count !== undefined && (
                <span
                  className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-semibold leading-tight ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-stone-100 text-stone-600"
                  }`}
                >
                  {item.count}
                </span>
              )}
              {item.badge !== undefined && (
                <span
                  className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-semibold leading-tight ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-stone-100 text-stone-600"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </>
          )

          if (item.href) {
            return (
              <Link
                key={item.value}
                href={item.href}
                className={baseClass}
                role="tab"
                aria-selected={isActive}
                aria-current={isActive ? "page" : undefined}
              >
                {content}
              </Link>
            )
          }

          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onSelect?.(item.value)}
              className={baseClass}
              role="tab"
              aria-selected={isActive}
            >
              {content}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Convenience wrapper for sort-specific filter tabs
 */
export function SortTabs<T extends string = string>(
  props: Omit<FilterTabsProps<T>, "label"> & { label?: string }
) {
  return <FilterTabs<T> label={props.label ?? "Sort"} {...props} />
}
