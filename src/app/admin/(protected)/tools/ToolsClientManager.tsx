"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button, ConfirmModal, Badge } from "@/components/ui"
import type { SystemDiagnosticsReport, DiagnosticCheck } from "@/app/api/admin/tools/diagnostics/route"

interface ToolsClientManagerProps {
  initialReport: SystemDiagnosticsReport | null
}

function StatusPill({ status }: { status: DiagnosticCheck["status"] }) {
  if (status === "ok") {
    return (
      <Badge variant="success" size="sm" dot>
        Healthy
      </Badge>
    )
  }
  if (status === "warning") {
    return (
      <Badge variant="warning" size="sm" dot>
        Attention Needed
      </Badge>
    )
  }
  return (
    <Badge variant="danger" size="sm" dot>
      Action Required
    </Badge>
  )
}

export function ToolsClientManager({ initialReport }: ToolsClientManagerProps) {
  const [report, setReport] = useState<SystemDiagnosticsReport | null>(initialReport)
  const [scanning, setScanning] = useState(false)
  const [repairing, setRepairing] = useState(false)
  const [isConfirmingRepair, setIsConfirmingRepair] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [expandedCheckId, setExpandedCheckId] = useState<string | null>(null)

  useEffect(() => {
    if (!initialReport) {
      void handleRunScan()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRunScan() {
    setScanning(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const res = await fetch("/api/admin/tools/diagnostics")
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to run diagnostics scan")
      }
      const data = await res.json()
      setReport(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Diagnostics scan failed")
    } finally {
      setScanning(false)
    }
  }

  async function handleRunRepair() {
    setRepairing(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const res = await fetch("/api/admin/tools/repair", {
        method: "POST",
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to execute repair")
      }

      const data = await res.json()
      setSuccessMessage(data.message || "Repair executed successfully.")
      setIsConfirmingRepair(false)

      // Re-run scan automatically after repair
      await handleRunScan()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Repair failed")
      setIsConfirmingRepair(false)
    } finally {
      setRepairing(false)
    }
  }

  const isHealthy = report?.overallStatus === "healthy"
  const totalIssues = report ? report.checks.reduce((acc, c) => acc + c.issueCount, 0) : 0

  return (
    <div className="space-y-6 font-sans">
      {/* Action Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/90 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-stone-900 tracking-tight">
              System Health & Diagnostics Runner
            </h2>
            {report?.timestamp ? (
              <span className="text-[11px] font-mono text-stone-400">
                Last checked: {new Date(report.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-stone-500">
            Automated audits for count drift, orphaned database join relations, hash integrity, and index performance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRunScan}
            isLoading={scanning}
            disabled={scanning || repairing}
          >
            {scanning ? "Scanning..." : "Run Diagnostics Scan"}
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setIsConfirmingRepair(true)}
            isLoading={repairing}
            disabled={scanning || repairing}
          >
            {repairing ? "Repairing..." : "Run Auto-Repair & Sync"}
          </Button>
        </div>
      </div>

      {/* Curatorial & Archival Integrity Tools Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-white p-5 sm:p-6 rounded-2xl border border-amber-200/80 shadow-2xs">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-stone-900 tracking-tight">
                🛡️ Public Hallucination & Fake Attribution Detector
              </h3>
              <Badge variant="warning" size="xs">
                Archival Audit
              </Badge>
            </div>
            <p className="text-xs text-stone-600 max-w-2xl leading-relaxed">
              Detect and resolve viral internet misattributions (Einstein, Monroe, Churchill, Lincoln, Gandhi, Buddha), linguistic anachronisms, and apocryphal citations across your entire quotation library with 1-click scholarly notices.
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <Link
            href="/admin/tools/hallucination-detector"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 transition shadow-2xs"
          >
            Open Hallucination Detector →
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs text-rose-600 hover:text-rose-950 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 flex items-center justify-between">
          <span>✓ {successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-xs text-emerald-600 hover:text-emerald-950 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Health Status Banner */}
      {report ? (
        <div
          className={`rounded-2xl border p-5 transition-all shadow-2xs ${
            isHealthy
              ? "bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-white border-emerald-200 text-emerald-950"
              : "bg-gradient-to-r from-amber-50/90 via-orange-50/60 to-white border-amber-200 text-amber-950"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 rounded-full p-2 shrink-0 ${
                  isHealthy ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {isHealthy ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base tracking-tight">
                    {isHealthy ? "All Systems Operational & Synchronized" : "Attention Recommended"}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                      isHealthy ? "bg-emerald-200/80 text-emerald-900" : "bg-amber-200/80 text-amber-900"
                    }`}
                  >
                    {isHealthy ? "Zero Issues" : `${totalIssues} Issues Detected`}
                  </span>
                </div>
                <p className="text-xs text-stone-600">
                  {isHealthy
                    ? "All database entity counts, relational joins, and deduplication hashes are verified."
                    : "Some cached counters or relational references require synchronization. Run Auto-Repair to fix."}
                </p>
              </div>
            </div>

            {!isHealthy ? (
              <Button
                type="button"
                variant="primary"
                size="xs"
                onClick={() => setIsConfirmingRepair(true)}
                isLoading={repairing}
              >
                Fix All Issues
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Database Quick Stats */}
      {report?.stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-xl border border-stone-200/80 p-3.5 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">Quotes</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono text-stone-900">{report.stats.totalQuotes}</span>
              <span className="text-[11px] text-stone-500 font-mono">({report.stats.publishedQuotes} live)</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200/80 p-3.5 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">Authors</span>
            <span className="text-xl font-bold font-mono text-stone-900">{report.stats.totalAuthors}</span>
          </div>

          <div className="bg-white rounded-xl border border-stone-200/80 p-3.5 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">Categories</span>
            <span className="text-xl font-bold font-mono text-stone-900">{report.stats.totalCategories}</span>
          </div>

          <div className="bg-white rounded-xl border border-stone-200/80 p-3.5 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">Sources</span>
            <span className="text-xl font-bold font-mono text-stone-900">{report.stats.totalSources}</span>
          </div>

          <div className="bg-white rounded-xl border border-stone-200/80 p-3.5 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">Tags</span>
            <span className="text-xl font-bold font-mono text-stone-900">{report.stats.totalTags}</span>
          </div>

          <div className="bg-white rounded-xl border border-stone-200/80 p-3.5 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">Collections</span>
            <span className="text-xl font-bold font-mono text-stone-900">{report.stats.totalCollections}</span>
          </div>
        </div>
      ) : null}

      {/* Diagnostic Checks Cards Grid */}
      {report?.checks ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Integrity Audits ({report.checks.length} Checks)
            </h3>
            <span className="text-xs text-stone-400">Click a card to inspect detailed samples</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {report.checks.map((check) => {
              const isExpanded = expandedCheckId === check.id
              const hasIssues = check.issueCount > 0

              return (
                <div
                  key={check.id}
                  className={`bg-white rounded-2xl border p-5 transition-all shadow-2xs space-y-3 ${
                    hasIssues
                      ? "border-amber-300/80 bg-amber-50/20"
                      : "border-stone-200/90"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-stone-900 tracking-tight">
                          {check.name}
                        </h4>
                        <StatusPill status={check.status} />
                      </div>
                      <p className="text-xs text-stone-500 leading-relaxed">
                        {check.description}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                          hasIssues
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        }`}
                      >
                        {check.issueCount} {check.issueCount === 1 ? "flag" : "flags"}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-stone-200/80 bg-stone-50/60 p-3 text-xs text-stone-700 leading-relaxed">
                    {check.message}
                  </div>

                  {check.sampleItems && check.sampleItems.length > 0 ? (
                    <div className="space-y-1.5 pt-1 border-t border-stone-100">
                      <button
                        type="button"
                        onClick={() => setExpandedCheckId(isExpanded ? null : check.id)}
                        className="text-[11px] font-semibold text-stone-500 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
                      >
                        <span>{isExpanded ? "Hide Sample Details" : `Show Samples (${check.sampleItems.length})`}</span>
                        <svg
                          className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isExpanded ? (
                        <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
                          {check.sampleItems.map((item, idx) => (
                            <div
                              key={idx}
                              className="rounded-lg bg-stone-100/80 p-2 text-xs font-mono text-stone-700 flex flex-col gap-0.5 border border-stone-200/60"
                            >
                              <span className="font-semibold text-stone-900">{item.label}</span>
                              <span className="text-stone-500 text-[11px]">{item.issue}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* Database Performance Indexes Card */}
      <div className="bg-white rounded-2xl border border-stone-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">
              Active Performance Indexes & Query Acceleration
            </h3>
            <p className="text-xs text-stone-500">
              Prisma compound indexes optimizing administrative feeds, sorting, and relational counts.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Active & Verified
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
          <div className="rounded-xl border border-stone-200/80 bg-stone-50/60 p-3 space-y-1">
            <span className="text-[10px] uppercase font-bold text-stone-400 block">Quote Feed Sort</span>
            <span className="font-semibold text-stone-800 text-[11px]">Quote [status, createdAt DESC]</span>
            <p className="text-[10px] text-stone-500 font-sans">Eliminates admin quote list filesort.</p>
          </div>

          <div className="rounded-xl border border-stone-200/80 bg-stone-50/60 p-3 space-y-1">
            <span className="text-[10px] uppercase font-bold text-stone-400 block">Category & Source Joins</span>
            <span className="font-semibold text-stone-800 text-[11px]">Quote [categoryId, status], [sourceId, status]</span>
            <p className="text-[10px] text-stone-500 font-sans">Accelerates relationship lookups.</p>
          </div>

          <div className="rounded-xl border border-stone-200/80 bg-stone-50/60 p-3 space-y-1">
            <span className="text-[10px] uppercase font-bold text-stone-400 block">Taxonomy Groups</span>
            <span className="font-semibold text-stone-800 text-[11px]">Tag [type, name]</span>
            <p className="text-[10px] text-stone-500 font-sans">Accelerates grouped tag taxonomies.</p>
          </div>

          <div className="rounded-xl border border-stone-200/80 bg-stone-50/60 p-3 space-y-1">
            <span className="text-[10px] uppercase font-bold text-stone-400 block">Anthology Positioning</span>
            <span className="font-semibold text-stone-800 text-[11px]">QuoteCollection [collectionId, position]</span>
            <p className="text-[10px] text-stone-500 font-sans">Instant sequential anthology ordering.</p>
          </div>

          <div className="rounded-xl border border-stone-200/80 bg-stone-50/60 p-3 space-y-1">
            <span className="text-[10px] uppercase font-bold text-stone-400 block">Soft Deletion Filter</span>
            <span className="font-semibold text-stone-800 text-[11px]">Quote [deletedAt]</span>
            <p className="text-[10px] text-stone-500 font-sans">Speeds active quote exclusion.</p>
          </div>

          <div className="rounded-xl border border-stone-200/80 bg-stone-50/60 p-3 space-y-1">
            <span className="text-[10px] uppercase font-bold text-stone-400 block">Source Volume & Types</span>
            <span className="font-semibold text-stone-800 text-[11px]">Source [authorId], [quoteCount], [type]</span>
            <p className="text-[10px] text-stone-500 font-sans">Optimizes author source lookups.</p>
          </div>
        </div>
      </div>

      {/* Auto Repair Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmingRepair}
        onClose={() => setIsConfirmingRepair(false)}
        onConfirm={handleRunRepair}
        title="Execute System Auto-Repair?"
        message="This operation will atomically recalculate all entity quote counts, purge any dangling relational join records, backfill missing deduplication hashes, and revalidate public edge caches. This action is completely safe to run anytime."
        confirmLabel="Run Auto-Repair"
        isLoading={repairing}
      />
    </div>
  )
}
