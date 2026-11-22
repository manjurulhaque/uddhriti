"use client"

import * as React from "react"
import Link from "next/link"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", background: "#fcfbf7", color: "#292524" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1.25rem" }}>
          <div style={{ maxWidth: "32rem", width: "100%", background: "#ffffff", borderRadius: "1.5rem", border: "1px solid #e7e5e4", padding: "2.5rem 2rem", boxShadow: "0 20px 40px -15px rgba(0,0,0,0.07)", textAlign: "center" }}>
            <span style={{ display: "inline-block", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "#c2410c", marginBottom: "0.75rem" }}>
              Application Critical Error
            </span>
            <h1 style={{ margin: "0 0 1rem 0", fontSize: "1.75rem", fontWeight: 700, color: "#1c1917", lineHeight: 1.25 }}>
              Quotzen Sanctuary Unavailable
            </h1>
            <p style={{ margin: "0 0 1.5rem 0", fontSize: "0.9375rem", lineHeight: 1.6, color: "#57534e" }}>
              A critical layout error interrupted this session. The server is still healthy; please reload to re-establish your connection.
            </p>
            {process.env.NODE_ENV === "development" && error.message ? (
              <pre style={{ margin: "0 0 1.5rem 0", padding: "0.75rem 1rem", background: "#fef3c7", borderRadius: "0.75rem", color: "#78350f", fontSize: "0.75rem", textAlign: "left", overflowX: "auto", whiteSpace: "pre-wrap" }}>
                {error.message}
              </pre>
            ) : null}
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={reset}
                style={{
                  background: "#1c1917",
                  color: "#fcfbf7",
                  border: "none",
                  borderRadius: "9999px",
                  padding: "0.625rem 1.5rem",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Reload Application
              </button>
              <Link
                href="/"
                style={{
                  background: "#f5f5f4",
                  color: "#1c1917",
                  textDecoration: "none",
                  borderRadius: "9999px",
                  padding: "0.625rem 1.5rem",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  border: "1px solid #e7e5e4",
                }}
              >
                Return to Sanctuary
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}

