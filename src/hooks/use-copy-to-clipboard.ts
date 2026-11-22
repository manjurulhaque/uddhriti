"use client"

import * as React from "react"

export interface CopyOptions {
  timeout?: number
}

export function formatQuoteCopyText(quote: {
  content: string
  author?: string | null
  authorName?: string | null
  source?: string | null
  sourceTitle?: string | null
}): string {
  const author = quote.author || quote.authorName || "Unknown"
  const source = quote.source || quote.sourceTitle
  return `“${quote.content}”\n— ${author}${source ? ` (${source})` : ""}\n\nVia Quotzen Quotations`
}

export function useCopyToClipboard({ timeout = 2000 }: CopyOptions = {}) {
  const [copied, setCopied] = React.useState(false)
  const timerRef = React.useRef<NodeJS.Timeout | null>(null)

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const copy = React.useCallback(
    async (text: string): Promise<boolean> => {
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
        return false
      }
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
          setCopied(false)
        }, timeout)
        return true
      } catch {
        return false
      }
    },
    [timeout]
  )

  const copyQuote = React.useCallback(
    async (quote: {
      content: string
      author?: string | null
      authorName?: string | null
      source?: string | null
      sourceTitle?: string | null
    }): Promise<boolean> => {
      return copy(formatQuoteCopyText(quote))
    },
    [copy]
  )

  return { copied, copy, copyQuote }
}

