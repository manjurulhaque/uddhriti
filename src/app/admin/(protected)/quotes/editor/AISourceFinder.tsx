"use client"

import * as React from "react"
import { Source, SOURCE_TYPES } from "./types"
import type { PrimarySourceRecommendation } from "@/lib/quotes/source-finder"
import { normalizeAuthorName, calculateSimilarity } from "@/lib/quotes/author-matcher"

interface AISourceFinderProps {
  sources: Source[]
  selectedSourceId: string
  sourceTitle: string
  sourceType: (typeof SOURCE_TYPES)[number]
  onSelectSource: (sourceId: string) => void
  onUpdateSourceTitle: (title: string) => void
  onUpdateSourceType: (type: (typeof SOURCE_TYPES)[number]) => void
  onUpdateVerificationNote?: (note: string) => void
  currentVerificationNote?: string
  quoteContent?: string
  authorName?: string
  authorId?: string
  categoryName?: string
  disabled?: boolean
  className?: string
}

export function AISourceFinder({
  sources: initialSources,
  selectedSourceId,
  sourceTitle,
  sourceType,
  onSelectSource,
  onUpdateSourceTitle,
  onUpdateSourceType,
  onUpdateVerificationNote,
  currentVerificationNote = "",
  quoteContent = "",
  authorName = "",
  authorId = "",
  categoryName = "",
  disabled = false,
  className = "",
}: AISourceFinderProps) {
  const [sourcesList, setSourcesList] = React.useState<Source[]>(initialSources)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false)
  const [isManualMode, setIsManualMode] = React.useState(!selectedSourceId && Boolean(sourceTitle))
  const [activeIndex, setActiveIndex] = React.useState(0)

  // AI Discovery state
  const [isAiSearching, setIsAiSearching] = React.useState(false)
  const [isCreatingSource, setIsCreatingSource] = React.useState(false)
  const [recommendation, setRecommendation] = React.useState<PrimarySourceRecommendation | null>(null)
  const [notification, setNotification] = React.useState<{
    text: string
    type: "success" | "info" | "warning"
  } | null>(null)

  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLUListElement>(null)

  // Keep sources list in sync with props
  React.useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setSourcesList(initialSources)
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [initialSources])

  // Selected source object
  const selectedSource = React.useMemo(() => {
    return sourcesList.find((s) => s.id === selectedSourceId) || null
  }, [sourcesList, selectedSourceId])

  // Filter sources based on query and authorId
  const filteredSources = React.useMemo(() => {
    const trimmed = searchQuery.trim()
    if (!trimmed) {
      // Prioritize sources by current author
      return [...sourcesList].sort((a, b) => {
        if (authorId) {
          const aMatch = a.authorId === authorId ? 1 : 0
          const bMatch = b.authorId === authorId ? 1 : 0
          if (aMatch !== bMatch) return bMatch - aMatch
        }
        return (b.quoteCount || 0) - (a.quoteCount || 0) || a.title.localeCompare(b.title)
      })
    }

    const normQuery = normalizeAuthorName(trimmed)

    return sourcesList
      .map((s) => {
        const normTitle = normalizeAuthorName(s.title)
        let score = 0
        if (normTitle === normQuery) score = 1.0
        else if (normTitle.startsWith(normQuery)) score = 0.92
        else if (normTitle.includes(normQuery)) score = 0.85
        else {
          const sim = calculateSimilarity(normTitle, normQuery)
          if (sim >= 0.7) score = sim
        }

        if (authorId && s.authorId === authorId && score > 0) {
          score += 0.05
        }

        return { source: s, score }
      })
      .filter((item) => item.score >= 0.7)
      .sort((a, b) => b.score - a.score || (b.source.quoteCount || 0) - (a.source.quoteCount || 0))
      .map((item) => item.source)
  }, [sourcesList, searchQuery, authorId])

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsDropdownOpen(true)
        e.preventDefault()
      }
      return
    }

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((prev) => (prev < filteredSources.length - 1 ? prev + 1 : prev))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (filteredSources[activeIndex]) {
        handleSelectSource(filteredSources[activeIndex])
      }
    } else if (e.key === "Escape") {
      e.preventDefault()
      setIsDropdownOpen(false)
    }
  }

  // Handle source selection
  const handleSelectSource = (source: Source) => {
    onSelectSource(source.id)
    onUpdateSourceTitle("")
    if (source.type && (SOURCE_TYPES as readonly string[]).includes(source.type)) {
      onUpdateSourceType(source.type as (typeof SOURCE_TYPES)[number])
    }
    setIsDropdownOpen(false)
    setSearchQuery("")
    setIsManualMode(false)
  }

  // Clear source selection
  const handleClear = () => {
    onSelectSource("")
    onUpdateSourceTitle("")
    setSearchQuery("")
    setIsDropdownOpen(false)
    setRecommendation(null)
  }

  // Trigger AI Primary Source Discovery
  const handleAiFindPrimarySource = async () => {
    const trimmed = quoteContent.trim()
    if (!trimmed) {
      setNotification({
        text: "Please enter quotation content above to discover its primary source.",
        type: "warning",
      })
      return
    }

    setIsAiSearching(true)
    setNotification(null)

    try {
      const res = await fetch("/api/admin/sources/ai-find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "find",
          content: trimmed,
          authorName: authorName.trim() || undefined,
          authorId: authorId.trim() || undefined,
          categoryName: categoryName.trim() || undefined,
        }),
      })

      if (!res.ok) throw new Error("Source discovery failed")

      const data = await res.json()
      if (data.primarySource) {
        setRecommendation(data.primarySource)

        const matchedInDb = data.primarySource.existingSourceId
        setNotification({
          text: `✨ Identified Primary Work: "${data.primarySource.title}" (${
            data.primarySource.year ? `${data.primarySource.year} • ` : ""
          }${data.primarySource.workType})${
            matchedInDb ? " — Already in bibliography!" : " — Novel source."
          }`,
          type: "success",
        })
      } else {
        setNotification({
          text: "No conclusive primary publication found in concordance. Select from repository below.",
          type: "info",
        })
      }
    } catch {
      setNotification({
        text: "Could not query primary source database. Please select manually.",
        type: "warning",
      })
    } finally {
      setIsAiSearching(false)
    }
  }

  // Apply recommendation to quote form
  const handleApplyRecommendation = (rec: PrimarySourceRecommendation, appendToVerification = false) => {
    if (rec.existingSourceId) {
      // Source already exists in DB
      onSelectSource(rec.existingSourceId)
      onUpdateSourceTitle("")
    } else {
      // Source is new
      onSelectSource("")
      onUpdateSourceTitle(rec.title)
    }

    onUpdateSourceType(rec.workType)

    // Optional: Append citation locator to verification note
    if (appendToVerification && onUpdateVerificationNote) {
      const parts = [rec.title]
      if (rec.citationLocator) parts.push(rec.citationLocator)
      if (rec.year) parts.push(rec.year < 0 ? `${Math.abs(rec.year)} BCE` : `${rec.year}`)

      const locatorString = `Primary citation: ${parts.join(", ")}.`
      if (!currentVerificationNote.includes(rec.title)) {
        const nextNote = currentVerificationNote
          ? `${currentVerificationNote.trim()} ${locatorString}`
          : locatorString
        onUpdateVerificationNote(nextNote)
      }
    }

    setNotification({
      text: `✓ Applied "${rec.title}" as primary source citation.${
        appendToVerification ? " Added locator to Verification Note." : ""
      }`,
      type: "success",
    })
  }

  // 1-Click Create in Database
  const handleCreateInDatabase = async (rec: PrimarySourceRecommendation) => {
    setIsCreatingSource(true)

    try {
      const res = await fetch("/api/admin/sources/ai-find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createAndLink",
          title: rec.title,
          type: rec.workType,
          year: rec.year,
          authorId: authorId || undefined,
          description: rec.historicalContext || rec.explanation,
        }),
      })

      if (!res.ok) throw new Error("Failed to create source")

      const data = await res.json()
      if (data.source) {
        // Add to local state
        setSourcesList((prev) => [data.source, ...prev])
        onSelectSource(data.source.id)
        onUpdateSourceTitle("")
        onUpdateSourceType(data.source.type as (typeof SOURCE_TYPES)[number])

        // Update recommendation state
        setRecommendation((prev) =>
          prev ? { ...prev, existingSourceId: data.source.id, existingSource: data.source } : null
        )

        setNotification({
          text: `✓ Created and linked "${data.source.title}" in database!`,
          type: "success",
        })
      }
    } catch {
      setNotification({
        text: "Failed to create source record in database. Switched to inline mode.",
        type: "warning",
      })
      onUpdateSourceTitle(rec.title)
      onUpdateSourceType(rec.workType)
    } finally {
      setIsCreatingSource(false)
    }
  }

  return (
    <div ref={containerRef} className={`space-y-4 ${className}`}>
      {/* Header bar with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-100 pb-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-900 flex items-center gap-2">
            <span>Source Citation & Primary Locator</span>
          </h2>
          <p className="text-xs text-stone-500">
            Link this quote to its authentic primary work, speech, essay, or scripture.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* ✨ AI Find Primary Source Button */}
          <button
            type="button"
            onClick={handleAiFindPrimarySource}
            disabled={disabled || isAiSearching || !quoteContent.trim()}
            title={
              quoteContent.trim()
                ? "Auto-discover primary source publication and locator"
                : "Enter quote text first to enable primary source discovery"
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shadow-2xs ${
              quoteContent.trim()
                ? "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 hover:border-amber-300 active:scale-95 cursor-pointer"
                : "bg-stone-50 text-stone-400 border border-stone-200 cursor-not-allowed opacity-60"
            }`}
          >
            {isAiSearching ? (
              <>
                <svg
                  className="animate-spin h-3.5 w-3.5 text-amber-700"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Discovering primary source...</span>
              </>
            ) : (
              <>
                <span className="text-amber-600 font-bold">✨</span>
                <span>AI Find Primary Source</span>
              </>
            )}
          </button>

          {/* Toggle Manual / Custom Inline Mode */}
          <button
            type="button"
            onClick={() => {
              setIsManualMode(!isManualMode)
              if (!isManualMode) {
                onSelectSource("")
              }
            }}
            className="text-[11px] text-stone-500 hover:text-stone-800 underline underline-offset-2 transition-colors px-1"
          >
            {isManualMode ? "Use Bibliography" : "Manual Title"}
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`flex items-start justify-between p-3 rounded-xl text-xs transition-all ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : notification.type === "warning"
              ? "bg-amber-50 text-amber-900 border border-amber-200"
              : "bg-stone-100 text-stone-800 border border-stone-200"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <span className="shrink-0">{notification.type === "success" ? "✓" : "ℹ"}</span>
            <span className="truncate">{notification.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-stone-400 hover:text-stone-700 shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* ✨ AI Primary Source Recommendation Card */}
      {recommendation && (
        <div className="rounded-xl border border-amber-200/90 bg-gradient-to-br from-amber-50/70 via-stone-50/50 to-white p-4 text-xs shadow-2xs space-y-3 animate-in fade-in zoom-in-95">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  ✨ Primary Source Found
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-stone-100 text-stone-700 border border-stone-200">
                  {recommendation.workType}
                </span>
                {recommendation.year ? (
                  <span className="text-[11px] font-mono text-stone-500">
                    ({recommendation.year < 0 ? `${Math.abs(recommendation.year)} BCE` : recommendation.year})
                  </span>
                ) : null}
                {recommendation.existingSourceId ? (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ✓ In Database
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-sky-50 text-sky-700 border border-sky-200">
                    + Not in DB
                  </span>
                )}
              </div>

              <h3 className="text-sm font-bold text-stone-900 mt-1">
                {recommendation.title}
              </h3>

              {recommendation.citationLocator && (
                <div className="text-[11px] font-semibold text-stone-700 mt-0.5 flex items-center gap-1.5">
                  <span className="text-stone-400">Locator:</span>
                  <span className="bg-white/80 px-1.5 py-0.5 rounded border border-stone-200 font-mono text-stone-800">
                    {recommendation.citationLocator}
                  </span>
                </div>
              )}
            </div>

            <div className="text-right shrink-0">
              <span className="text-[11px] font-semibold text-amber-800">
                {Math.round(recommendation.confidence * 100)}% confidence
              </span>
            </div>
          </div>

          <p className="text-[11px] text-stone-600 leading-relaxed bg-white/70 p-2.5 rounded-lg border border-stone-200/60">
            {recommendation.explanation}
          </p>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleApplyRecommendation(recommendation, false)}
              className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs shadow-2xs active:scale-95 transition-all cursor-pointer"
            >
              Apply Source
            </button>

            {onUpdateVerificationNote && recommendation.citationLocator && (
              <button
                type="button"
                onClick={() => handleApplyRecommendation(recommendation, true)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-2xs active:scale-95 transition-all cursor-pointer"
                title="Sets primary source and appends exact locator to Verification Note"
              >
                Apply & Add to Verification Note
              </button>
            )}

            {!recommendation.existingSourceId && (
              <button
                type="button"
                onClick={() => handleCreateInDatabase(recommendation)}
                disabled={isCreatingSource}
                className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 font-medium text-xs shadow-2xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {isCreatingSource ? "Creating in DB..." : "+ Create in Database"}
              </button>
            )}

            <button
              type="button"
              onClick={() => setRecommendation(null)}
              className="px-2.5 py-1.5 text-stone-400 hover:text-stone-600 text-xs ml-auto"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Selector Container: Combobox or Manual Input */}
      {isManualMode ? (
        /* Manual Inline Source Mode */
        <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-800">
              Manual Custom Source
            </span>
            <button
              type="button"
              onClick={() => setIsManualMode(false)}
              className="text-xs text-stone-500 hover:text-stone-800 underline underline-offset-2"
            >
              Back to Bibliography
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <input
                type="text"
                value={sourceTitle}
                onChange={(e) => onUpdateSourceTitle(e.target.value)}
                placeholder="Source title (e.g. Meditations, Republic, Letter from Birmingham Jail)"
                className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all"
              />
            </div>
            <div>
              <select
                value={sourceType}
                onChange={(e) => onUpdateSourceType(e.target.value as (typeof SOURCE_TYPES)[number])}
                className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-800 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all font-medium"
              >
                {SOURCE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ) : (
        /* Standard Bibliography Combobox */
        <div className="space-y-2">
          {/* If a source is selected and dropdown is closed, show source summary card */}
          {selectedSource && !isDropdownOpen ? (
            <div
              onClick={() => {
                if (!disabled) {
                  setIsDropdownOpen(true)
                  setTimeout(() => inputRef.current?.focus(), 50)
                }
              }}
              className="group flex items-center justify-between p-3 rounded-xl border border-stone-300 bg-stone-50/80 hover:bg-stone-50 hover:border-stone-400 cursor-pointer transition-all"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-stone-800 text-stone-100 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  📖
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-stone-900 truncate">
                      {selectedSource.title}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-stone-100 text-stone-600 border border-stone-200">
                      {selectedSource.type || "BOOK"}
                    </span>
                    {selectedSource.year ? (
                      <span className="text-[10px] text-stone-400 font-mono">
                        ({selectedSource.year < 0 ? `${Math.abs(selectedSource.year)} BCE` : selectedSource.year})
                      </span>
                    ) : null}
                  </div>
                  <div className="text-[11px] text-stone-500 truncate flex items-center gap-2">
                    {authorName ? <span>Attributed to {authorName}</span> : null}
                    {typeof selectedSource.quoteCount === "number" && selectedSource.quoteCount > 0 ? (
                      <span className="text-[10px] text-stone-400">
                        • {selectedSource.quoteCount} {selectedSource.quoteCount === 1 ? "quote" : "quotes"} in library
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="text-[10px] font-medium text-stone-500 group-hover:text-stone-800 transition-colors">
                  Change
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClear()
                  }}
                  className="p-1 rounded-md text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Unlink source"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            /* Search Input */
            <div className="relative">
              <div className="relative flex items-center">
                <div className="absolute left-3 text-stone-400 pointer-events-none">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>

                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setActiveIndex(0)
                    if (!isDropdownOpen) setIsDropdownOpen(true)
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  onKeyDown={handleKeyDown}
                  disabled={disabled}
                  placeholder={
                    selectedSource
                      ? `Linked: ${selectedSource.title} (type to search bibliography...)`
                      : authorName
                      ? `Search works by ${authorName} or entire bibliography...`
                      : "Search published works, speeches, letters..."
                  }
                  className="w-full rounded-xl border border-stone-300 bg-white pl-8 pr-16 py-2.5 text-xs text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all"
                />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 p-1 text-stone-400 hover:text-stone-600 transition-colors"
                    title="Clear query"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Autocomplete Dropdown List */}
          {isDropdownOpen && (
            <div className="absolute z-40 left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-xl animate-in fade-in-50 zoom-in-95 duration-100">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-100 bg-stone-50/95 px-3 py-1.5 backdrop-blur-xs text-[11px] text-stone-500">
                <span>
                  {filteredSources.length} {filteredSources.length === 1 ? "source" : "sources"}
                  {searchQuery ? ` matching "${searchQuery}"` : " in repository"}
                </span>

                <button
                  type="button"
                  onClick={() => setIsManualMode(true)}
                  className="text-stone-600 hover:text-stone-900 font-medium underline"
                >
                  + Add Custom Title
                </button>
              </div>

              <ul ref={listRef} className="p-1 divide-y divide-stone-50" role="listbox">
                {/* Option to clear/unlink */}
                <li
                  role="option"
                  aria-selected={!selectedSourceId}
                  onClick={handleClear}
                  className="px-3 py-2 text-xs text-stone-500 hover:bg-stone-50 cursor-pointer rounded-lg flex items-center justify-between"
                >
                  <span>No Source Linked</span>
                  {!selectedSourceId && <span className="text-emerald-600 text-xs">✓</span>}
                </li>

                {filteredSources.length > 0 ? (
                  filteredSources.map((source, index) => {
                    const isSelected = source.id === selectedSourceId
                    const isActive = index === activeIndex
                    const isAuthorMatch = authorId && source.authorId === authorId

                    return (
                      <li
                        key={source.id}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleSelectSource(source)}
                        onMouseEnter={() => setActiveIndex(index)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs ${
                          isActive
                            ? "bg-stone-100 text-stone-900"
                            : isSelected
                            ? "bg-stone-50 font-medium text-stone-900"
                            : "text-stone-700 hover:bg-stone-50"
                        }`}
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <span className="text-xs shrink-0">📖</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-stone-900 truncate">
                                {source.title}
                              </span>

                              <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-stone-100 text-stone-600 border border-stone-200 shrink-0">
                                {source.type || "BOOK"}
                              </span>

                              {source.year ? (
                                <span className="text-[10px] text-stone-400 font-mono shrink-0">
                                  ({source.year < 0 ? `${Math.abs(source.year)} BCE` : source.year})
                                </span>
                              ) : null}

                              {isAuthorMatch && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                                  Author&apos;s Work
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          {typeof source.quoteCount === "number" && source.quoteCount > 0 && (
                            <span className="text-[10px] text-stone-400">{source.quoteCount}q</span>
                          )}
                          {isSelected && (
                            <svg
                              className="w-4 h-4 text-emerald-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                      </li>
                    )
                  })
                ) : (
                  <li className="px-4 py-6 text-center text-xs text-stone-500 space-y-2">
                    <p>No sources found matching &ldquo;{searchQuery}&rdquo;</p>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateSourceTitle(searchQuery.trim())
                        setIsManualMode(true)
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 active:scale-95 transition-all shadow-xs"
                    >
                      + Use &ldquo;{searchQuery}&rdquo; as Custom Source Title
                    </button>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
