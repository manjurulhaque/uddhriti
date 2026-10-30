import { ImageResponse } from "next/og"

export const alt = "Quotzen — Timeless Quotes, Philosophy & Literary Sanctuary"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

export default function Image() {
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
          backgroundImage: "radial-gradient(circle at 50% 20%, #2f231c 0%, #161311 80%)",
          padding: "68px 80px",
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
              gap: 10,
            }}
          >
            <span
              style={{
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: 4,
                color: "#f5efe6",
              }}
            >
              QUOTZEN
            </span>
            <span style={{ color: "#c76b3e", fontSize: 26, fontWeight: 900 }}>•</span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "rgba(199, 107, 62, 0.22)",
              border: "1px solid rgba(199, 107, 62, 0.45)",
              borderRadius: "9999px",
              padding: "6px 18px",
              color: "#f4c78b",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            LITERARY SANCTUARY
          </div>
        </div>

        {/* Center Headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            margin: "32px 0",
          }}
        >
          <div
            style={{
              fontSize: 54,
              fontFamily: "Georgia, serif",
              lineHeight: 1.22,
              color: "#fcfbf9",
              letterSpacing: "-0.02em",
              maxWidth: 960,
            }}
          >
            Timeless Quotes, Philosophy &amp; Moral Reflection.
          </div>
          <div
            style={{
              fontSize: 22,
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
              color: "#e9c46a",
              marginTop: 18,
              lineHeight: 1.4,
              maxWidth: 880,
            }}
          >
            A distraction-free haven for history&apos;s greatest thinkers, verified against primary texts.
          </div>
        </div>

        {/* Bottom Feature Badges */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            borderTop: "1px solid rgba(245, 239, 230, 0.12)",
            paddingTop: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: 14,
                fontWeight: 600,
                color: "#a8a29e",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "9999px",
                padding: "6px 14px",
              }}
            >
              Verified Citations
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: 14,
                fontWeight: 600,
                color: "#a8a29e",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "9999px",
                padding: "6px 14px",
              }}
            >
              Thematic Analysis
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: 14,
                fontWeight: 600,
                color: "#a8a29e",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "9999px",
                padding: "6px 14px",
              }}
            >
              Available Offline
            </div>
          </div>

          <div
            style={{
              fontSize: 16,
              color: "rgba(245, 239, 230, 0.6)",
              letterSpacing: 1.5,
              fontWeight: 600,
            }}
          >
            quotzen.com
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}

