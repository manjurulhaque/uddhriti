"use client"

import React, { useState, useRef, useEffect, useMemo } from "react"
import { Button, Badge } from "@/components/ui"
import { CloseIcon, CopyIcon, CheckIcon } from "@/components/ui/icons"
import { computeWordDiff, type DiffPart } from "@/lib/diff"
import type { BioTone, BioLength, BioPerspective, CompanionThinkers, AuthorFaqItem } from "@/lib/authors/bio-generator"

export interface AuthorBioGeneratorModalProps {
  isOpen: boolean
  onClose: () => void
  author: {
    id?: string
    name: string
    slug?: string | null
    profession?: string | null
    nationality?: string | null
    birthYear?: number | string | null
    deathYear?: number | string | null
    wikipediaUrl?: string | null
    wikidataId?: string | null
    currentBio?: string | null
  }
  onApplyBio: (bio: string) => void
}

export function AuthorBioGeneratorModal(props: AuthorBioGeneratorModalProps) {
  if (!props.isOpen) return null
  return <AuthorBioModalInner {...props} />
}

function renderDiffInline(parts: DiffPart[], mode: "orig" | "prop") {
  return parts.map((part, idx) => {
    if (mode === "orig") {
      if (part.type === "added") return null
      if (part.type === "removed") {
        return (
          <mark
            key={idx}
            className="bg-rose-100 text-rose-900 line-through rounded px-0.5 py-0.2 mx-0.5"
          >
            {part.value}
          </mark>
        )
      }
      return <span key={idx}>{part.value}</span>
    }

    if (mode === "prop") {
      if (part.type === "removed") return null
      if (part.type === "added") {
        return (
          <mark
            key={idx}
            className="bg-emerald-100 text-emerald-950 font-medium rounded px-0.5 py-0.2 mx-0.5"
          >
            {part.value}
          </mark>
        )
      }
      return <span key={idx}>{part.value}</span>
    }

    return <span key={idx}>{part.value}</span>
  })
}

