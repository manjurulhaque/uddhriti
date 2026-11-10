import { ImageResponse } from "next/og"
import { prisma } from "@/lib/prisma"
import { sanitizeSlug } from "@/lib/security/input"

export const alt = "Tag Quotes Collection"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"
export const revalidate = 86400

type Props = {
  params: Promise<{ slug: string }>
}

export default async function Image({ params }: Props) {
  const { slug: rawSlug } = await params
  const slug = sanitizeSlug(rawSlug, 150)

  const tag = await prisma.tag.findUnique({
    where: { slug },
    select: {
      name: true,
      description: true,
      type: true,
      quoteCount: true,
      quotes: {
        where: {
          quote: { status: "PUBLISHED", deletedAt: null },
        },
        orderBy: {
          quote: { popularityScore: "desc" },
        },
        take: 1,
        select: {
          quote: {
            select: {
              content: true,
              authorName: true,
            },
          },
        },
      },
    },
  })

  if (!tag) {
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
            Tag Not Found • Literary Sanctuary
          </div>
        </div>
      ),
      { ...size }
    )
  }

  const topQuote = tag.quotes[0]?.quote
  const quoteSnippet = topQuote?.content
    ? topQuote.content.length > 130
      ? `${topQuote.content.slice(0, 127).trim()}…`
      : topQuote.content
    : null

  const tagTypeName = tag.type ? tag.type.replace(/_/g, " ") : "TOPIC & THEME"

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
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            {tagTypeName}
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
            <span style={{ color: "#c76b3e", fontSize: 20 }}>•</span>
          </div>
        </div>

        {/* Center Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            margin: "24px 0",
          }}
        >
          <div
            style={{
              fontSize: tag.name.length > 25 ? 46 : 56,
              fontFamily: "Georgia, serif",
              fontWeight: 700,
              color: "#fcfbf9",
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
            }}
          >
            #{tag.name} Quotes
          </div>

          {tag.description && (
            <div
              style={{
                fontSize: 20,
                fontFamily: "Georgia, serif",
                color: "#d6d3d1",
                marginTop: 14,
                lineHeight: 1.45,
                maxWidth: 980,
              }}
            >
              {tag.description.length > 150
                ? `${tag.description.slice(0, 147).trim()}…`
                : tag.description}
            </div>
          )}

          {quoteSnippet && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: 22,
                padding: "16px 24px",
                borderLeft: "3px solid #c76b3e",
                backgroundColor: "rgba(255, 255, 255, 0.03)",
                borderRadius: "0 12px 12px 0",
              }}
            >
              <span
                style={{
                  fontSize: 20,
                  fontFamily: "Georgia, serif",
                  fontStyle: "italic",
                  color: "#e9c46a",
                  lineHeight: 1.4,
                }}
              >
                &ldquo;{quoteSnippet}&rdquo;
              </span>
              {topQuote?.authorName && (
                <span
                  style={{
                    fontSize: 14,
                    color: "#a8a29e",
                    marginTop: 6,
                    fontWeight: 600,
                  }}
                >
                  — {topQuote.authorName}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Bottom Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            paddingTop: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                padding: "6px 14px",
                borderRadius: "9999px",
                fontSize: 14,
                fontWeight: 600,
                color: "#e7e5e4",
              }}
            >
              {tag.quoteCount} {tag.quoteCount === 1 ? "Quotation" : "Quotations"}
            </span>
            <span style={{ fontSize: 13, color: "#a8a29e" }}>
              Thematic Quotations Archive
            </span>
          </div>

          <div
            style={{
              fontSize: 14,
              color: "#a8a29e",
              letterSpacing: 1,
            }}
          >
            quotzen.com/tags/{slug}
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}

