export interface QuoteShareParams {
  content: string
  authorName?: string | null
  sourceTitle?: string | null
  year?: string | null
  quoteUrl?: string
}

/**
 * Formats a quote into an elegant WhatsApp message with bolding and citation.
 */
export function formatWhatsAppQuoteText({
  content,
  authorName,
  sourceTitle,
  year,
  quoteUrl,
}: QuoteShareParams): string {
  const author = authorName ? `*${authorName}*` : "*Quotzen*"
  const source = sourceTitle ? ` (${sourceTitle}${year ? `, ${year}` : ""})` : ""
  const urlPart = quoteUrl ? `\n\n${quoteUrl}` : ""

  return `“${content}”\n\n— ${author}${source}${urlPart}`
}

/**
 * Generates the universal deep-link for sharing via WhatsApp (Web or Mobile App).
 */
export function getWhatsAppShareUrl(params: QuoteShareParams): string {
  const text = formatWhatsAppQuoteText(params)
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`
}

/**
 * Generates the intent URL for sharing via X (formerly Twitter).
 */
export function getXShareUrl({
  content,
  authorName,
  sourceTitle,
  year,
  quoteUrl,
}: QuoteShareParams): string {
  const author = authorName ? ` — ${authorName}` : ""
  const source = sourceTitle ? ` (${sourceTitle}${year ? `, ${year}` : ""})` : ""
  const text = `“${content}”${author}${source}`
  const params = new URLSearchParams()
  params.set("text", text)
  if (quoteUrl) {
    params.set("url", quoteUrl)
  }
  return `https://x.com/intent/tweet?${params.toString()}`
}

/**
 * Generates the universal share dialog URL for Facebook.
 */
export function getFacebookShareUrl({
  quoteUrl,
}: {
  quoteUrl?: string
}): string {
  const url = quoteUrl || ""
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
}

/**
 * Generates the web URL for Instagram.
 * Note: Instagram does not provide a public web-intent URL scheme for direct link pre-filling.
 */
export function getInstagramShareUrl(): string {
  return "https://www.instagram.com/"
}

