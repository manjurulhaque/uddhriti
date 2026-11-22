import { ImageResponse } from "next/og"
import { prisma } from "@/lib/prisma"
import { sanitizeSlug } from "@/lib/security/input"
import { isValidUuid } from "@/lib/api/route-helpers"

export const alt = "Quote Card"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"
export const revalidate = 86400

type Props = {
  params: Promise<{ slug: string }>
}

function formatQuoteText(text: string): { content: string; fontSize: number } {
  const clean = text.trim()
  if (clean.length <= 90) {
    return { content: clean, fontSize: 44 }
  }
  if (clean.length <= 180) {
    return { content: clean, fontSize: 36 }
  }
  if (clean.length <= 280) {
    return { content: clean, fontSize: 28 }
  }
  return { content: `${clean.slice(0, 275).trim()}…`, fontSize: 26 }
}

export default async function Image({ params }: Props) {
  const { slug: rawSlug } = await params
  const slug = sanitizeSlug(rawSlug, 150)
  const isUuid = isValidUuid(slug)

  const quote = await prisma.quote.findFirst({
    where: {
      OR: [{ slug }, ...(isUuid ? [{ id: slug }] : [])],
      status: "PUBLISHED",
      deletedAt: null,
    },
    select: {
      content: true,
      authorName: true,
      isVerified: true,
      category: { select: { name: true } },
      source: { select: { title: true, year: true } },
    },
  })

  if (!quote) {
    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#161311",
            color: "#f5efe6",
          }}
        >
          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: "#e9c46a",
              letterSpacing: 4,
            }}
          >
            QUOTZEN
          </div>
          <div
            style={{
              fontSize: 20,
              color: "#a8a29e",
              marginTop: 12,
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
            }}
          >
            Timeless Quotations &amp; Literary Sanctuary
          </div>
        </div>
      ),
      { ...size }
    )
  }

  const { content, fontSize } = formatQuoteText(quote.content)
  const authorName = quote.authorName || "Unknown"
  const categoryName = quote.category?.name?.toUpperCase() || "PHILOSOPHY"
  const sourceTitle = quote.source?.title
  const sourceYear = quote.source?.year ? `(${quote.source.year})` : null
  const citation = [sourceTitle, sourceYear].filter(Boolean).join(" ")

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#161311",
          backgroundImage: "radial-gradient(circle at 15% 15%, #2c211b 0%, #161311 75%)",
          padding: "60px 72px",
          color: "#f5efe6",
        }}
      >
        {/* Top Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "rgba(199, 107, 62, 0.22)",
              border: "1px solid rgba(199, 107, 62, 0.45)",
              borderRadius: "9999px",
              padding: "8px 20px",
              color: "#f4c78b",
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            {categoryName}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: 3,
                color: "#f5efe6",
              }}
            >
              QUOTZEN
            </span>
            <span style={{ color: "#c76b3e", fontSize: 22, fontWeight: 900 }}>•</span>
          </div>
        </div>

        {/* Center Quotation */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            margin: "24px 0",
          }}
        >
          <div
            style={{
              fontSize: 64,
              color: "#c76b3e",
              fontFamily: "Georgia, serif",
              lineHeight: 1,
              marginBottom: -8,
            }}
          >
            “
          </div>
          <div
            style={{
              fontSize,
              lineHeight: 1.38,
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
              color: "#fcfbf9",
              letterSpacing: "-0.01em",
            }}
          >
            {content}
          </div>
        </div>

        {/* Bottom Attribution */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            width: "100%",
            borderTop: "1px solid rgba(245, 239, 230, 0.12)",
            paddingTop: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "#e9c46a",
                letterSpacing: "-0.01em",
              }}
            >
              — {authorName}
            </div>
            {citation ? (
              <div
                style={{
                  fontSize: 16,
                  color: "#a8a29e",
                  fontFamily: "Georgia, serif",
                  fontStyle: "italic",
                }}
              >
                {citation}
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            {quote.isVerified ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#34d399",
                  backgroundColor: "rgba(52, 211, 153, 0.12)",
                  border: "1px solid rgba(52, 211, 153, 0.3)",
                  borderRadius: "9999px",
                  padding: "4px 14px",
                }}
              >
                ✓ Verified Citation
              </div>
            ) : null}
            <div
              style={{
                fontSize: 15,
                color: "rgba(245, 239, 230, 0.5)",
                letterSpacing: 1.5,
              }}
            >
              quotzen.com
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}

