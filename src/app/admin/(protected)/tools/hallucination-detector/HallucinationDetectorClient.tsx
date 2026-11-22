"use client"

import { useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import type {
  HallucinationAuditItem,
  HallucinationScanResult,
} from "@/lib/quotes/hallucination-detector"

type AuditTargetFilter = "high_risk_authors" | "unverified" | "published"

export function HallucinationDetectorClient() {
  const [targetFilter, setTargetFilter] = useState<AuditTargetFilter>("high_risk_authors")
  const [scanLimit, setScanLimit] = useState(20)
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<HallucinationScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"all" | "high" | "medium" | "low">("all")
  const [resolvingQuoteId, setResolvingQuoteId] = useState<string | null>(null)
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info"
    message: string
  } | null>(null)

  const showNotification = (type: "success" | "error" | "info", message: string) => {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification((current) => (current?.message === message ? null : current))
    }, 4500)
  }

  const handleRunAudit = async () => {
    setIsScanning(true)
    setError(null)
    setNotification(null)

    try {
      const res = await fetch("/api/admin/quotes/hallucination-detector/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filter: targetFilter,
          limit: scanLimit,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || `Scan failed (${res.status})`)
      }

      setScanResult(data as HallucinationScanResult)
      showNotification(
        "success",
        `Audit complete! Scanned ${(data as HallucinationScanResult).totalScanned} quotes.`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run hallucination scan")
    } finally {
      setIsScanning(false)
    }
  }

  const handleResolve = async (
    quote: HallucinationAuditItem,
    action: "flag_misattributed" | "flag_disputed" | "confirm_authentic" | "reassign_author" | "unpublish"
  ) => {
    setResolvingQuoteId(quote.quoteId)

    try {
      const res = await fetch("/api/admin/quotes/hallucination-detector/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId: quote.quoteId,
          action,
          actualAuthorName: quote.suggestedRealAuthor || undefined,
          verificationNote: quote.suggestedVerificationNote || undefined,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || "Resolution failed")
      }

      // Update local item status
      setScanResult((prev) => {
        if (!prev) return null
        return {
          ...prev,
          items: prev.items.map((item) => {
            if (item.quoteId !== quote.quoteId) return item
            if (action === "flag_misattributed") {
              return { ...item, currentAttributionStatus: "MISATTRIBUTED", isVerified: false, riskLevel: "LOW" }
            }
            if (action === "flag_disputed") {
              return { ...item, currentAttributionStatus: "DISPUTED", isVerified: false, riskLevel: "LOW" }
            }
            if (action === "confirm_authentic") {
              return { ...item, currentAttributionStatus: "CONFIRMED", isVerified: true, riskLevel: "LOW" }
            }
            if (action === "unpublish") {
              return { ...item, currentStatus: "DRAFT" }
            }
            if (action === "reassign_author" && quote.suggestedRealAuthor) {
              return {
                ...item,
                claimedAuthor: quote.suggestedRealAuthor,
                currentAttributionStatus: "CONFIRMED",
                isVerified: true,
                riskLevel: "LOW",
              }
            }
            return item
          }),
        }
      })

      const actionLabels = {
        flag_misattributed: "Flagged as Misattributed with scholarly warning banner",
        flag_disputed: "Flagged as Disputed provenance",
        confirm_authentic: "Confirmed as Authentic",
        reassign_author: `Reassigned author to ${quote.suggestedRealAuthor}`,
        unpublish: "Moved to Draft status",
      }

      showNotification("success", `Resolved: ${actionLabels[action]}`)
    } catch (err) {
      showNotification("error", err instanceof Error ? err.message : "Action failed")
    } finally {
      setResolvingQuoteId(null)
    }
  }

  const filteredItems =
    scanResult?.items.filter((item) => {
      if (activeTab === "high") return item.riskLevel === "HIGH"
      if (activeTab === "medium") return item.riskLevel === "MEDIUM"
      if (activeTab === "low") return item.riskLevel === "LOW"
      return true
    }) ?? []

  return (
    <div className="space-y-6 font-sans">
      {/* Overview & Scan Launcher Card */}
      <section className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">🛡️</span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-stone-900">
                Hallucination &amp; Apocrypha Scanner
              </h2>
              <Badge variant="rust" size="xs">
                Archival Fact-Checker
              </Badge>
            </div>
            <p className="text-xs text-stone-500 max-w-2xl">
              Cross-references quotations against verified scholarly canons, documented internet apocrypha,
              and linguistic anachronisms to protect your platform from publishing fake attributions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/tools"
              className="rounded-xl border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-stone-700 hover:bg-stone-50 transition-all"
            >
              Back to Tools
            </Link>
          </div>
        </div>

        {/* Audit Scope Controls */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <label
              htmlFor="target-scope-select"
              className="text-[11px] font-semibold uppercase tracking-wider text-stone-700 block"
            >
              Audit Target Scope
            </label>
            <select
              id="target-scope-select"
              value={targetFilter}
              onChange={(e) => setTargetFilter(e.target.value as AuditTargetFilter)}
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-800 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all"
            >
              <option value="high_risk_authors">
                🔥 High-Risk Authors (Einstein, Twain, Lincoln, Churchill, Monroe, Gandhi, Buddha)
              </option>
              <option value="unverified">🛡️ All Unverified Quotes (Pending verification)</option>
              <option value="published">📚 Recent Published Quotes</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="scan-limit-slider"
                className="text-[11px] font-semibold uppercase tracking-wider text-stone-700 block"
              >
                Scan Limit
              </label>
              <span className="text-xs font-mono font-bold text-stone-700">{scanLimit} quotes</span>
            </div>
            <input
              id="scan-limit-slider"
              type="range"
              min={5}
              max={50}
              step={5}
              value={scanLimit}
              onChange={(e) => setScanLimit(Number(e.target.value))}
              className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-900 mt-2.5"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              disabled={isScanning}
              onClick={handleRunAudit}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white shadow-xs hover:bg-black disabled:opacity-40 transition-all cursor-pointer"
            >
              {isScanning ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Auditing Provenance...</span>
                </>
              ) : (
                <>
                  <span>🛡️</span>
                  <span>Run Hallucination Audit</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Notifications */}
        {notification && (
          <div
            className={`rounded-xl border p-3.5 text-xs font-medium flex items-center justify-between ${
              notification.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : notification.type === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-stone-200 bg-stone-100 text-stone-800"
            }`}
          >
            <span>{notification.message}</span>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="hover:opacity-75 cursor-pointer text-sm font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-800 cursor-pointer text-sm font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}
      </section>

      {/* Results Workspace */}
      {scanResult && (
        <section className="space-y-4">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-stone-200/80 bg-white p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                Total Audited
              </span>
              <span className="text-xl font-bold text-stone-900 mt-0.5 block">
                {scanResult.totalScanned}
              </span>
            </div>

            <div className="rounded-xl border border-red-200/80 bg-red-50/40 p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-800 block">
                High Risk (Misattributed)
              </span>
              <span className="text-xl font-bold text-red-700 mt-0.5 block">
                {scanResult.highRiskCount}
              </span>
            </div>

            <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                Medium Risk (Disputed)
              </span>
              <span className="text-xl font-bold text-amber-700 mt-0.5 block">
                {scanResult.disputedCount}
              </span>
            </div>

            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                Authentic / Verified
              </span>
              <span className="text-xl font-bold text-emerald-700 mt-0.5 block">
                {scanResult.authenticCount}
              </span>
            </div>
          </div>

          {/* Filter Pills Navigation */}
          <div className="flex items-center justify-between border-b border-stone-200 pb-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "all"
                    ? "bg-stone-900 text-white"
                    : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                All ({scanResult.items.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("high")}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "high"
                    ? "bg-red-600 text-white"
                    : "text-red-700 hover:bg-red-50"
                }`}
              >
                🔴 High Risk ({scanResult.highRiskCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("medium")}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "medium"
                    ? "bg-amber-600 text-white"
                    : "text-amber-800 hover:bg-amber-50"
                }`}
              >
                🟡 Disputed ({scanResult.disputedCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("low")}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "low"
                    ? "bg-emerald-700 text-white"
                    : "text-emerald-800 hover:bg-emerald-50"
                }`}
              >
                🟢 Authentic ({scanResult.authenticCount})
              </button>
            </div>

            <span className="text-[11px] font-mono text-stone-400">
              Provider: {scanResult.provider}
            </span>
          </div>

          {/* Itemized Audit Cards */}
          <div className="space-y-3.5">
            {filteredItems.length === 0 ? (
              <div className="rounded-xl border border-stone-200 bg-white p-8 text-center text-stone-500 text-xs">
                No quotes in this filter category.
              </div>
            ) : (
              filteredItems.map((item) => {
                const isResolving = resolvingQuoteId === item.quoteId

                return (
                  <div
                    key={item.quoteId}
                    className={`rounded-xl border p-4 sm:p-5 transition-all space-y-3.5 ${
                      item.riskLevel === "HIGH"
                        ? "border-red-200 bg-red-50/20"
                        : item.riskLevel === "MEDIUM"
                        ? "border-amber-200 bg-amber-50/20"
                        : "border-stone-200/90 bg-white"
                    }`}
                  >
                    {/* Top Row: Quote & Verdict Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <blockquote className="font-serif italic text-stone-900 text-sm sm:text-base leading-snug">
                          &ldquo;{item.content}&rdquo;
                        </blockquote>
                        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
                          <span className="font-semibold text-stone-700">
                            Claimed Author: {item.claimedAuthor}
                          </span>
                          {item.suggestedRealAuthor && (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-100 text-amber-900 px-2 py-0.2 text-[11px] font-medium border border-amber-300">
                              <span>Actual:</span>
                              <strong className="font-semibold">{item.suggestedRealAuthor}</strong>
                            </span>
                          )}
                          <span className="text-stone-400">•</span>
                          <span className="text-stone-500 text-[11px]">
                            Current Status:{" "}
                            <span className="font-mono font-medium">{item.currentAttributionStatus}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.riskLevel === "HIGH" ? (
                          <Badge variant="danger" size="sm">
                            ⚠️ {item.verdict}
                          </Badge>
                        ) : item.riskLevel === "MEDIUM" ? (
                          <Badge variant="warning" size="sm">
                            ⚖️ {item.verdict}
                          </Badge>
                        ) : (
                          <Badge variant="success" size="sm">
                            ✓ {item.verdict}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Explanatory Callout Box */}
                    <div className="rounded-lg border border-stone-200/80 bg-white/90 p-3 text-xs text-stone-700 space-y-1.5 font-sans">
                      <div className="flex items-center gap-2 font-semibold text-stone-900">
                        <span>🔍 Archival Fact-Check:</span>
                        {item.actualOrigin && (
                          <span className="text-stone-500 font-normal font-mono text-[11px]">
                            (Earliest Origin: {item.actualOrigin})
                          </span>
                        )}
                      </div>
                      <p className="leading-relaxed text-stone-800">{item.hallucinationReason}</p>
                      {item.suggestedVerificationNote && (
                        <p className="text-[11px] text-stone-500 italic pt-0.5">
                          Note: {item.suggestedVerificationNote}
                        </p>
                      )}
                    </div>

                    {/* 1-Click Action Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-200/60">
                      <span className="text-[11px] font-medium text-stone-500">
                        Recommended Action:{" "}
                        <strong className="text-stone-800 uppercase font-mono text-[10px]">
                          {item.suggestedAction.replace(/_/g, " ")}
                        </strong>
                      </span>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.suggestedRealAuthor && (
                          <button
                            type="button"
                            disabled={isResolving}
                            onClick={() => handleResolve(item, "reassign_author")}
                            className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-40 transition-all cursor-pointer"
                            title={`Reassign quote author to ${item.suggestedRealAuthor}`}
                          >
                            ✍️ Reassign to {item.suggestedRealAuthor}
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={isResolving || item.currentAttributionStatus === "MISATTRIBUTED"}
                          onClick={() => handleResolve(item, "flag_misattributed")}
                          className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-40 transition-all cursor-pointer"
                          title="Display scholarly misattribution warning on public page"
                        >
                          🏷️ Flag Misattributed
                        </button>

                        <button
                          type="button"
                          disabled={isResolving || item.currentAttributionStatus === "DISPUTED"}
                          onClick={() => handleResolve(item, "flag_disputed")}
                          className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40 transition-all cursor-pointer"
                          title="Flag as disputed provenance"
                        >
                          ⚖️ Flag Disputed
                        </button>

                        <button
                          type="button"
                          disabled={isResolving || item.currentStatus === "DRAFT"}
                          onClick={() => handleResolve(item, "unpublish")}
                          className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40 transition-all cursor-pointer"
                          title="Move to draft status"
                        >
                          📥 Unpublish
                        </button>

                        <button
                          type="button"
                          disabled={isResolving || (item.currentAttributionStatus === "CONFIRMED" && item.isVerified)}
                          onClick={() => handleResolve(item, "confirm_authentic")}
                          className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-40 transition-all cursor-pointer"
                          title="Mark as confirmed authentic"
                        >
                          ✓ Confirm Authentic
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>
      )}
    </div>
  )
}
