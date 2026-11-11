"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui"
import { ExternalLinkIcon, SearchIcon, WikipediaIcon } from "@/components/ui/icons"
import type { WikipediaCandidate } from "@/app/api/admin/authors/search-wikipedia/route"

export interface ImportedAuthorProfile {
  name?: string
  slug?: string
  bio?: string | null
  birthYear?: number | null
  deathYear?: number | null
  dateOfBirth?: string | null
  dateOfDeath?: string | null
  profession?: string | null
  nationality?: string | null
  imageUrl?: string | null
  wikipediaUrl?: string | null
  wikidataId?: string | null
}

interface AuthorWikipediaQuickSyncProps {
  currentName: string
  onApplyProfile: (profile: ImportedAuthorProfile) => void
}

export function AuthorWikipediaQuickSync({
  currentName,
  onApplyProfile,
}: AuthorWikipediaQuickSyncProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState(currentName)
  const [candidates, setCandidates] = useState<WikipediaCandidate[]>([])
  const [searching, setSearching] = useState(false)
  const [syncingCandidate, setSyncingCandidate] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleOpen = () => {
    setIsOpen(true)
    setQuery(currentName)
    setError(null)
    setSuccessMessage(null)
    if (currentName.trim()) {
      void searchWikipedia(currentName.trim())
    }
  }

  const searchWikipedia = async (q: string) => {
    if (!q || q.length < 2) return
    setSearching(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/authors/search-wikipedia?q=${encodeURIComponent(q)}`)
      if (!res.ok) throw new Error("Failed to search Wikipedia")
      const data = await res.json()
      setCandidates(data.candidates || [])
      if ((data.candidates || []).length === 0) {
        setError("No matching authors found on Wikipedia. Try refining the search terms.")
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error searching Wikipedia")
    } finally {
      setSearching(false)
    }
  }

  const handleSelectCandidate = async (candidate: WikipediaCandidate) => {
    setSyncingCandidate(candidate.title)
    setError(null)
    try {
      const res = await fetch("/api/admin/authors/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wikipediaUrl: candidate.wikipediaUrl,
          wikidataId: candidate.wikidataId || undefined,
          name: candidate.title,
        }),
      })

      const imported = await res.json()
      if (!res.ok) {
        throw new Error(imported?.error || "Failed to import profile data")
      }

      onApplyProfile(imported)
      setSuccessMessage(`✓ Successfully synchronized profile for "${candidate.title}"!`)
      setTimeout(() => {
        setIsOpen(false)
        setSuccessMessage(null)
      }, 1400)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sync profile")
    } finally {
      setSyncingCandidate(null)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="xs"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 shadow-2xs font-medium"
      >
        <WikipediaIcon className="w-3.5 h-3.5 text-stone-600" />
        <span>Wikipedia Quick-Sync</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/80">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-stone-900 text-white flex items-center justify-center font-bold text-xs">
                  W
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900">Wikipedia &amp; Wikidata Quick-Sync</h3>
                  <p className="text-[11px] text-stone-500">
                    Find and auto-populate author biography, portrait, dates, and authority IDs
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-bold p-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Search Input Bar */}
            <div className="p-4 border-b border-stone-100 bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  void searchWikipedia(query.trim())
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search author name (e.g. Marcus Aurelius, Virginia Woolf)..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition"
                    autoFocus
                  />
                  <SearchIcon className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="xs"
                  isLoading={searching}
                  disabled={searching || !query.trim()}
                >
                  Search
                </Button>
              </form>

              {successMessage && (
                <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-xs animate-in fade-in">
                  {successMessage}
                </div>
              )}

              {error && (
                <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  {error}
                </div>
              )}
            </div>

            {/* Candidates Results List */}
            <div className="p-4 space-y-3 overflow-y-auto max-h-[50vh] text-xs">
              {searching ? (
                <div className="p-8 text-center space-y-2 text-stone-500">
                  <div className="w-6 h-6 mx-auto border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin" />
                  <p className="text-xs">Querying Wikipedia and Wikimedia Commons...</p>
                </div>
              ) : candidates.length > 0 ? (
                <div className="space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block px-1">
                    Select Matching Authority ({candidates.length} candidates)
                  </span>
                  {candidates.map((candidate) => {
                    const isSyncing = syncingCandidate === candidate.title
                    return (
                      <div
                        key={candidate.wikipediaUrl}
                        className="rounded-xl border border-stone-200/90 bg-stone-50/50 hover:bg-stone-50 hover:border-stone-300 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          {/* Candidate Portrait Thumbnail */}
                          <div className="relative w-12 h-12 rounded-lg bg-stone-200 border border-stone-300/80 overflow-hidden shrink-0">
                            {candidate.thumbnailUrl ? (
                              <Image
                                src={candidate.thumbnailUrl}
                                alt={candidate.title}
                                fill
                                sizes="48px"
                                unoptimized
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs font-bold">
                                {candidate.title.slice(0, 1)}
                              </div>
                            )}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-stone-900 text-[13px]">
                                {candidate.title}
                              </span>
                              {candidate.wikidataId && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white border border-stone-200 text-stone-600">
                                  {candidate.wikidataId}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed">
                              {candidate.snippet || "Historical thinker or literary figure recorded on Wikipedia."}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 pt-1 sm:pt-0 flex items-center gap-2">
                          <a
                            href={candidate.wikipediaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/70 transition"
                            title="Open Wikipedia page in new tab"
                          >
                            <ExternalLinkIcon className="w-3.5 h-3.5" />
                          </a>
                          <Button
                            type="button"
                            variant="primary"
                            size="xs"
                            onClick={() => void handleSelectCandidate(candidate)}
                            isLoading={isSyncing}
                            disabled={Boolean(syncingCandidate)}
                          >
                            Sync Profile
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-stone-400 text-xs">
                  Type an author or philosopher name and press Search to query Wikipedia and Wikidata.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-stone-100 bg-stone-50/50 flex items-center justify-between text-xs text-stone-500">
              <span className="text-[11px]">
                Powered by Wikipedia Action API &amp; Wikidata
              </span>
              <Button
                type="button"
                variant="secondary"
                size="xs"
                onClick={() => setIsOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

