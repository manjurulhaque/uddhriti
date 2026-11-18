"use client"

import { useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import type { ExtractedQuoteCandidate } from "@/lib/quotes/unstructured-extractor"

export interface ImportItemPayload {
  content?: string
  meaning?: string
  historicalContext?: string
  modernRelevance?: string
  authorId?: string
  authorName?: string
  categoryId?: string
  categoryName?: string
  sourceTitle?: string
  sourceType?: string
  publish?: boolean
  language?: string
  tagIds?: string[]
  tagSlugs?: string[]
  tagNames?: string[]
  tags?: string[]
  wikiquoteUrl?: string
  gutenbergUrl?: string
  wikisourceUrl?: string
}

interface UnstructuredTextExtractorProps {
  authors: Array<{ id: string; name: string }>
  categories: Array<{ id: string; name: string }>
  tags: Array<{ id: string; name: string; slug: string }>
  defaultCategoryId?: string
  defaultAuthorId?: string
  publishByDefault?: boolean
  onSendToPayload: (items: ImportItemPayload[]) => void
  onDirectImport?: (items: ImportItemPayload[]) => Promise<void>
}

interface SamplePreset {
  label: string
  icon: string
  author: string
  source: string
  category: string
  text: string
}

const SAMPLE_PRESETS: SamplePreset[] = [
  {
    label: "Marcus Aurelius",
    icon: "🏛️",
    author: "Marcus Aurelius",
    source: "Meditations, Book IV",
    category: "Philosophy",
    text: `Dwell on the beauty of life. Watch the stars, and see yourself running with them.
The happiness of your life depends upon the quality of your thoughts: therefore, guard accordingly, and take care that you entertain no notions unsuitable to virtue and reasonable nature.
Waste no more time arguing about what a good man should be. Be one.
When you arise in the morning think of what a privilege it is to be alive, to think, to enjoy, to love.
The best revenge is not to be like that.
Accept the things to which fate binds you, and love the people with whom fate brings you together, but do so with all your heart.
Never let the future disturb you. You will meet it, if you have to, with the same weapons of reason which today arm you against the present.`,
  },
  {
    label: "Steve Jobs",
    icon: "🎙️",
    author: "Steve Jobs",
    source: "Stanford Commencement Address (2005)",
    category: "Inspiration",
    text: `Your time is limited, so don't waste it living someone else's life. Don't be trapped by dogma — which is living with the results of other people's thinking.
Don't let the noise of others' opinions drown out your own inner voice. And most important, have the courage to follow your heart and intuition.
You can't connect the dots looking forward; you can only connect them looking backwards. So you have to trust that the dots will somehow connect in your future.
You've got to find what you love. And that is as true for your work as it is for your lovers. Your work is going to fill a large part of your life, and the only way to be truly satisfied is to do what you believe is great work.
And the only way to do great work is to love what you do. If you haven't found it yet, keep looking. Don't settle.
Stay hungry. Stay foolish.`,
  },
  {
    label: "Seneca",
    icon: "📜",
    author: "Seneca",
    source: "Letters from a Stoic",
    category: "Wisdom",
    text: `It is not that we have a short time to live, but that we waste a lot of it. Life is long enough, and a sufficiently generous estimate has been given to us for the highest achievements if it were all well invested.
We suffer more often in imagination than in reality.
If a man knows not to which port he sails, no wind is favorable.
True happiness is to enjoy the present, without anxious dependence upon the future, not to amuse ourselves with either hopes or fears but to rest satisfied with what we have, which is sufficient.
Difficulties strengthen the mind, as labor does the body.
Associate with people who are likely to improve you.`,
  },
  {
    label: "Virginia Woolf",
    icon: "🌸",
    author: "Virginia Woolf",
    source: "A Room of One's Own",
    category: "Literature",
    text: `A woman must have money and a room of her own if she is to write fiction.
Lock up your libraries if you like; but there is no gate, no lock, no bolt that you can set upon the freedom of my mind.
One cannot think well, love well, sleep well, if one has not dined well.
No need to hurry. No need to sparkle. No need to be anybody but oneself.
As long as you write what you wish to write, that is all that matters; and whether it matters for ages or only for hours, nobody can say.`,
  },
]

export function UnstructuredTextExtractor({
  authors,
  categories,
  defaultCategoryId,
  defaultAuthorId,
  publishByDefault = false,
  onSendToPayload,
  onDirectImport,
}: UnstructuredTextExtractorProps) {
  const [text, setText] = useState("")
  const [hintAuthorName, setHintAuthorName] = useState("")
  const [hintSourceTitle, setHintSourceTitle] = useState("")
  const [hintCategoryName, setHintCategoryName] = useState("")
  const [maxQuotes, setMaxQuotes] = useState(15)

  const [candidates, setCandidates] = useState<ExtractedQuoteCandidate[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionError, setExtractionError] = useState<string | null>(null)
  const [provider, setProvider] = useState<"gemini" | "heuristic" | null>(null)
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null)

  const [isPendingDirectImport, startDirectImportTransition] = useTransition()
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

  const handleApplyPreset = (preset: SamplePreset) => {
    setText(preset.text)
    setHintAuthorName(preset.author)
    setHintSourceTitle(preset.source)
    setHintCategoryName(preset.category)
    setExtractionError(null)
    showNotification("info", `Loaded sample: ${preset.label} (${preset.source})`)
  }

  const handleClear = () => {
    setText("")
    setCandidates([])
    setSelectedIds(new Set())
    setExtractionError(null)
    setProvider(null)
  }

  const handleExtract = async () => {
    const trimmed = text.trim()
    if (!trimmed) {
      setExtractionError("Please paste or type raw text before running the extractor.")
      return
    }

    setIsExtracting(true)
    setExtractionError(null)
    setNotification(null)

    try {
      const response = await fetch("/api/admin/quotes/extract-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          hintAuthorName: hintAuthorName.trim() || undefined,
          hintSourceTitle: hintSourceTitle.trim() || undefined,
          hintCategoryName: hintCategoryName.trim() || undefined,
          maxQuotes: Number(maxQuotes) || 15,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || `Extraction request failed (${response.status})`)
      }

      if (!data || !Array.isArray(data.candidates)) {
        throw new Error("Invalid response format received from extraction service")
      }

      const extractedCandidates = data.candidates as ExtractedQuoteCandidate[]
      setCandidates(extractedCandidates)
      setProvider(data.provider || "gemini")

      // By default select all extracted candidates
      setSelectedIds(new Set(extractedCandidates.map((c) => c.id)))

      if (extractedCandidates.length === 0) {
        setExtractionError("No standalone quotes could be identified in the provided text.")
      } else {
        showNotification(
          "success",
          `Successfully extracted ${extractedCandidates.length} quotation${
            extractedCandidates.length === 1 ? "" : "s"
          }!`
        )
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to extract quotations"
      setExtractionError(message)
    } finally {
      setIsExtracting(false)
    }
  }

  const handleToggleCandidate = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleToggleAll = () => {
    if (selectedIds.size === candidates.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(candidates.map((c) => c.id)))
    }
  }

  const handleUpdateCandidate = (id: string, updates: Partial<ExtractedQuoteCandidate>) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    )
  }

  const handleRemoveCandidate = (id: string) => {
    setCandidates((prev) => prev.filter((c) => c.id !== id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const mapSelectedToPayload = (): ImportItemPayload[] => {
    const selectedList = candidates.filter((c) => selectedIds.has(c.id))

    return selectedList.map((candidate) => {
      const authorId = candidate.authorId || defaultAuthorId || undefined
      const categoryId = candidate.categoryId || defaultCategoryId || undefined

      return {
        content: candidate.content.trim(),
        meaning: candidate.meaning?.trim() || undefined,
        authorName: candidate.authorName.trim(),
        authorId,
        categoryName: candidate.categoryName.trim(),
        categoryId,
        sourceTitle: candidate.sourceTitle?.trim() || undefined,
        sourceType: candidate.sourceType || "BOOK",
        tagNames: candidate.tags.length ? candidate.tags : undefined,
        tagIds: candidate.tagIds.length ? candidate.tagIds : undefined,
        publish: publishByDefault,
      }
    })
  }

  const handleSendToPayloadClick = () => {
    const payloadItems = mapSelectedToPayload()
    if (payloadItems.length === 0) {
      setExtractionError("Please select at least one quote candidate to populate.")
      return
    }

    onSendToPayload(payloadItems)
    showNotification(
      "success",
      `Sent ${payloadItems.length} quote${
        payloadItems.length === 1 ? "" : "s"
      } to Ingestion Payload below.`
    )
  }

  const handleDirectImportClick = () => {
    const payloadItems = mapSelectedToPayload()
    if (payloadItems.length === 0) {
      setExtractionError("Please select at least one quote candidate to import.")
      return
    }

    if (!onDirectImport) {
      showNotification("error", "Direct import action is not available.")
      return
    }

    startDirectImportTransition(async () => {
      try {
        await onDirectImport(payloadItems)
        showNotification(
          "success",
          `Direct bulk import of ${payloadItems.length} quotes initiated!`
        )
      } catch (err) {
        showNotification(
          "error",
          err instanceof Error ? err.message : "Direct import failed"
        )
      }
    })
  }

  const handleCopyJson = async () => {
    const payloadItems = mapSelectedToPayload()
    if (payloadItems.length === 0) {
      showNotification("error", "No quotes selected to copy.")
      return
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(payloadItems, null, 2))
      showNotification("success", `Copied ${payloadItems.length} quotes as JSON to clipboard.`)
    } catch {
      showNotification("error", "Failed to copy to clipboard.")
    }
  }

  const selectedCount = selectedIds.size
  const characterCount = text.length
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0

  return (
    <div className="space-y-6">
      {/* Hero / Extractor Control Card */}
      <section className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-base">✨</span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-stone-900">
                AI Unstructured Text Extractor
              </h2>
              <Badge variant="warm" size="xs">
                Gemini Flash
              </Badge>
            </div>
            <p className="text-xs text-stone-500 max-w-2xl">
              Paste raw essays, speeches, interview transcripts, articles, or book excerpts.
              Gemini AI identifies memorable standalone quotations, matches existing authors,
              assigns categories, and balances tags.
            </p>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
            <span className="text-[11px] font-medium text-stone-400 mr-1 hidden lg:inline">
              Sample Excerpts:
            </span>
            {SAMPLE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50/70 px-2.5 py-1 text-[11px] font-medium text-stone-700 hover:bg-stone-100 hover:border-stone-300 transition-all cursor-pointer"
                title={`Load sample excerpt from ${preset.author}`}
              >
                <span>{preset.icon}</span>
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Text Input Area */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-600">
            <label
              htmlFor="unstructured-text-input"
              className="font-semibold uppercase tracking-wider text-stone-700 text-[11px]"
            >
              Raw Source Text
            </label>
            <div className="flex items-center gap-2.5 text-[11px] font-mono text-stone-400">
              <span>{wordCount} words</span>
              <span>•</span>
              <span>{characterCount} chars</span>
              {text && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-stone-500 hover:text-stone-800 underline underline-offset-2 ml-1 cursor-pointer font-sans"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <textarea
            id="unstructured-text-input"
            rows={8}
            className="w-full rounded-xl border border-stone-300 bg-white p-3.5 text-xs text-stone-900 placeholder:text-stone-300 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all font-serif leading-relaxed"
            placeholder="Paste raw speech transcripts, articles, book chapters, letters, or unstructured notes here... e.g. 'Dwell on the beauty of life. Watch the stars, and see yourself running with them...'"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        {/* Extraction Hints & Configuration */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-1">
          {/* Hint Author */}
          <div className="space-y-1">
            <label
              htmlFor="hint-author"
              className="text-[11px] font-semibold uppercase tracking-wider text-stone-600 block"
            >
              Hint Author (Optional)
            </label>
            <input
              id="hint-author"
              type="text"
              list="author-suggestions"
              value={hintAuthorName}
              onChange={(e) => setHintAuthorName(e.target.value)}
              placeholder="e.g. Marcus Aurelius"
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-800 placeholder:text-stone-300 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all"
            />
            <datalist id="author-suggestions">
              {authors.slice(0, 30).map((a) => (
                <option key={a.id} value={a.name} />
              ))}
            </datalist>
          </div>

          {/* Hint Source Title */}
          <div className="space-y-1">
            <label
              htmlFor="hint-source"
              className="text-[11px] font-semibold uppercase tracking-wider text-stone-600 block"
            >
              Hint Source (Optional)
            </label>
            <input
              id="hint-source"
              type="text"
              value={hintSourceTitle}
              onChange={(e) => setHintSourceTitle(e.target.value)}
              placeholder="e.g. Meditations, Book IV"
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-800 placeholder:text-stone-300 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all"
            />
          </div>

          {/* Hint Category */}
          <div className="space-y-1">
            <label
              htmlFor="hint-category"
              className="text-[11px] font-semibold uppercase tracking-wider text-stone-600 block"
            >
              Hint Category (Optional)
            </label>
            <select
              id="hint-category"
              value={hintCategoryName}
              onChange={(e) => setHintCategoryName(e.target.value)}
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-800 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all"
            >
              <option value="">Auto-detect category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Max Quotes */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="max-quotes"
                className="text-[11px] font-semibold uppercase tracking-wider text-stone-600 block"
              >
                Max Quotes
              </label>
              <span className="text-[11px] font-mono text-stone-500 font-bold">{maxQuotes}</span>
            </div>
            <input
              id="max-quotes"
              type="range"
              min={1}
              max={40}
              value={maxQuotes}
              onChange={(e) => setMaxQuotes(Number(e.target.value))}
              className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-900 mt-2.5"
            />
          </div>
        </div>

        {/* Action Trigger */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-stone-100">
          <div className="text-xs text-stone-500">
            {isExtracting ? (
              <span className="inline-flex items-center gap-2 text-stone-700 font-medium animate-pulse">
                <svg className="h-4 w-4 animate-spin text-stone-800" viewBox="0 0 24 24" fill="none">
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
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Extracting quotes and mapping metadata with Gemini AI...
              </span>
            ) : candidates.length > 0 ? (
              <span className="text-stone-700 font-medium">
                {candidates.length} quote{candidates.length === 1 ? "" : "s"} extracted (
                {selectedCount} selected)
              </span>
            ) : (
              <span>Ready to parse text and extract structured quotes.</span>
            )}
          </div>

          <button
            type="button"
            disabled={isExtracting || !text.trim()}
            onClick={handleExtract}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white shadow-xs hover:bg-black disabled:opacity-40 transition-all cursor-pointer self-end sm:self-auto"
          >
            {isExtracting ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Analyzing Text...</span>
              </>
            ) : (
              <>
                <span>✨</span>
                <span>Extract Quotes with Gemini</span>
              </>
            )}
          </button>
        </div>

        {/* Notifications and Error Banners */}
        {extractionError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700 flex items-center justify-between">
            <span>{extractionError}</span>
            <button
              type="button"
              onClick={() => setExtractionError(null)}
              className="text-red-500 hover:text-red-800 cursor-pointer text-sm font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

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
      </section>

      {/* Extracted Candidates Review & Actions */}
      {candidates.length > 0 && (
        <section className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-5">
          {/* Candidates Header Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-100 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-stone-900">
                  Extracted Candidates ({candidates.length})
                </h3>
                <Badge variant={provider === "gemini" ? "success" : "neutral"} size="xs">
                  {provider === "gemini" ? "Gemini AI Extracted" : "Heuristic Rule-Based"}
                </Badge>
              </div>
              <p className="text-xs text-stone-500">
                Review, edit, or toggle candidates before adding them to your bulk ingest queue.
              </p>
            </div>

            {/* Selection and Action Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleAll}
                className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-all cursor-pointer"
              >
                {selectedCount === candidates.length ? "Deselect All" : "Select All"}
              </button>
              <button
                type="button"
                onClick={handleCopyJson}
                disabled={selectedCount === 0}
                className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40 transition-all cursor-pointer inline-flex items-center gap-1"
                title="Copy selected quotes as JSON"
              >
                <span>📋</span>
                <span>Copy JSON</span>
              </button>
            </div>
          </div>

          {/* Action Ribbon: Send to Payload or Direct Import */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-stone-200/70 bg-stone-50/60 p-3.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-stone-800">
                {selectedCount} of {candidates.length} quotes selected
              </span>
              {selectedCount === 0 && (
                <span className="text-xs text-amber-600 font-medium">
                  (Select at least one quote to proceed)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {onDirectImport && (
                <button
                  type="button"
                  disabled={selectedCount === 0 || isPendingDirectImport}
                  onClick={handleDirectImportClick}
                  className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-stone-800 shadow-2xs hover:bg-stone-50 disabled:opacity-40 transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  {isPendingDirectImport ? (
                    <>
                      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <span>⚡</span>
                      <span>Import Directly ({selectedCount})</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                disabled={selectedCount === 0}
                onClick={handleSendToPayloadClick}
                className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-xs hover:bg-black disabled:opacity-40 transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>📥</span>
                <span>Send {selectedCount} Quotes to Ingest Payload</span>
              </button>
            </div>
          </div>

          {/* Candidate Cards List */}
          <div className="space-y-3.5">
            {candidates.map((candidate, idx) => {
              const isSelected = selectedIds.has(candidate.id)
              const isEditing = editingCandidateId === candidate.id

              return (
                <div
                  key={candidate.id}
                  className={`rounded-xl border p-4 transition-all duration-200 ${
                    isSelected
                      ? "border-stone-800/80 bg-white shadow-2xs"
                      : "border-stone-200 bg-stone-50/40 opacity-70 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      aria-label={`Select candidate ${idx + 1}`}
                      checked={isSelected}
                      onChange={() => handleToggleCandidate(candidate.id)}
                      className="mt-1 h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900 cursor-pointer"
                    />

                    {/* Content & Metadata */}
                    <div className="flex-1 space-y-2.5 min-w-0">
                      {/* Quote Content: Display or Edit Mode */}
                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            rows={3}
                            value={candidate.content}
                            onChange={(e) =>
                              handleUpdateCandidate(candidate.id, { content: e.target.value })
                            }
                            className="w-full rounded-lg border border-stone-300 p-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 font-serif"
                          />
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={candidate.authorName}
                              onChange={(e) =>
                                handleUpdateCandidate(candidate.id, {
                                  authorName: e.target.value,
                                })
                              }
                              placeholder="Author Name"
                              className="rounded-lg border border-stone-300 px-2 py-1 text-xs text-stone-800"
                            />
                            <input
                              type="text"
                              value={candidate.sourceTitle || ""}
                              onChange={(e) =>
                                handleUpdateCandidate(candidate.id, {
                                  sourceTitle: e.target.value,
                                })
                              }
                              placeholder="Source Title"
                              className="rounded-lg border border-stone-300 px-2 py-1 text-xs text-stone-800"
                            />
                            <button
                              type="button"
                              onClick={() => setEditingCandidateId(null)}
                              className="rounded-lg bg-stone-900 px-2.5 py-1 text-[11px] font-semibold text-white cursor-pointer ml-auto"
                            >
                              Done Editing
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="font-serif italic text-stone-900 text-sm leading-relaxed">
                            &ldquo;{candidate.content}&rdquo;
                          </p>
                          {candidate.meaning && (
                            <p className="text-xs text-stone-500 font-sans leading-normal">
                              <span className="font-semibold text-stone-600">Meaning:</span>{" "}
                              {candidate.meaning}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Metadata Badges Ribbon */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                        {/* Author Match Status */}
                        {candidate.authorId ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800 border border-emerald-200">
                            <span>✓</span>
                            <span>{candidate.authorName}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-0.5 font-medium text-stone-700 border border-stone-200">
                            <span>+</span>
                            <span>{candidate.authorName} (New Author)</span>
                          </span>
                        )}

                        {/* Category */}
                        <span className="rounded-md bg-stone-100 px-2 py-0.5 text-stone-600 font-medium">
                          📚 {candidate.categoryName}
                        </span>

                        {/* Source Title & Type */}
                        {candidate.sourceTitle && (
                          <span className="rounded-md bg-stone-100 px-2 py-0.5 text-stone-600 font-medium">
                            📖 {candidate.sourceTitle} ({candidate.sourceType})
                          </span>
                        )}

                        {/* Balanced Tags */}
                        {candidate.tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md bg-stone-50 px-1.5 py-0.5 text-stone-500 border border-stone-200/70"
                          >
                            #{tag}
                          </span>
                        ))}

                        {/* Confidence Score */}
                        {typeof candidate.confidence === "number" && (
                          <span className="rounded-md bg-amber-50 px-2 py-0.5 font-mono text-amber-800 border border-amber-200/80 ml-auto text-[10px]">
                            {Math.round(candidate.confidence * 100)}% match
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex flex-col items-end gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingCandidateId((cur) => (cur === candidate.id ? null : candidate.id))
                        }
                        className="rounded-lg p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                        title={isEditing ? "Close editor" : "Edit candidate"}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveCandidate(candidate.id)}
                        className="rounded-lg p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Remove candidate from list"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
