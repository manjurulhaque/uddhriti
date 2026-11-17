"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { Button, Badge, Modal } from "@/components/ui"
import {
  SearchIcon,
  PlusIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ExternalLinkIcon,
  SpinnerIcon,
} from "@/components/ui/icons"

export type CollectionQuoteItem = {
  quoteId: string
  position: number | null
  quote: {
    id: string
    content: string
    status: string
    authorId: string | null
    authorName: string | null
    authorSlug: string | null
    categorySlug: string
    isVerified: boolean
    attributionStatus: string
    createdAt: string
  }
}

export type CandidateQuote = {
  id: string
  content: string
  authorName: string | null
  categorySlug: string
  status: string
  isVerified: boolean
  attributionStatus: string
}

interface CollectionQuotesManagerProps {
  collectionId: string
  collectionTitle: string
  onQuoteCountChange?: (newCount: number) => void
}

export function CollectionQuotesManager({
  collectionId,
  collectionTitle,
  onQuoteCountChange,
}: CollectionQuotesManagerProps) {
  const [quotes, setQuotes] = useState<CollectionQuoteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Reorder & Removal State
  const [reordering, setReordering] = useState(false)
  const [removingQuoteId, setRemovingQuoteId] = useState<string | null>(null)

  // Add Quotes Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [candidates, setCandidates] = useState<CandidateQuote[]>([])
  const [candidateSearch, setCandidateSearch] = useState("")
  const [loadingCandidates, setLoadingCandidates] = useState(false)
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set())
  const [isAdding, setIsAdding] = useState(false)

  // Refresh collection quotes on action
  const refreshCollectionQuotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/collections/${collectionId}/quotes?limit=100`)
      if (!res.ok) throw new Error("Failed to load collection quotes")
      const data = await res.json()
      setQuotes(data.items || [])
      if (onQuoteCountChange && typeof data.total === "number") {
        onQuoteCountChange(data.total)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load collection quotes")
    }
  }, [collectionId, onQuoteCountChange])

  // Load quotes currently in collection
  useEffect(() => {
    let ignore = false

    async function fetchCollectionQuotes() {
      try {
        const res = await fetch(`/api/admin/collections/${collectionId}/quotes?limit=100`)
        if (!res.ok) throw new Error("Failed to load collection quotes")
        const data = await res.json()
        if (!ignore) {
          setQuotes(data.items || [])
          if (onQuoteCountChange && typeof data.total === "number") {
            onQuoteCountChange(data.total)
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load collection quotes")
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    fetchCollectionQuotes()

    return () => {
      ignore = true
    }
  }, [collectionId, onQuoteCountChange])

  // Load candidates for the Add Modal
  useEffect(() => {
    if (!isAddModalOpen) return
    let ignore = false

    async function fetchCandidates() {
      setLoadingCandidates(true)
      try {
        const url = `/api/admin/collections/${collectionId}/quotes/available?q=${encodeURIComponent(candidateSearch)}&limit=30`
        const res = await fetch(url)
        if (!res.ok) throw new Error("Failed to search candidate quotes")
        const data = await res.json()
        if (!ignore) {
          setCandidates(data.items || [])
        }
      } catch (err: unknown) {
        console.error("Failed to load candidate quotes:", err)
      } finally {
        if (!ignore) {
          setLoadingCandidates(false)
        }
      }
    }

    const timer = setTimeout(() => {
      fetchCandidates()
    }, candidateSearch ? 250 : 0)

    return () => {
      ignore = true
      clearTimeout(timer)
    }
  }, [isAddModalOpen, candidateSearch, collectionId])

  // Clear messages after timeout
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [success])

  // Filtered quotes in collection
  const filteredQuotes = useMemo(() => {
    if (!search.trim()) return quotes
    const query = search.trim().toLowerCase()
    return quotes.filter(
      (item) =>
        item.quote.content.toLowerCase().includes(query) ||
        (item.quote.authorName && item.quote.authorName.toLowerCase().includes(query)) ||
        item.quote.categorySlug.toLowerCase().includes(query)
    )
  }, [quotes, search])

  // Add selected quotes
  async function handleAddSelectedQuotes() {
    if (selectedCandidateIds.size === 0) return
    setIsAdding(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/admin/collections/${collectionId}/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteIds: Array.from(selectedCandidateIds),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to add quotes")

      setSuccess(`Added ${data.addedCount} quote${data.addedCount === 1 ? "" : "s"} to collection.`)
      setIsAddModalOpen(false)
      setSelectedCandidateIds(new Set())
      setCandidateSearch("")
      await refreshCollectionQuotes()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add quotes")
    } finally {
      setIsAdding(false)
    }
  }

  // Remove a quote from collection
  async function handleRemoveQuote(quoteId: string) {
    setRemovingQuoteId(quoteId)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/admin/collections/${collectionId}/quotes?quoteId=${quoteId}`, {
        method: "DELETE",
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to remove quote")

      setQuotes((prev) => prev.filter((item) => item.quoteId !== quoteId))
      setSuccess("Quote removed from collection.")
      if (onQuoteCountChange) {
        onQuoteCountChange(Math.max(0, quotes.length - 1))
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove quote")
    } finally {
      setRemovingQuoteId(null)
    }
  }

  // Reorder quotes (Move Up / Down)
  async function handleMoveQuote(index: number, direction: "up" | "down") {
    if (reordering) return
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= quotes.length) return

    const newQuotes = [...quotes]
    const [moved] = newQuotes.splice(index, 1)
    newQuotes.splice(targetIndex, 0, moved)

    // Assign normalized positions 1, 2, 3...
    const itemsToUpdate = newQuotes.map((item, idx) => ({
      quoteId: item.quoteId,
      position: idx + 1,
    }))

    // Optimistically update UI
    setQuotes(
      newQuotes.map((item, idx) => ({
        ...item,
        position: idx + 1,
      }))
    )

    setReordering(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/collections/${collectionId}/quotes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsToUpdate }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save new order")
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update quote order")
      // Revert on error
      await refreshCollectionQuotes()
    } finally {
      setReordering(false)
    }
  }

  function toggleCandidateSelection(id: string) {
    setSelectedCandidateIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleSelectAllCandidates() {
    if (selectedCandidateIds.size === candidates.length) {
      setSelectedCandidateIds(new Set())
    } else {
      setSelectedCandidateIds(new Set(candidates.map((c) => c.id)))
    }
  }

  return (
    <div className="space-y-4">
      {/* Container Card */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-stone-900">Quotes in Collection</h2>
              <Badge variant="neutral" size="sm">
                {quotes.length} {quotes.length === 1 ? "quote" : "quotes"}
              </Badge>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Curate and order the specific quotations that belong to this collection.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {quotes.length > 5 ? (
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Filter quotes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="rounded-lg border border-stone-200 bg-stone-50/50 pl-8 pr-3 py-1.5 text-xs text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
                />
              </div>
            ) : null}

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                setIsAddModalOpen(true)
                setSelectedCandidateIds(new Set())
              }}
              className="flex items-center gap-1.5"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              <span>Add Quotes</span>
            </Button>
          </div>
        </div>

        {/* Notifications */}
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-800 font-bold ml-2"
            >
              ×
            </button>
          </div>
        ) : null}

        {success ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center justify-between">
            <span>{success}</span>
            <button
              type="button"
              onClick={() => setSuccess(null)}
              className="text-emerald-600 hover:text-emerald-900 font-bold ml-2"
            >
              ×
            </button>
          </div>
        ) : null}

        {/* Quotes List / Table */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-stone-400 space-y-2">
            <SpinnerIcon className="h-6 w-6 animate-spin text-stone-400" />
            <p className="text-xs">Loading collection quotes...</p>
          </div>
        ) : quotes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-200 p-8 text-center space-y-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-400">
              <PlusIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-stone-700">No quotes in this collection yet</p>
              <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
                Collections bundle thematic quotes together. Click &ldquo;Add Quotes&rdquo; above to select quotes from your library.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              className="mt-2"
            >
              Add First Quote
            </Button>
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="p-6 text-center text-xs text-stone-500">
            No quotes match your filter &ldquo;{search}&rdquo;.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-stone-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50/75 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3 w-16 text-center">Order</th>
                  <th className="py-2.5 px-3">Quote Content</th>
                  <th className="py-2.5 px-3 w-36">Author</th>
                  <th className="py-2.5 px-3 w-28">Status</th>
                  <th className="py-2.5 px-3 w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredQuotes.map((item, index) => {
                  const isFirst = index === 0
                  const isLast = index === filteredQuotes.length - 1
                  const isRemoving = removingQuoteId === item.quoteId

                  return (
                    <tr
                      key={item.quoteId}
                      className="group hover:bg-stone-50/60 transition-colors"
                    >
                      {/* Position & Order Controls */}
                      <td className="py-3 px-3 align-middle text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-mono text-xs font-semibold text-stone-600 min-w-[20px]">
                            #{item.position ?? index + 1}
                          </span>
                          {!search && (
                            <div className="flex flex-col">
                              <button
                                type="button"
                                disabled={isFirst || reordering}
                                onClick={() => handleMoveQuote(index, "up")}
                                className="p-0.5 text-stone-400 hover:text-stone-800 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                                title="Move up"
                              >
                                <ArrowUpIcon className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                disabled={isLast || reordering}
                                onClick={() => handleMoveQuote(index, "down")}
                                className="p-0.5 text-stone-400 hover:text-stone-800 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                                title="Move down"
                              >
                                <ArrowDownIcon className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Quote Content */}
                      <td className="py-3 px-3 align-middle">
                        <div className="space-y-1">
                          <p className="font-serif italic text-stone-900 text-xs line-clamp-2">
                            &ldquo;{item.quote.content}&rdquo;
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-stone-400">
                            <span className="bg-stone-100 px-1.5 py-0.5 rounded text-stone-600 font-mono">
                              {item.quote.categorySlug}
                            </span>
                            {item.quote.isVerified ? (
                              <span className="text-emerald-700 font-medium">✓ Verified</span>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* Author */}
                      <td className="py-3 px-3 align-middle text-stone-700 font-medium">
                        {item.quote.authorName || "Unknown"}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 align-middle">
                        <Badge
                          variant={
                            item.quote.status === "PUBLISHED"
                              ? "success"
                              : item.quote.status === "REVIEW"
                                ? "warning"
                                : item.quote.status === "ARCHIVED"
                                  ? "danger"
                                  : "neutral"
                          }
                          size="xs"
                        >
                          {item.quote.status}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 align-middle text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/admin/quotes/${item.quote.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-stone-400 hover:text-stone-800 rounded hover:bg-stone-100 transition"
                            title="Edit Quote in new tab"
                          >
                            <ExternalLinkIcon className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            type="button"
                            disabled={isRemoving}
                            onClick={() => handleRemoveQuote(item.quoteId)}
                            className="p-1.5 text-stone-400 hover:text-red-600 rounded hover:bg-red-50 transition disabled:opacity-40"
                            title="Remove from collection"
                          >
                            {isRemoving ? (
                              <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <TrashIcon className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Quotes Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={`Add Quotes to "${collectionTitle || "Collection"}"`}
        description="Search for quotations across your archive and select which ones to include."
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-stone-500 font-medium">
              {selectedCandidateIds.size} quote{selectedCandidateIds.size === 1 ? "" : "s"} selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={selectedCandidateIds.size === 0 || isAdding}
                onClick={handleAddSelectedQuotes}
                className="flex items-center gap-1.5"
              >
                {isAdding ? (
                  <>
                    <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <PlusIcon className="h-3.5 w-3.5" />
                    <span>Add Selected ({selectedCandidateIds.size})</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search by quote text, author name, or topic..."
              value={candidateSearch}
              onChange={(e) => setCandidateSearch(e.target.value)}
              className="w-full rounded-xl border border-stone-300 bg-white pl-9 pr-4 py-2.5 text-xs text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all"
            />
          </div>

          {/* Quick Controls */}
          {candidates.length > 0 && (
            <div className="flex items-center justify-between text-xs text-stone-500 px-1">
              <span>{candidates.length} candidate quotes found</span>
              <button
                type="button"
                onClick={toggleSelectAllCandidates}
                className="text-stone-700 hover:text-stone-900 font-semibold underline underline-offset-2 cursor-pointer"
              >
                {selectedCandidateIds.size === candidates.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
            </div>
          )}

          {/* Candidate List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-stone-100 rounded-xl border border-stone-200">
            {loadingCandidates ? (
              <div className="py-12 flex flex-col items-center justify-center text-stone-400 space-y-2">
                <SpinnerIcon className="h-5 w-5 animate-spin text-stone-400" />
                <p className="text-xs">Searching archive...</p>
              </div>
            ) : candidates.length === 0 ? (
              <div className="py-10 text-center text-xs text-stone-500">
                {candidateSearch.trim()
                  ? `No available quotes found matching "${candidateSearch}".`
                  : "No quotes available to add."}
              </div>
            ) : (
              candidates.map((cand) => {
                const isSelected = selectedCandidateIds.has(cand.id)

                return (
                  <div
                    key={cand.id}
                    onClick={() => toggleCandidateSelection(cand.id)}
                    className={`flex items-start gap-3 p-3 text-xs cursor-pointer transition-colors ${
                      isSelected ? "bg-amber-50/60" : "hover:bg-stone-50"
                    }`}
                  >
                    <div className="pt-0.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by parent onClick
                        className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900 cursor-pointer"
                      />
                    </div>

                    <div className="flex-1 space-y-1">
                      <p className="font-serif italic text-stone-900 leading-snug">
                        &ldquo;{cand.content}&rdquo;
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-stone-500">
                        <span className="font-medium text-stone-700">
                          {cand.authorName || "Unknown"}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-stone-500">{cand.categorySlug}</span>
                        <span>•</span>
                        <Badge
                          variant={
                            cand.status === "PUBLISHED"
                              ? "success"
                              : cand.status === "REVIEW"
                                ? "warning"
                                : "neutral"
                          }
                          size="xs"
                        >
                          {cand.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
