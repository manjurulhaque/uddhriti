"use client"

import { useEffect, useState, useTransition, useMemo, useCallback } from "react"
import { Button, ConfirmModal } from "@/components/ui"
import type { AdminRole } from "@prisma/client"

export type AuditLogEntry = {
  id: string
  action: "CREATE" | "UPDATE" | "DELETE" | "RESTORE" | "BULK_UPDATE" | "BULK_DELETE" | "IMPORT" | "REPAIR"
  entityType: "QUOTE" | "AUTHOR" | "SOURCE" | "CATEGORY" | "TAG" | "COLLECTION" | "FAQ" | "SYSTEM"
  entityId: string | null
  entityName: string | null
  adminId: string | null
  adminEmail: string | null
  adminName: string | null
  details: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

interface ActivityResponse {
  logs: AuditLogEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  stats: {
    totalOverall: number
    todayCount: number
    topActions: { action: string; count: number }[]
    topEntities: { entityType: string; count: number }[]
  }
}

interface ActivityClientManagerProps {
  adminRole: AdminRole
  adminId: string
}

function formatRelativeTime(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 45) return "Just now"
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}h ago`
  const diffDays = Math.floor(diffHour / 24)
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function ActionBadge({ action }: { action: AuditLogEntry["action"] }) {
  switch (action) {
    case "CREATE":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Created
        </span>
      )
    case "UPDATE":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
          Updated
        </span>
      )
    case "DELETE":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Deleted
        </span>
      )
    case "RESTORE":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
          Restored
        </span>
      )
    case "BULK_UPDATE":
    case "BULK_DELETE":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          {action === "BULK_DELETE" ? "Bulk Deleted" : "Bulk Updated"}
        </span>
      )
    case "IMPORT":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          Imported
        </span>
      )
    case "REPAIR":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
          Repaired
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-stone-100 text-stone-700">
          {action}
        </span>
      )
  }
}

function resolveEntityUrl(entityType: string, entityId: string | null): string | null {
  if (!entityId) return null
  switch (entityType) {
    case "QUOTE":
      return `/admin/quotes/${entityId}`
    case "AUTHOR":
      return `/admin/authors/${entityId}`
    case "CATEGORY":
      return `/admin/categories/${entityId}`
    case "SOURCE":
      return `/admin/sources/${entityId}`
    case "COLLECTION":
      return `/admin/collections/${entityId}`
    case "FAQ":
      return `/admin/faqs/${entityId}`
    case "TAG":
      return `/admin/tags/${entityId}`
    default:
      return null
  }
}

export function ActivityClientManager({ adminRole }: ActivityClientManagerProps) {
  const [data, setData] = useState<ActivityResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Filters
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [selectedAction, setSelectedAction] = useState<string>("ALL")
  const [selectedEntity, setSelectedEntity] = useState<string>("ALL")
  const [selectedTimeframe, setSelectedTimeframe] = useState<number>(0)
  const [page, setPage] = useState(1)

  // Inspection modal
  const [inspectingLog, setInspectingLog] = useState<AuditLogEntry | null>(null)
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null)

  // Purge modal
  const [isConfirmingPurge, setIsConfirmingPurge] = useState(false)
  const [purging, setPurging] = useState(false)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("limit", "25")
      if (debouncedSearch) params.set("search", debouncedSearch)
      if (selectedAction !== "ALL") params.set("action", selectedAction)
      if (selectedEntity !== "ALL") params.set("entityType", selectedEntity)
      if (selectedTimeframe > 0) params.set("days", String(selectedTimeframe))

      const res = await fetch(`/api/admin/activity?${params.toString()}`)
      if (!res.ok) {
        throw new Error("Failed to load activity logs")
      }
      const json: ActivityResponse = await res.json()
      setData(json)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading activity")
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, selectedAction, selectedEntity, selectedTimeframe])

  useEffect(() => {
    startTransition(() => {
      fetchLogs()
    })
  }, [fetchLogs])

  const handleCopyJson = (rawJson: string) => {
    navigator.clipboard.writeText(rawJson).then(() => {
      setCopiedNotification("Copied JSON delta to clipboard!")
      setTimeout(() => setCopiedNotification(null), 2500)
    })
  }

  const handlePurgeLogs = async () => {
    setPurging(true)
    try {
      const res = await fetch(`/api/admin/activity?olderThanDays=90`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.error || "Purge failed")
      }
      setIsConfirmingPurge(false)
      fetchLogs()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error purging logs")
    } finally {
      setPurging(false)
    }
  }

  const parsedDetails = useMemo(() => {
    if (!inspectingLog?.details) return null
    try {
      return JSON.parse(inspectingLog.details)
    } catch {
      return inspectingLog.details
    }
  }, [inspectingLog])

  return (
    <div className="space-y-6">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Total Audited Events
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-stone-900">
              {data?.stats?.totalOverall ?? "—"}
            </span>
            <span className="text-xs text-stone-500 font-sans">recorded</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Activity Today
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-emerald-700">
              {data?.stats?.todayCount ?? "—"}
            </span>
            <span className="text-xs text-emerald-600 font-sans">events logged</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Top Modified Entity
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-stone-800">
              {data?.stats?.topEntities?.[0]?.entityType ?? "None"}
            </span>
            {data?.stats?.topEntities?.[0] && (
              <span className="text-xs text-stone-500">({data.stats.topEntities[0].count} ops)</span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Most Common Action
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-stone-800">
              {data?.stats?.topActions?.[0]?.action ?? "None"}
            </span>
            {data?.stats?.topActions?.[0] && (
              <span className="text-xs text-stone-500">({data.stats.topActions[0].count} ops)</span>
            )}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by entity name, admin email, or delta notes..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-300 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition"
            />
            <svg
              className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-700 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="xs"
              onClick={fetchLogs}
              isLoading={loading || isPending}
            >
              Refresh
            </Button>

            {adminRole === "SUPER_ADMIN" && (
              <Button
                type="button"
                variant="danger"
                size="xs"
                onClick={() => setIsConfirmingPurge(true)}
              >
                Purge &gt;90d
              </Button>
            )}
          </div>
        </div>

        {/* Filter Dropdowns & Time Pills */}
        <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-stone-100 text-xs">
          {/* Action Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-stone-500 font-medium text-[11px]">Action:</span>
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value)
                setPage(1)
              }}
              className="rounded-lg border border-stone-200 bg-stone-50/70 px-2.5 py-1 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-900"
            >
              <option value="ALL">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="RESTORE">RESTORE</option>
              <option value="BULK_UPDATE">BULK_UPDATE</option>
              <option value="BULK_DELETE">BULK_DELETE</option>
              <option value="IMPORT">IMPORT</option>
              <option value="REPAIR">REPAIR</option>
            </select>
          </div>

          {/* Entity Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-stone-500 font-medium text-[11px]">Entity:</span>
            <select
              value={selectedEntity}
              onChange={(e) => {
                setSelectedEntity(e.target.value)
                setPage(1)
              }}
              className="rounded-lg border border-stone-200 bg-stone-50/70 px-2.5 py-1 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-900"
            >
              <option value="ALL">All Entities</option>
              <option value="QUOTE">QUOTE</option>
              <option value="AUTHOR">AUTHOR</option>
              <option value="SOURCE">SOURCE</option>
              <option value="CATEGORY">CATEGORY</option>
              <option value="TAG">TAG</option>
              <option value="COLLECTION">COLLECTION</option>
              <option value="FAQ">FAQ</option>
              <option value="SYSTEM">SYSTEM</option>
            </select>
          </div>

          {/* Timeframe selector pills */}
          <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg border border-stone-200/80">
            {[
              { label: "All Time", value: 0 },
              { label: "Today", value: 1 },
              { label: "7 Days", value: 7 },
              { label: "30 Days", value: 30 },
            ].map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => {
                  setSelectedTimeframe(t.value)
                  setPage(1)
                }}
                className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                  selectedTimeframe === t.value
                    ? "bg-white text-stone-900 shadow-2xs font-semibold"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {(selectedAction !== "ALL" || selectedEntity !== "ALL" || selectedTimeframe > 0 || search) && (
            <button
              type="button"
              onClick={() => {
                setSelectedAction("ALL")
                setSelectedEntity("ALL")
                setSelectedTimeframe(0)
                setSearch("")
                setPage(1)
              }}
              className="text-[11px] text-amber-700 hover:text-amber-900 font-semibold underline underline-offset-2 ml-auto cursor-pointer"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-xs text-rose-700 bg-rose-50/50">
            {error}
          </div>
        ) : loading && !data ? (
          <div className="p-12 text-center text-xs text-stone-500 animate-pulse space-y-2">
            <div className="w-8 h-8 mx-auto border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin" />
            <p>Loading activity ledger...</p>
          </div>
        ) : data && data.logs.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h4 className="font-bold text-sm text-stone-900">No activity logs found</h4>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              No audit logs matched your current filters. Administrative actions like creating, editing, and deleting entities will appear here in real time.
            </p>
          </div>
        ) : data ? (
          <div>
            {/* Header info */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-stone-100 bg-stone-50/50 text-xs text-stone-600">
              <span className="font-medium">
                Showing <strong className="text-stone-900">{data.logs.length}</strong> of{" "}
                <strong className="text-stone-900">{data.pagination.total}</strong> events
              </span>
              <span className="text-[11px] text-stone-400">Page {data.pagination.page} of {data.pagination.totalPages}</span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200/80 bg-stone-50/80 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Operator</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Target Entity</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {data.logs.map((log) => {
                    const entityUrl = resolveEntityUrl(log.entityType, log.entityId)
                    return (
                      <tr key={log.id} className="hover:bg-stone-50/60 transition-colors">
                        {/* Timestamp */}
                        <td className="py-3 px-4 align-top whitespace-nowrap">
                          <div className="font-semibold text-stone-900 font-mono text-[11px]">
                            {new Date(log.createdAt).toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          <div className="text-[10px] text-stone-400">
                            {formatRelativeTime(log.createdAt)}
                          </div>
                        </td>

                        {/* Operator */}
                        <td className="py-3 px-4 align-top whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-stone-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                              {(log.adminName || log.adminEmail || "A").slice(0, 1).toUpperCase()}
                            </div>
                            <div className="truncate max-w-[180px]">
                              <div className="font-semibold text-stone-900 truncate">
                                {log.adminName || "Admin"}
                              </div>
                              <div className="text-[10px] text-stone-500 font-mono truncate">
                                {log.adminEmail || "system"}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 align-top whitespace-nowrap">
                          <ActionBadge action={log.action} />
                        </td>

                        {/* Entity */}
                        <td className="py-3 px-4 align-top max-w-xs sm:max-w-md">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-stone-100 text-stone-700 border border-stone-200">
                                {log.entityType}
                              </span>
                              {entityUrl ? (
                                <a
                                  href={entityUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-stone-900 font-medium hover:underline inline-flex items-center gap-1 line-clamp-1"
                                >
                                  <span>{log.entityName || log.entityId}</span>
                                  <svg className="w-3 h-3 text-stone-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              ) : (
                                <span className="text-stone-800 font-medium line-clamp-1">
                                  {log.entityName || "System Task"}
                                </span>
                              )}
                            </div>

                            {log.details && (
                              <p className="text-[11px] text-stone-500 font-mono line-clamp-1">
                                {log.details}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Details / Modal Trigger */}
                        <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setInspectingLog(log)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 transition cursor-pointer"
                          >
                            <span>Inspect</span>
                            <svg className="w-3 h-3 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-stone-100 bg-stone-50/40 text-xs">
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ← Previous
                </Button>

                <span className="font-medium text-stone-600">
                  Page <strong className="text-stone-900">{page}</strong> of{" "}
                  <strong className="text-stone-900">{data.pagination.totalPages}</strong>
                </span>

                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  disabled={page >= data.pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next →
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* JSON Delta Inspector Modal */}
      {inspectingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-stone-100 bg-stone-50/80">
              <div className="flex items-center gap-2">
                <ActionBadge action={inspectingLog.action} />
                <span className="font-bold text-stone-900 text-sm">
                  {inspectingLog.entityType}: {inspectingLog.entityName || inspectingLog.entityId || "System"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setInspectingLog(null)}
                className="text-stone-400 hover:text-stone-900 text-sm font-bold p-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Event Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-stone-50 rounded-xl p-3 border border-stone-200/70 font-mono text-[11px]">
                <div>
                  <span className="text-stone-400 uppercase text-[9px] block">Event ID</span>
                  <span className="text-stone-800 truncate block font-bold">{inspectingLog.id}</span>
                </div>
                <div>
                  <span className="text-stone-400 uppercase text-[9px] block">Operator</span>
                  <span className="text-stone-800 truncate block">{inspectingLog.adminEmail || "system"}</span>
                </div>
                <div>
                  <span className="text-stone-400 uppercase text-[9px] block">UTC Timestamp</span>
                  <span className="text-stone-800 truncate block">{new Date(inspectingLog.createdAt).toISOString()}</span>
                </div>
                {inspectingLog.ipAddress && (
                  <div>
                    <span className="text-stone-400 uppercase text-[9px] block">IP Address</span>
                    <span className="text-stone-800 truncate block">{inspectingLog.ipAddress}</span>
                  </div>
                )}
                {inspectingLog.entityId && (
                  <div>
                    <span className="text-stone-400 uppercase text-[9px] block">Entity ID</span>
                    <span className="text-stone-800 truncate block">{inspectingLog.entityId}</span>
                  </div>
                )}
              </div>

              {/* JSON Delta Content */}
              <div>
                <div className="flex items-center justify-between pb-2">
                  <span className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">
                    Operation Delta / Payload
                  </span>
                  {inspectingLog.details && (
                    <button
                      type="button"
                      onClick={() => handleCopyJson(inspectingLog.details!)}
                      className="text-[11px] text-stone-600 hover:text-stone-900 font-semibold underline underline-offset-2 cursor-pointer"
                    >
                      Copy JSON
                    </button>
                  )}
                </div>

                {copiedNotification && (
                  <div className="mb-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-[11px]">
                    ✓ {copiedNotification}
                  </div>
                )}

                {inspectingLog.details ? (
                  <pre className="p-4 rounded-xl bg-stone-900 text-emerald-400 font-mono text-xs overflow-x-auto leading-relaxed border border-stone-800">
                    {typeof parsedDetails === "object"
                      ? JSON.stringify(parsedDetails, null, 2)
                      : inspectingLog.details}
                  </pre>
                ) : (
                  <div className="p-6 text-center text-stone-400 italic bg-stone-50 rounded-xl border border-stone-200/80">
                    No delta payload recorded for this operation.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t border-stone-100 bg-stone-50/50">
              <span className="text-[11px] text-stone-500 font-mono">
                {inspectingLog.userAgent ? `Client: ${inspectingLog.userAgent.slice(0, 50)}...` : ""}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="xs"
                onClick={() => setInspectingLog(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Purge Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmingPurge}
        onClose={() => setIsConfirmingPurge(false)}
        onConfirm={handlePurgeLogs}
        title="Purge Audit Logs Older Than 90 Days?"
        message="This will permanently delete administrative activity logs older than 90 days to free up database storage. This operation is recorded in the audit trail and cannot be undone."
        confirmLabel="Purge Old Logs"
        isLoading={purging}
      />
    </div>
  )
}
