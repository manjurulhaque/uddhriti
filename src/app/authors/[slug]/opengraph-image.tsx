import { ImageResponse } from "next/og"
import { prisma } from "@/lib/prisma"
import { sanitizeSlug } from "@/lib/security/input"
import { formatLifespan, cleanProfession } from "@/lib/formatters"

export const alt = "Author Profile Card"
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

  const author = await prisma.author.findUnique({
    where: { slug },
    select: {
      name: true,
      profession: true,
      nationality: true,
      birthYear: true,
      deathYear: true,
      bio: true,
      quoteCount: true,
      quotes: {
        where: { status: "PUBLISHED", deletedAt: null },
        orderBy: { popularityScore: "desc" },
        take: 1,
        select: { content: true },
      },
    },
  })

  if (!author) {
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
            Author Not Found • Literary Sanctuary
          </div>
        </div>
      ),
      { ...size }
    )
  }

  const lifespan = formatLifespan(author.birthYear, author.deathYear)
  const profession = cleanProfession(author.profession)
  const topQuote = author.quotes[0]?.content
  const quoteSnippet = topQuote
    ? topQuote.length > 140
      ? `${topQuote.slice(0, 137).trim()}…`
      : topQuote
    : null

  const subtitleParts = [author.nationality, profession, lifespan].filter(Boolean)
  const subtitle = subtitleParts.join(" • ")

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
            }}
          >
            THINKER &amp; PHILOSOPHER
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
              fontSize: author.name.length > 25 ? 46 : 56,
              fontFamily: "Georgia, serif",
              fontWeight: 700,
              color: "#fcfbf9",
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
            }}
          >
            {author.name}
          </div>

          {subtitle && (
            <div
              style={{
                fontSize: 20,
                fontFamily: "Georgia, serif",
                fontStyle: "italic",
                color: "#e9c46a",
                marginTop: 12,
                letterSpacing: "0.01em",
              }}
            >
              {subtitle}
            </div>
          )}

          {quoteSnippet && (
            <div
              style={{
                display: "flex",
                marginTop: 24,
                padding: "16px 24px",
                borderLeft: "3px solid #c76b3e",
                backgroundColor: "rgba(255, 255, 255, 0.03)",
                borderRadius: "0 12px 12px 0",
              }}
            >
              <span
                style={{
                  fontSize: 22,
                  fontFamily: "Georgia, serif",
                  fontStyle: "italic",
                  color: "#d6d3d1",
                  lineHeight: 1.4,
                }}
              >
                &ldquo;{quoteSnippet}&rdquo;
              </span>
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
              {author.quoteCount} {author.quoteCount === 1 ? "Quotation" : "Quotations"}
            </span>
            <span style={{ fontSize: 13, color: "#a8a29e" }}>
              Verified &amp; Curated
            </span>
          </div>

          <div
            style={{
              fontSize: 14,
              color: "#a8a29e",
              letterSpacing: 1,
            }}
          >
            quotzen.com/authors/{slug}
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}

