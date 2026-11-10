import * as React from "react"

export interface JsonLdProps {
  data: Record<string, unknown> | Array<Record<string, unknown>>
}

/**
 * Renders a safe, properly-escaped JSON-LD structured data script element.
 * Escapes '<' to prevent script-breakout and XSS injection in HTML script tags.
 */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  )
}

