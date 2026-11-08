import * as React from "react"
import Link from "next/link"

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
}

export interface BreadcrumbProps extends React.ComponentPropsWithoutRef<"nav"> {
  items: BreadcrumbItem[]
  separator?: React.ReactNode
  className?: string
  includeJsonLd?: boolean
}

export function Breadcrumb({
  items,
  separator = <span className="text-stone-300" aria-hidden="true">/</span>,
  className = "",
  includeJsonLd = false,
  ...props
}: BreadcrumbProps) {
  if (!items || items.length === 0) return null

  const jsonLd = includeJsonLd
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.label,
          ...(item.href ? { item: item.href } : {}),
        })),
      }
    : null

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      )}
      <nav
        aria-label="Breadcrumb"
        className={`text-xs text-stone-500 flex flex-wrap items-center gap-2 ${className}`}
        {...props}
      >
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1

          return (
            <React.Fragment key={`${item.label}-${idx}`}>
              {idx > 0 && separator}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-1.5 hover:text-stone-900 transition-colors"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span
                  className={`inline-flex items-center gap-1.5 truncate max-w-[280px] sm:max-w-md ${
                    isLast ? "font-semibold text-stone-900" : ""
                  }`}
                  aria-current={isLast ? "page" : undefined}
                  title={item.label}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </span>
              )}
            </React.Fragment>
          )
        })}
      </nav>
    </>
  )
}

