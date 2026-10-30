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

