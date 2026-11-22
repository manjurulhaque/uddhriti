"use client"

import * as React from "react"
import { Author } from "./types"
import {
  matchAuthorsLocal,
  type AuthorMatch,
} from "@/lib/quotes/author-matcher"

interface AIAuthorSelectProps {
  authors: Author[]
  selectedAuthorId: string
  onSelectAuthor: (authorId: string) => void
  quoteContent?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

export function AIAuthorSelect({
  authors,
  selectedAuthorId,
  onSelectAuthor,
  quoteContent = "",
  required = false,
  disabled = false,
  className = "",
}: AIAuthorSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [isAiIdentifying, setIsAiIdentifying] = React.useState(false)
  const [isAiSearching, setIsAiSearching] = React.useState(false)
  const [aiMessage, setAiMessage] = React.useState<{
    text: string
    type: "success" | "info" | "warning"
  } | null>(null)
  const [semanticMatches, setSemanticMatches] = React.useState<AuthorMatch[] | null>(null)

  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLUListElement>(null)

  // Find currently selected author object
  const selectedAuthor = React.useMemo(() => {
    return authors.find((a) => a.id === selectedAuthorId) || null
  }, [authors, selectedAuthorId])

  // Compute matched authors
  const filteredMatches = React.useMemo<AuthorMatch[]>(() => {
    if (semanticMatches && semanticMatches.length > 0) {
      return semanticMatches
    }
    return matchAuthorsLocal(searchQuery, authors, 30)
  }, [searchQuery, authors, semanticMatches])

  // Reset semantic matches when search query changes
  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    setSemanticMatches(null)
    setActiveIndex(0)
    if (!isOpen) setIsOpen(true)
  }

