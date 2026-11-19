"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button, Badge } from "@/components/ui"
import { CloseIcon, CopyIcon, CheckIcon } from "@/components/ui/icons"
import type { BioTone, BioLength, BioPerspective } from "@/lib/authors/bio-generator"

export interface AuthorBioGeneratorModalProps {
  isOpen: boolean
  onClose: () => void
  author: {
    id?: string
    name: string
    profession?: string | null
    nationality?: string | null
    birthYear?: number | string | null
    deathYear?: number | string | null
    currentBio?: string | null
  }
  onApplyBio: (bio: string) => void
}

export function AuthorBioGeneratorModal(props: AuthorBioGeneratorModalProps) {
  if (!props.isOpen) return null
  return <AuthorBioModalInner {...props} />
}

function AuthorBioModalInner({
  onClose,
  author,
  onApplyBio,
}: AuthorBioGeneratorModalProps) {
  const [tone, setTone] = useState<BioTone>("humanized")
  const [perspective, setPerspective] = useState<BioPerspective>("literary")
  const [length, setLength] = useState<BioLength>("balanced")
  const [generatedBio, setGeneratedBio] = useState(author.currentBio || "")
  const [seoDescription, setSeoDescription] = useState("")
  const [keyThemes, setKeyThemes] = useState<string[]>([])
  const [notableWorks, setNotableWorks] = useState<string[]>([])
  const [provider, setProvider] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  function handleStopStream() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsStreaming(false)
  }

  async function handleStartStream() {
    if (!author.name.trim()) return

    setError(null)
    setIsStreaming(true)
    setGeneratedBio("")
    setSeoDescription("")
    setKeyThemes([])
    setNotableWorks([])
    setProvider(null)

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const res = await fetch("/api/admin/authors/generate-bio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          authorId: author.id,
          name: author.name.trim(),
          profession: author.profession,
          nationality: author.nationality,
          birthYear: author.birthYear ? Number(author.birthYear) : undefined,
          deathYear: author.deathYear ? Number(author.deathYear) : undefined,
          tone,
          perspective,
          length,
          stream: true,
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to generate author biography")
      }

      if (!res.body) {
        throw new Error("No readable response body received")
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let sseBuffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        sseBuffer += decoder.decode(value, { stream: true })
        const lines = sseBuffer.split("\n")
        sseBuffer = lines.pop() ?? ""

        let currentEvent = "message"

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) {
            currentEvent = "message"
            continue
          }

          if (trimmed.startsWith("event:")) {
            currentEvent = trimmed.slice(6).trim()
            continue
          }

          if (trimmed.startsWith("data:")) {
            const jsonStr = trimmed.slice(5).trim()
            if (!jsonStr) continue

            try {
              const data = JSON.parse(jsonStr)

              if (currentEvent === "start") {
                setProvider(data.provider === "gemini" ? "Google Gemini AI" : "Curator Knowledge Engine")
              } else if (currentEvent === "delta") {
                setGeneratedBio((prev) => prev + data.text)
              } else if (currentEvent === "complete_bio") {
                setGeneratedBio(data.bio)
              } else if (currentEvent === "done") {
                if (data.bio) setGeneratedBio(data.bio)
                if (data.seoDescription) setSeoDescription(data.seoDescription)
                if (Array.isArray(data.keyThemes)) setKeyThemes(data.keyThemes)
                if (Array.isArray(data.notableWorks)) setNotableWorks(data.notableWorks)
                setProvider(data.provider === "gemini" ? "Google Gemini AI" : "Curator Knowledge Engine")
              }
            } catch {
              // Ignore non-json lines
            }
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== "AbortError") {
        setError(err instanceof Error ? err.message : "Failed to generate biography")
      }
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }

  function handleCopy() {
    if (!generatedBio) return
    navigator.clipboard.writeText(generatedBio)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  function handleApply() {
    if (!generatedBio.trim()) return
    onApplyBio(generatedBio.trim())
    onClose()
  }

  const wordCount = generatedBio.trim() ? generatedBio.trim().split(/\s+/).length : 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="author-bio-studio-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (!isStreaming) onClose()
        }}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-stone-200/90 overflow-hidden flex flex-col max-h-[92vh] font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-200 bg-gradient-to-r from-stone-50 via-white to-violet-50/30">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">✨</span>
              <h2 id="author-bio-studio-title" className="text-base font-bold text-stone-900 tracking-tight">
                AI Author Bio Studio
              </h2>
              <Badge variant="neutral" size="xs">
                Humanized &amp; SEO-Optimized
              </Badge>
              {provider && (
                <span className="text-[11px] font-mono text-violet-700 bg-violet-100/70 px-2 py-0.5 rounded-full">
                  via {provider}
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 max-w-xl">
              Generates literary, human-centered author narratives without robotic Wikipedia chronology or AI clichés.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isStreaming}
            className="rounded-full p-1.5 text-stone-400 hover:bg-stone-200/70 hover:text-stone-700 transition cursor-pointer"
            aria-label="Close"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Tone, Length & Perspective Selectors */}
        <div className="px-6 py-3.5 bg-stone-50/80 border-b border-stone-200/80 space-y-2.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Tone Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-stone-500 font-medium uppercase tracking-wider text-[10px]">
                Tone:
              </span>
              <div className="inline-flex bg-white p-0.5 rounded-lg border border-stone-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setTone("humanized")}
                  disabled={isStreaming}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                    tone === "humanized"
                      ? "bg-violet-600 text-white shadow-2xs font-semibold"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Humanized (Literary)
                </button>
                <button
                  type="button"
                  onClick={() => setTone("philosophical")}
                  disabled={isStreaming}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                    tone === "philosophical"
                      ? "bg-violet-600 text-white shadow-2xs font-semibold"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Philosophical &amp; Deep
                </button>
                <button
                  type="button"
                  onClick={() => setTone("punchy")}
                  disabled={isStreaming}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                    tone === "punchy"
                      ? "bg-violet-600 text-white shadow-2xs font-semibold"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Punchy &amp; Modern
                </button>
              </div>
            </div>

            {/* Length Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-stone-500 font-medium uppercase tracking-wider text-[10px]">
                Length:
              </span>
              <div className="inline-flex bg-white p-0.5 rounded-lg border border-stone-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setLength("concise")}
                  disabled={isStreaming}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                    length === "concise"
                      ? "bg-stone-900 text-white font-semibold"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Concise (1 Par.)
                </button>
                <button
                  type="button"
                  onClick={() => setLength("balanced")}
                  disabled={isStreaming}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                    length === "balanced"
                      ? "bg-stone-900 text-white font-semibold"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Balanced (2 Par.)
                </button>
                <button
                  type="button"
                  onClick={() => setLength("comprehensive")}
                  disabled={isStreaming}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                    length === "comprehensive"
                      ? "bg-stone-900 text-white font-semibold"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Comprehensive (3 Par.)
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-stone-200/60">
            {/* Perspective / Angle Selector */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-stone-500 font-medium uppercase tracking-wider text-[10px]">
                Angle:
              </span>
              <div className="inline-flex flex-wrap bg-white p-0.5 rounded-lg border border-stone-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setPerspective("literary")}
                  disabled={isStreaming}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                    perspective === "literary"
                      ? "bg-amber-600 text-white font-semibold shadow-2xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Literary Profile
                </button>
                <button
                  type="button"
                  onClick={() => setPerspective("crucible")}
                  disabled={isStreaming}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                    perspective === "crucible"
                      ? "bg-amber-600 text-white font-semibold shadow-2xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Crucible &amp; Origins
                </button>
                <button
                  type="button"
                  onClick={() => setPerspective("modern")}
                  disabled={isStreaming}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                    perspective === "modern"
                      ? "bg-amber-600 text-white font-semibold shadow-2xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Modern Relevance
                </button>
                <button
                  type="button"
                  onClick={() => setPerspective("paradox")}
                  disabled={isStreaming}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                    perspective === "paradox"
                      ? "bg-amber-600 text-white font-semibold shadow-2xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Human Paradox
                </button>
              </div>
            </div>

            {/* Generate / Interupt Control */}
            <div>
              {isStreaming ? (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={handleStopStream}
                  className="border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 font-semibold cursor-pointer"
                >
                  ⏹ Stop Stream
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  size="xs"
                  onClick={handleStartStream}
                  className="bg-violet-600 hover:bg-violet-700 font-semibold cursor-pointer shadow-2xs"
                >
                  ⚡ Generate Bio Stream
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 font-medium">
              {error}
            </div>
          )}

          {/* Biography Textarea with Live Streaming Feedback */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-800">
                  Narrative Biography
                </label>
                {isStreaming && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-700 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-ping" />
                    Streaming live tokens...
                  </span>
                )}
              </div>
              <span className="text-[11px] font-mono text-stone-400">
                {wordCount} words • {generatedBio.length} characters
              </span>
            </div>

            <textarea
              rows={9}
              value={generatedBio}
              onChange={(e) => setGeneratedBio(e.target.value)}
              placeholder="Click 'Generate Bio Stream' to write an insightful, humanized biography for this author..."
              className={`w-full rounded-xl border p-4 text-sm font-serif leading-relaxed text-stone-900 placeholder:text-stone-400 placeholder:font-sans focus:outline-hidden transition-all duration-200 ${
                isStreaming
                  ? "border-violet-500 ring-2 ring-violet-200 bg-violet-50/10"
                  : "border-stone-300 focus:border-stone-900 focus:ring-1 focus:ring-stone-900 bg-white"
              }`}
            />
          </div>

          {/* Google SERP Snippet Preview */}
          <div className="rounded-xl border border-stone-200/90 bg-stone-50/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500">
                Google Search Result (SERP) Mockup Preview
              </span>
              <span className="text-[10px] font-mono text-stone-400">
                {seoDescription.length || Math.min(160, generatedBio.length)} / 160 chars
              </span>
            </div>

            <div className="space-y-1 bg-white p-3.5 rounded-lg border border-stone-200/80 shadow-2xs font-sans">
              <div className="flex items-center gap-1.5 text-xs text-stone-600">
                <span className="text-stone-400 font-mono text-[11px]">https://quotzen.com › authors ›</span>
                <span className="font-semibold text-stone-700">{author.name.toLowerCase().replace(/\s+/g, "-")}</span>
              </div>
              <h4 className="text-sm font-semibold text-blue-700 hover:underline cursor-pointer">
                {author.name} Quotes &amp; Philosophy | Quotzen
              </h4>
              <p className="text-xs text-stone-600 leading-relaxed line-clamp-2">
                {seoDescription ||
                  (generatedBio
                    ? generatedBio.slice(0, 155).replace(/\n+/g, " ") + "..."
                    : `Explore the life, philosophy, and timeless quotes by ${author.name}. Discover curated insights on resilience, purpose, and wisdom.`)}
              </p>
            </div>
          </div>

          {/* Key Themes & Motifs Tags */}
          {(keyThemes.length > 0 || notableWorks.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {keyThemes.length > 0 && (
                <div className="rounded-xl border border-stone-200 bg-white p-3 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                    Core Philosophical Themes
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {keyThemes.map((theme) => (
                      <span
                        key={theme}
                        className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[11px] font-medium"
                      >
                        #{theme}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {notableWorks.length > 0 && (
                <div className="rounded-xl border border-stone-200 bg-white p-3 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                    Notable Publications / Sources
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {notableWorks.map((work) => (
                      <span
                        key={work}
                        className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200/70 text-[11px] font-medium"
                      >
                        📖 {work}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-200 bg-stone-50/80">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!generatedBio}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 disabled:opacity-40 cursor-pointer"
          >
            {isCopied ? <CheckIcon className="w-3.5 h-3.5 text-emerald-600" /> : <CopyIcon className="w-3.5 h-3.5" />}
            <span>{isCopied ? "Copied to clipboard!" : "Copy Biography"}</span>
          </button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isStreaming}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleApply}
              disabled={isStreaming || !generatedBio.trim()}
              className="bg-stone-900 hover:bg-black font-semibold shadow-2xs cursor-pointer"
            >
              Apply to Biography
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