const PARAGRAPH_ROLES = [
  { index: 0, label: "Hook & Core Dilemma", desc: "Introductory thesis, intellectual dilemma, and historical context" },
  { index: 1, label: "Philosophy, Quotes & Works", desc: "Seminal writings, anchored quote, and moral framework" },
  { index: 2, label: "Modern Resonance & Challenge", desc: "Relevance today and lasting challenge to the reader" },
]

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
  const [companionThinkers, setCompanionThinkers] = useState<CompanionThinkers | null>(null)
  const [faqs, setFaqs] = useState<AuthorFaqItem[]>([])
  const [isPublishingFaqs, setIsPublishingFaqs] = useState(false)
  const [faqsPublished, setFaqsPublished] = useState(false)
  const [isFaqCopied, setIsFaqCopied] = useState(false)
  const [provider, setProvider] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [isSeoCopied, setIsSeoCopied] = useState(false)
  const [thesis, setThesis] = useState("")
  const [crucible, setCrucible] = useState("")
  const [isThesisCopied, setIsThesisCopied] = useState(false)
  const [isCrucibleCopied, setIsCrucibleCopied] = useState(false)
  const [calloutsInserted, setCalloutsInserted] = useState(false)

  // Pillar 4 Admin UX State: Diff / Merge & Paragraph Regeneration
  const [viewMode, setViewMode] = useState<"editor" | "diff">("editor")
  const [proposedBioSnapshot, setProposedBioSnapshot] = useState(author.currentBio || "")
  const [editingParagraphIndex, setEditingParagraphIndex] = useState<number | null>(null)
  const [regeneratingParagraphIndex, setRegeneratingParagraphIndex] = useState<number | null>(null)
  const [paragraphInstruction, setParagraphInstruction] = useState("")

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
    setCompanionThinkers(null)
    setFaqs([])
    setFaqsPublished(false)
    setThesis("")
    setCrucible("")
    setCalloutsInserted(false)
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
          wikipediaUrl: author.wikipediaUrl,
          wikidataId: author.wikidataId,
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
                setProposedBioSnapshot(data.bio)
              } else if (currentEvent === "done") {
                if (data.bio) {
                  setGeneratedBio(data.bio)
                  setProposedBioSnapshot(data.bio)
                }
                if (data.seoDescription) setSeoDescription(data.seoDescription)
                if (Array.isArray(data.keyThemes)) setKeyThemes(data.keyThemes)
                if (Array.isArray(data.notableWorks)) setNotableWorks(data.notableWorks)
                if (data.companionThinkers && typeof data.companionThinkers === "object") {
                  setCompanionThinkers(data.companionThinkers)
                }
                if (Array.isArray(data.faqs)) {
                  setFaqs(data.faqs)
                }
                if (typeof data.thesis === "string") {
                  setThesis(data.thesis)
                }
                if (typeof data.crucible === "string") {
                  setCrucible(data.crucible)
                }
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

  async function handleRegenerateParagraph(pIndex: number, instructionText: string) {
    if (!author.name.trim()) return

    setRegeneratingParagraphIndex(pIndex)
    setError(null)

    try {
      const res = await fetch("/api/admin/authors/generate-bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorId: author.id,
          name: author.name.trim(),
          profession: author.profession,
          nationality: author.nationality,
          birthYear: author.birthYear ? Number(author.birthYear) : undefined,
          deathYear: author.deathYear ? Number(author.deathYear) : undefined,
          wikipediaUrl: author.wikipediaUrl,
          wikidataId: author.wikidataId,
          paragraphIndex: pIndex,
          currentBio: generatedBio,
          instruction: instructionText,
          tone,
          perspective,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || "Failed to regenerate paragraph")
      }

      if (data.fullBio) {
        setGeneratedBio(data.fullBio)
        setProposedBioSnapshot(data.fullBio)
      } else if (data.paragraph) {
        const paras = generatedBio.split(/\n\n+/).filter(Boolean)
        paras[pIndex] = data.paragraph
        const joined = paras.join("\n\n")
        setGeneratedBio(joined)
        setProposedBioSnapshot(joined)
      }
      setEditingParagraphIndex(null)
      setParagraphInstruction("")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to regenerate paragraph")
    } finally {
      setRegeneratingParagraphIndex(null)
    }
  }

  function handleKeepOriginalParagraph(pIndex: number) {
    const origParas = (author.currentBio || "").split(/\n\n+/).filter(Boolean)
    const currentParas = generatedBio.split(/\n\n+/).filter(Boolean)
    if (origParas[pIndex]) {
      currentParas[pIndex] = origParas[pIndex]
      setGeneratedBio(currentParas.join("\n\n"))
    }
  }

  function handleUseProposedParagraph(pIndex: number, proposedText: string) {
    const currentParas = generatedBio.split(/\n\n+/).filter(Boolean)
    currentParas[pIndex] = proposedText
    setGeneratedBio(currentParas.join("\n\n"))
  }

  function handleAcceptAllProposed() {
    if (proposedBioSnapshot) {
      setGeneratedBio(proposedBioSnapshot)
    }
  }

  function handleRevertAllToOriginal() {
    if (author.currentBio) {
      setGeneratedBio(author.currentBio)
    }
  }

  const hasOriginalBio = Boolean(author.currentBio && author.currentBio.trim().length > 0)
  const origParas = useMemo(
    () => (author.currentBio || "").split(/\n\n+/).filter(Boolean),
    [author.currentBio]
  )
  const proposedParas = useMemo(
    () => (proposedBioSnapshot || generatedBio).split(/\n\n+/).filter(Boolean),
    [proposedBioSnapshot, generatedBio]
  )
  const diffParagraphCount = Math.max(origParas.length, proposedParas.length, 1)

  const diffParagraphs = useMemo(() => {
    const list = []
    for (let i = 0; i < diffParagraphCount; i++) {
      const orig = origParas[i] || ""
      const prop = proposedParas[i] || ""
      const diffParts = computeWordDiff(orig, prop)
      const role = PARAGRAPH_ROLES[i] || {
        index: i,
        label: `Paragraph ${i + 1}`,
        desc: "Narrative paragraph",
      }
      list.push({
        index: i,
        roleLabel: role.label,
        origText: orig,
        proposedText: prop,
        diffParts,
      })
    }
    return list
  }, [diffParagraphCount, origParas, proposedParas])

  const paragraphs = useMemo(
    () => generatedBio.split(/\n\n+/).filter(Boolean),
    [generatedBio]
  )

  function handleCopy() {
    if (!generatedBio) return
    navigator.clipboard.writeText(generatedBio)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  function handleCopySeo() {
    const textToCopy =
      seoDescription || (generatedBio ? generatedBio.slice(0, 155).replace(/\n+/g, " ") : "")
    if (!textToCopy) return
    navigator.clipboard.writeText(textToCopy)
    setIsSeoCopied(true)
    setTimeout(() => setIsSeoCopied(false), 2000)
  }

  function handleCopyThesis() {
    if (!thesis) return
    navigator.clipboard.writeText(thesis)
    setIsThesisCopied(true)
    setTimeout(() => setIsThesisCopied(false), 2000)
  }

  function handleCopyCrucible() {
    if (!crucible) return
    navigator.clipboard.writeText(crucible)
    setIsCrucibleCopied(true)
    setTimeout(() => setIsCrucibleCopied(false), 2000)
  }

  function handleInsertCalloutsToBio() {
    if (!thesis && !crucible) return

    const calloutLines: string[] = []
    if (thesis) {
      calloutLines.push(`> **Core Worldview**: *${thesis}*`)
    }
    if (crucible) {
      calloutLines.push(`> **Defining Crucible**: *${crucible}*`)
    }
    const calloutsBlock = calloutLines.join("\n>\n")

    setGeneratedBio((prev) => {
      // If callouts already exist at top of bio, replace them cleanly
      const cleanPrev = prev.replace(/^(?:> \*\*(?:Core Worldview|Defining Crucible)\*\*:[^\n]*(?:\n>)?\n*)+/, "").trim()
      const updated = cleanPrev ? `${calloutsBlock}\n\n${cleanPrev}` : calloutsBlock
      setProposedBioSnapshot(updated)
      return updated
    })

    setCalloutsInserted(true)
    setTimeout(() => setCalloutsInserted(false), 2500)
  }

  async function handleCopyFaqs() {
    if (faqs.length === 0) return
    const schemaData = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: f.answer,
        },
      })),
    }
    await navigator.clipboard.writeText(JSON.stringify(schemaData, null, 2))
    setIsFaqCopied(true)
    setTimeout(() => setIsFaqCopied(false), 2000)
  }

  async function handlePublishFaqs() {
    if (faqs.length === 0) return
    const slug =
      author.slug ||
      author.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
    if (!slug) return

    setIsPublishingFaqs(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/faqs/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: faqs.map((f, idx) => ({
            question: f.question,
            answer: f.answer,
            pageType: "AUTHOR",
            pageSlug: slug,
            position: idx,
          })),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to publish FAQs")
      }
      setFaqsPublished(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish FAQs")
    } finally {
      setIsPublishingFaqs(false)
    }
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-gradient-to-r from-stone-50 via-white to-violet-50/30">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">✨</span>
              <h2 id="author-bio-studio-title" className="text-base font-bold text-stone-900 tracking-tight">
                AI Author Bio Studio: {author.name}
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

          <div className="flex items-center gap-3">
            {/* View Mode Toggle: Studio Editor vs Diff/Merge */}
            {hasOriginalBio && (
              <div className="inline-flex bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                <button
                  type="button"
                  onClick={() => setViewMode("editor")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${viewMode === "editor"
                    ? "bg-white text-stone-900 shadow-2xs font-semibold"
                    : "text-stone-600 hover:text-stone-900"
                    }`}
                >
                  ✍️ Studio
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("diff")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${viewMode === "diff"
                    ? "bg-white text-stone-900 shadow-2xs font-semibold"
                    : "text-stone-600 hover:text-stone-900"
                    }`}
                >
                  <span>⚖️ Diff &amp; Merge</span>
                  {generatedBio !== author.currentBio && (
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-600" />
                  )}
                </button>
              </div>
            )}

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
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${tone === "humanized"
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
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${tone === "philosophical"
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
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${tone === "punchy"
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
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${length === "concise"
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
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${length === "balanced"
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
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${length === "comprehensive"
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
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${perspective === "literary"
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
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${perspective === "crucible"
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
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${perspective === "modern"
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
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${perspective === "paradox"
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

          {viewMode === "diff" && hasOriginalBio ? (
            /* Side-by-Side Diff & Merge View */
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-stone-100/70 border border-stone-200 rounded-xl text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-stone-700">Diff Comparison:</span>
                  <span className="text-stone-500 font-mono text-[11px]">
                    Original ({author.currentBio?.split(/\s+/).length || 0} words) vs Proposed ({(proposedBioSnapshot || generatedBio).split(/\s+/).length} words)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAcceptAllProposed}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition cursor-pointer text-xs shadow-2xs"
                  >
                    Accept All Proposed
                  </button>
                  <button
                    type="button"
                    onClick={handleRevertAllToOriginal}
                    className="px-2.5 py-1 rounded-lg bg-stone-200 text-stone-700 font-medium hover:bg-stone-300 transition cursor-pointer text-xs"
                  >
                    Revert to Original
                  </button>
                </div>
              </div>

              {/* Paragraph Comparison Cards */}
              <div className="space-y-4">
                {diffParagraphs.map((dp) => (
                  <div key={dp.index} className="rounded-xl border border-stone-200 bg-white p-4 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700">
                          P{dp.index + 1}
                        </span>
                        <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                          {dp.roleLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleKeepOriginalParagraph(dp.index)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                        >
                          Keep Original P{dp.index + 1}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUseProposedParagraph(dp.index, dp.proposedText)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer"
                        >
                          Use Proposed P{dp.index + 1}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-serif leading-relaxed">
                      {/* Original with deletions */}
                      <div className="p-3.5 rounded-xl bg-rose-50/40 border border-rose-100 space-y-1.5">
                        <div className="text-[10px] uppercase font-sans font-bold text-rose-700 tracking-wider">
                          Original Text
                        </div>
                        <div className="text-stone-800">
                          {renderDiffInline(dp.diffParts, "orig")}
                        </div>
                      </div>

                      {/* Proposed with additions */}
                      <div className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-100 space-y-1.5">
                        <div className="text-[10px] uppercase font-sans font-bold text-emerald-700 tracking-wider">
                          Proposed Text
                        </div>
                        <div className="text-stone-800">
                          {renderDiffInline(dp.diffParts, "prop")}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Merged Draft Live Textarea */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-800">
                    Merged Biography Draft
                  </label>
                  <span className="text-[11px] font-mono text-stone-400">
                    {wordCount} words • {generatedBio.length} characters
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={generatedBio}
                  onChange={(e) => setGeneratedBio(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 p-3.5 text-sm font-serif leading-relaxed text-stone-900 bg-stone-50/50 focus:bg-white focus:outline-hidden focus:border-stone-900"
                />
              </div>
            </div>
          ) : (
            /* Studio Editor View */
            <>
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
                  className={`w-full rounded-xl border p-4 text-sm font-serif leading-relaxed text-stone-900 placeholder:text-stone-400 placeholder:font-sans focus:outline-hidden transition-all duration-200 ${isStreaming
                    ? "border-violet-500 ring-2 ring-violet-200 bg-violet-50/10"
                    : "border-stone-300 focus:border-stone-900 focus:ring-1 focus:ring-stone-900 bg-white"
                    }`}
                />
              </div>

              {/* Interactive Paragraph Studio */}
              {paragraphs.length > 0 && (
                <div className="rounded-xl border border-stone-200/90 bg-stone-50/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">🔄</span>
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-800">
                        Interactive Paragraph Regeneration
                      </span>
                    </div>
                    <span className="text-[11px] text-stone-500">
                      Rewrite individual paragraphs with targeted editorial context
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {paragraphs.map((paraText, pIdx) => {
                      const role = PARAGRAPH_ROLES[pIdx] || {
                        index: pIdx,
                        label: `Paragraph ${pIdx + 1}`,
                        desc: "Narrative paragraph",
                      }
                      const isEditing = editingParagraphIndex === pIdx
                      const isBusy = regeneratingParagraphIndex === pIdx

                      return (
                        <div
                          key={pIdx}
                          className={`rounded-xl border p-3.5 bg-white transition-all ${isEditing
                            ? "border-violet-400 ring-2 ring-violet-100 shadow-xs"
                            : "border-stone-200 hover:border-stone-300 shadow-2xs"
                            }`}
                        >
                          <div className="flex items-center justify-between pb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-stone-100 text-stone-700">
                                P{pIdx + 1}
                              </span>
                              <span className="text-xs font-semibold text-stone-900">
                                {role.label}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (isEditing) {
                                  setEditingParagraphIndex(null)
                                } else {
                                  setEditingParagraphIndex(pIdx)
                                  setParagraphInstruction("")
                                }
                              }}
                              disabled={isBusy || isStreaming}
                              className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 hover:text-violet-900 px-2 py-0.5 rounded-md hover:bg-violet-50 transition cursor-pointer"
                            >
                              <span>{isEditing ? "Cancel" : "🔄 Regenerate"}</span>
                            </button>
                          </div>

                          <p className="text-xs font-serif text-stone-600 line-clamp-2 leading-relaxed">
                            {paraText}
                          </p>

                          {/* Expanded Regeneration Controls */}
                          {isEditing && (
                            <div className="mt-3 pt-3 border-t border-stone-100 space-y-2.5">
                              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                <span className="text-stone-400 font-medium">Quick presets:</span>
                                {[
                                  "Add more historical context",
                                  "Make punchy and concise",
                                  "Highlight central quote & work",
                                  "Emphasize human contradictions",
                                ].map((preset) => (
                                  <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setParagraphInstruction(preset)}
                                    className={`px-2 py-0.5 rounded-full border text-[11px] transition cursor-pointer ${paragraphInstruction === preset
                                      ? "bg-violet-600 text-white border-violet-600 font-medium"
                                      : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                                      }`}
                                  >
                                    {preset}
                                  </button>
                                ))}
                              </div>

                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={paragraphInstruction}
                                  onChange={(e) => setParagraphInstruction(e.target.value)}
                                  placeholder="Editorial instruction, e.g. 'Focus on his Corsican exile and resilience'..."
                                  className="flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-xs text-stone-900 focus:outline-hidden focus:border-stone-900"
                                />
                                <Button
                                  type="button"
                                  variant="primary"
                                  size="xs"
                                  disabled={isBusy}
                                  onClick={() => handleRegenerateParagraph(pIdx, paragraphInstruction)}
                                  className="bg-violet-600 hover:bg-violet-700 font-semibold cursor-pointer shrink-0"
                                >
                                  {isBusy ? "Rewriting..." : "Rewrite Paragraph"}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Editorial Callouts: Core Worldview & Defining Crucible */}
              {(thesis || crucible) && (
                <div className="rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 via-stone-50/40 to-orange-50/50 p-4 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🏛️</span>
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-amber-900 block">
                          Philosophical Axioms &amp; Defining Crucible
                        </span>
                        <span className="text-[11px] text-stone-500">
                          Memorable one-sentence thesis and formative historical crisis
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        onClick={handleInsertCalloutsToBio}
                        className={`text-[11px] font-semibold transition cursor-pointer ${
                          calloutsInserted
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs"
                            : "bg-white hover:bg-stone-50 text-stone-700 border-stone-200 shadow-2xs"
                        }`}
                      >
                        {calloutsInserted ? (
                          <>
                            <CheckIcon className="w-3 h-3 text-emerald-600 inline mr-1" />
                            <span>Inserted into Bio!</span>
                          </>
                        ) : (
                          <>
                            <span>📌 Insert Callouts into Bio</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Core Worldview Thesis */}
                    {thesis && (
                      <div className="rounded-xl border border-amber-200/90 bg-white p-3.5 space-y-2 shadow-2xs flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                              <span>💡</span> Core Worldview Thesis
                            </span>
                            <button
                              type="button"
                              onClick={handleCopyThesis}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500 hover:text-stone-900 transition cursor-pointer"
                              title="Copy worldview thesis"
                            >
                              {isThesisCopied ? (
                                <>
                                  <CheckIcon className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-700">Copied</span>
                                </>
                              ) : (
                                <>
                                  <CopyIcon className="w-3 h-3 text-stone-400" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <p className="font-serif italic text-stone-900 leading-relaxed text-[12.5px] border-l-2 border-amber-500 pl-2.5 my-1">
                            &ldquo;{thesis}&rdquo;
                          </p>
                        </div>
                        <span className="text-[10px] font-sans text-stone-400 block pt-1 border-t border-stone-100">
                          A single memorable axiom crystallizing the author&apos;s life philosophy.
                        </span>
                      </div>
                    )}

                    {/* Defining Crucible */}
                    {crucible && (
                      <div className="rounded-xl border border-orange-200/90 bg-white p-3.5 space-y-2 shadow-2xs flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-orange-900">
                              <span>⚔️</span> Defining Crucible
                            </span>
                            <button
                              type="button"
                              onClick={handleCopyCrucible}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500 hover:text-stone-900 transition cursor-pointer"
                              title="Copy defining crucible"
                            >
                              {isCrucibleCopied ? (
                                <>
                                  <CheckIcon className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-700">Copied</span>
                                </>
                              ) : (
                                <>
                                  <CopyIcon className="w-3 h-3 text-stone-400" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <p className="font-serif text-stone-800 leading-relaxed text-[12px] border-l-2 border-orange-500 pl-2.5 my-1">
                            {crucible}
                          </p>
                        </div>
                        <span className="text-[10px] font-sans text-stone-400 block pt-1 border-t border-stone-100">
                          The historical crisis, illness, or trial that forged their convictions.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Google SERP Snippet Preview */}
              <div className="rounded-xl border border-stone-200/90 bg-stone-50/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500">
                      Google Search Result (SERP) &amp; Schema.org Preview
                    </span>
                    <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded">
                      JSON-LD Ready
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-stone-400">
                      {seoDescription.length || Math.min(160, generatedBio.length)} / 160 chars
                    </span>
                    <button
                      type="button"
                      onClick={handleCopySeo}
                      disabled={!seoDescription && !generatedBio}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 transition cursor-pointer disabled:opacity-40"
                      title="Copy SEO meta description to clipboard"
                    >
                      {isSeoCopied ? (
                        <>
                          <CheckIcon className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">Copied SERP</span>
                        </>
                      ) : (
                        <>
                          <CopyIcon className="w-3 h-3 text-stone-400" />
                          <span>Copy SERP</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1 bg-white p-3.5 rounded-lg border border-stone-200/80 shadow-2xs font-sans">
                  <div className="flex items-center gap-1.5 text-xs text-stone-600">
                    <span className="text-stone-400 font-mono text-[11px]">https://quotzen.com › authors ›</span>
                    <span className="font-semibold text-stone-700">{author.name.toLowerCase().replace(/\s+/g, "-")}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-blue-700 hover:underline cursor-pointer">
                    {author.name} Quotes &amp; Philosophy - {author.profession || "Thinker & Writer"}
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
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                          Core Philosophical Themes
                        </span>
                        <span className="text-[9px] font-mono text-violet-600 bg-violet-50 px-1.5 py-0.2 rounded border border-violet-100">
                          Schema: knowsAbout
                        </span>
                      </div>
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
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                          Notable Publications / Sources
                        </span>
                        <span className="text-[9px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-100">
                          Schema: workExample
                        </span>
                      </div>
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

              {/* Google Search FAQPage Rich Results Preview */}
              {faqs.length > 0 && (
                <div className="rounded-xl border border-stone-200/90 bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500">
                        Google Search FAQ Rich Results
                      </span>
                      <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded">
                        Schema: FAQPage
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyFaqs}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-600 hover:text-stone-900 transition cursor-pointer"
                        title="Copy FAQ Schema JSON-LD"
                      >
                        {isFaqCopied ? (
                          <>
                            <CheckIcon className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">Copied FAQ</span>
                          </>
                        ) : (
                          <>
                            <CopyIcon className="w-3 h-3 text-stone-400" />
                            <span>Copy FAQ JSON-LD</span>
                          </>
                        )}
                      </button>

                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        onClick={handlePublishFaqs}
                        disabled={isPublishingFaqs || faqsPublished}
                        className={`text-[11px] font-semibold transition ${
                          faqsPublished
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "hover:bg-stone-50 text-stone-700"
                        }`}
                      >
                        {faqsPublished ? (
                          <>
                            <CheckIcon className="w-3 h-3 text-emerald-600 inline mr-1" />
                            <span>Published to Schema</span>
                          </>
                        ) : isPublishingFaqs ? (
                          <span>Saving FAQs...</span>
                        ) : (
                          <span>Publish FAQs</span>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {faqs.map((faq, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-stone-100 bg-stone-50/50 p-2.5 space-y-1 text-xs"
                      >
                        <p className="font-semibold text-stone-900 flex items-start gap-1.5">
                          <span className="text-stone-400 font-mono text-[11px]">Q:</span>
                          <span>{faq.question}</span>
                        </p>
                        <p className="text-stone-600 leading-relaxed pl-4 text-[11.5px]">
                          {faq.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Intellectual Lineage & Companion Thinkers Graph */}
              {companionThinkers && (
                <div className="rounded-xl border border-stone-200/90 bg-white p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500">
                      Intellectual Lineage &amp; Companion Thinkers
                    </span>
                    <span className="text-[9px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-1.5 py-0.5 rounded">
                      Schema: relatedTo
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Influences */}
                    <div className="rounded-lg border border-stone-100 bg-stone-50/50 p-2.5 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-stone-500 block">
                        🏛️ Roots &amp; Mentors
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {companionThinkers.influences.map((thinker) => (
                          <span
                            key={thinker}
                            className="px-2 py-0.5 rounded bg-white border border-stone-200 text-stone-700 text-[11px] font-medium"
                          >
                            {thinker}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Influenced */}
                    <div className="rounded-lg border border-stone-100 bg-stone-50/50 p-2.5 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-stone-500 block">
                        🌿 Successors &amp; Heirs
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {companionThinkers.influenced.map((thinker) => (
                          <span
                            key={thinker}
                            className="px-2 py-0.5 rounded bg-white border border-stone-200 text-stone-700 text-[11px] font-medium"
                          >
                            {thinker}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Contrasts */}
                    <div className="rounded-lg border border-stone-100 bg-stone-50/50 p-2.5 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-stone-500 block">
                        ⚖️ Contrasting Voices
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {companionThinkers.contrasts.map((thinker) => (
                          <span
                            key={thinker}
                            className="px-2 py-0.5 rounded bg-white border border-stone-200 text-stone-700 text-[11px] font-medium"
                          >
                            {thinker}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
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