  // Handle outside click to close dropdown
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Scroll active item into view
  React.useEffect(() => {
    if (!isOpen || !listRef.current) return
    const activeEl = listRef.current.children[activeIndex] as HTMLElement | undefined
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" })
    }
  }, [activeIndex, isOpen])

  // Select author
  const handleSelect = (author: { id: string; name: string }) => {
    onSelectAuthor(author.id)
    setIsOpen(false)
    setSearchQuery("")
    setSemanticMatches(null)
    setAiMessage(null)
  }

  // Clear author
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelectAuthor("")
    setSearchQuery("")
    setSemanticMatches(null)
    setAiMessage(null)
    inputRef.current?.focus()
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true)
        e.preventDefault()
      }
      return
    }

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((prev) => (prev < filteredMatches.length - 1 ? prev + 1 : prev))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (filteredMatches[activeIndex]) {
        handleSelect(filteredMatches[activeIndex])
      }
    } else if (e.key === "Escape") {
      e.preventDefault()
      setIsOpen(false)
    }
  }

  // AI Author Identification from Quote Content
  const handleAiIdentify = async () => {
    const trimmed = quoteContent.trim()
    if (!trimmed) {
      setAiMessage({
        text: "Please enter quotation text first to identify its author.",
        type: "warning",
      })
      return
    }

    setIsAiIdentifying(true)
    setAiMessage(null)

    try {
      const res = await fetch("/api/admin/authors/ai-select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "detectFromContent",
          content: trimmed,
        }),
      })

      if (!res.ok) {
        throw new Error("Failed to identify author from quote")
      }

      const data = await res.json()
      if (data.detectedAuthor) {
        handleSelect(data.detectedAuthor)
        setAiMessage({
          text: `✨ Identified: ${data.detectedAuthor.name} (${Math.round((data.confidence || 0.9) * 100)}% match)${
            data.rationale ? ` — ${data.rationale}` : ""
          }`,
          type: "success",
        })
      } else if (data.candidates && data.candidates.length > 0) {
        setSemanticMatches(data.candidates)
        setIsOpen(true)
        setAiMessage({
          text: `✨ Suggested author: "${data.suggestedAuthorName || data.candidates[0].name}". Please select below:`,
          type: "info",
        })
      } else {
        setAiMessage({
          text: data.suggestedAuthorName
            ? `Suggested "${data.suggestedAuthorName}", but author was not found in database.`
            : "Could not conclusively identify author from this quote.",
          type: "info",
        })
      }
    } catch {
      setAiMessage({
        text: "Could not complete AI author detection. Please select manually.",
        type: "warning",
      })
    } finally {
      setIsAiIdentifying(false)
    }
  }

  // AI Semantic / Conceptual Search
  const handleAiSemanticSearch = async () => {
    const trimmed = searchQuery.trim()
    if (!trimmed) return

    setIsAiSearching(true)
    setAiMessage(null)

    try {
      const res = await fetch("/api/admin/authors/ai-select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "search",
          query: trimmed,
          useAI: true,
        }),
      })

      if (!res.ok) throw new Error("Search failed")

      const data = await res.json()
      if (data.matches && data.matches.length > 0) {
        setSemanticMatches(data.matches)
        setActiveIndex(0)
        setIsOpen(true)
        setAiMessage({
          text: data.rationale ? `✨ AI: ${data.rationale}` : `✨ Found ${data.matches.length} semantic matches`,
          type: "info",
        })
      } else {
        setAiMessage({
          text: `No matching authors found for "${trimmed}".`,
          type: "info",
        })
      }
    } catch {
      setAiMessage({
        text: "AI semantic search unavailable. Showing local matches.",
        type: "warning",
      })
    } finally {
      setIsAiSearching(false)
    }
  }

  return (
    <div ref={containerRef} className={`relative space-y-2 ${className}`}>
      {/* Header with Label and AI Action */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">
          Author {required && <span className="text-red-500">*</span>}
        </label>

        <div className="flex items-center gap-2">
          {selectedAuthorId ? (
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] text-stone-500 hover:text-stone-800 underline underline-offset-2 transition-colors"
            >
              Clear
            </button>
          ) : null}

          {/* ✨ 1-Click AI Identify Button */}
          <button
            type="button"
            onClick={handleAiIdentify}
            disabled={disabled || isAiIdentifying || !quoteContent.trim()}
            title={
              quoteContent.trim()
                ? "Auto-detect and select author from quote content"
                : "Enter quote text above first to enable AI author identification"
            }
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all shadow-2xs ${
              quoteContent.trim()
                ? "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 hover:border-amber-300 active:scale-95 cursor-pointer"
                : "bg-stone-50 text-stone-400 border border-stone-200 cursor-not-allowed opacity-60"
            }`}
          >
            {isAiIdentifying ? (
              <>
                <svg
                  className="animate-spin h-3 w-3 text-amber-700"
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
                <span>Scanning quote...</span>
              </>
            ) : (
              <>
                <span className="text-amber-600 font-bold">✨</span>
                <span>AI Identify</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Selected Author Preview Badge when Dropdown is Closed */}
      {selectedAuthor && !isOpen ? (
        <div
          onClick={() => {
            if (!disabled) {
              setIsOpen(true)
              setTimeout(() => inputRef.current?.focus(), 50)
            }
          }}
          className="group flex items-center justify-between p-2.5 rounded-xl border border-stone-300 bg-stone-50/80 hover:bg-stone-50 hover:border-stone-400 cursor-pointer transition-all"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-stone-800 text-stone-100 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
              {selectedAuthor.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-stone-900 truncate">
                  {selectedAuthor.name}
                </span>
                {selectedAuthor.birthYear || selectedAuthor.deathYear ? (
                  <span className="text-[10px] text-stone-400 font-mono">
                    ({selectedAuthor.birthYear || "?"}–{selectedAuthor.deathYear || ""})
                  </span>
                ) : null}
              </div>
              <div className="text-[11px] text-stone-500 truncate flex items-center gap-2">
                {selectedAuthor.profession ? <span>{selectedAuthor.profession}</span> : null}
                {typeof selectedAuthor.quoteCount === "number" && selectedAuthor.quoteCount > 0 ? (
                  <span className="text-[10px] text-stone-400">
                    • {selectedAuthor.quoteCount} {selectedAuthor.quoteCount === 1 ? "quote" : "quotes"}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <span className="text-[10px] font-medium text-stone-500 group-hover:text-stone-800 transition-colors">
              Change
            </span>
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Remove author"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        /* Search Combobox Input */
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
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder={
                selectedAuthor
                  ? `Selected: ${selectedAuthor.name} (type to change...)`
                  : "Search author, typo, alias ('Samuel Clemens'), or role..."
              }
              className="w-full rounded-xl border border-stone-300 bg-white pl-8 pr-16 py-2.5 text-xs text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all"
            />

            {/* Quick Action in input */}
            <div className="absolute right-2 flex items-center gap-1">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  className="p-1 text-stone-400 hover:text-stone-600 transition-colors"
                  title="Clear search"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Notification Message Banner */}
      {aiMessage && (
        <div
          className={`flex items-start justify-between p-2.5 rounded-xl text-xs transition-all ${
            aiMessage.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : aiMessage.type === "warning"
              ? "bg-amber-50 text-amber-900 border border-amber-200"
              : "bg-stone-100 text-stone-800 border border-stone-200"
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 pr-2">
            <span className="shrink-0">{aiMessage.type === "success" ? "✓" : "ℹ"}</span>
            <span className="truncate">{aiMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setAiMessage(null)}
            className="text-stone-400 hover:text-stone-700 shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-xl animate-in fade-in-50 zoom-in-95 duration-100">
          {/* Top Bar inside Dropdown: Count & AI Deep Search */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-100 bg-stone-50/95 px-3 py-1.5 backdrop-blur-xs text-[11px] text-stone-500">
            <span>
              {filteredMatches.length} {filteredMatches.length === 1 ? "author" : "authors"}
              {searchQuery ? ` matching "${searchQuery}"` : " available"}
            </span>

            {searchQuery && (
              <button
                type="button"
                onClick={handleAiSemanticSearch}
                disabled={isAiSearching}
                className="inline-flex items-center gap-1 font-semibold text-amber-700 hover:text-amber-800 hover:underline disabled:opacity-50"
              >
                {isAiSearching ? (
                  <span>Searching AI...</span>
                ) : (
                  <>
                    <span>✨ AI Semantic Search</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Results List */}
          <ul ref={listRef} className="p-1 divide-y divide-stone-50" role="listbox">
            {filteredMatches.length > 0 ? (
              filteredMatches.map((author, index) => {
                const isSelected = author.id === selectedAuthorId
                const isActive = index === activeIndex

                return (
                  <li
                    key={author.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(author)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs ${
                      isActive
                        ? "bg-stone-100 text-stone-900"
                        : isSelected
                        ? "bg-stone-50 font-medium text-stone-900"
                        : "text-stone-700 hover:bg-stone-50"
                    }`}
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      {/* Avatar initial */}
                      <span className="w-5 h-5 rounded-md bg-stone-200 text-stone-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {author.name.charAt(0)}
                      </span>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-stone-900 truncate">
                            {author.name}
                          </span>

                          {author.birthYear || author.deathYear ? (
                            <span className="text-[10px] text-stone-400 font-mono">
                              ({author.birthYear || "?"}–{author.deathYear || ""})
                            </span>
                          ) : null}

                          {/* Match Tag Badge */}
                          {author.matchType === "alias" && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                              Alias {author.matchedAlias ? `"${author.matchedAlias}"` : ""}
                            </span>
                          )}
                          {author.matchType === "fuzzy" && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              {Math.round(author.confidence * 100)}% match
                            </span>
                          )}
                          {author.matchType === "detected_from_quote" && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                              ✨ Identified
                            </span>
                          )}
                          {author.matchType === "semantic" && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-sky-50 text-sky-800 border border-sky-200">
                              ✨ Semantic match
                            </span>
                          )}
                        </div>

                        {/* Profession or Rationale */}
                        <div className="text-[10px] text-stone-500 truncate">
                          {author.rationale ? (
                            <span className="italic text-stone-600">{author.rationale}</span>
                          ) : (
                            author.profession || author.nationality || null
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right side: Quote count or checkmark */}
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {typeof author.quoteCount === "number" && author.quoteCount > 0 && (
                        <span className="text-[10px] text-stone-400">
                          {author.quoteCount}q
                        </span>
                      )}
                      {isSelected && (
                        <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </li>
                )
              })
            ) : (
              <li className="px-4 py-6 text-center text-xs text-stone-500 space-y-2">
                <p>No authors found matching &ldquo;{searchQuery}&rdquo;</p>
                <button
                  type="button"
                  onClick={handleAiSemanticSearch}
                  disabled={isAiSearching}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 active:scale-95 transition-all shadow-xs"
                >
                  {isAiSearching ? "Searching with Gemini..." : "✨ Ask AI to Find Author"}
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

