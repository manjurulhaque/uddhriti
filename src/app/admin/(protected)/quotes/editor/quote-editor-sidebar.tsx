import * as React from "react"
import { QuoteEditorFormState, QuoteEditorMode } from "./types"

interface QuoteEditorSidebarProps {
  mode: QuoteEditorMode
  form: QuoteEditorFormState
  selectedAuthorName: string
  selectedCategoryName: string
  selectedTagsCount: number
  isDirty: boolean
  hasUnsavedDraft: boolean
  loading: boolean
  submitMode: "list" | "another" | "stay"
  handleSubmit: (nextMode: "list" | "another" | "stay") => Promise<void>
  setIsConfirmingDelete: (val: boolean) => void
  lastSavedDraftAt?: string | null
  onClearDraft?: () => void
}

export function QuoteEditorSidebar({
  mode,
  form,
  selectedAuthorName,
  selectedCategoryName,
  selectedTagsCount,
  isDirty,
  hasUnsavedDraft,
  loading,
  submitMode,
  handleSubmit,
  setIsConfirmingDelete,
  lastSavedDraftAt,
  onClearDraft,
}: QuoteEditorSidebarProps) {
  return (
    <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start font-sans">
      {/* Actions & Submission Card */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-2xs space-y-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">
            {mode === "create" ? "Publishing Controls" : "Save Changes"}
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            {mode === "create"
              ? `Saving as ${form.status === "PUBLISHED" ? "published quote" : form.status.toLowerCase()}.`
              : "Save changes back to quotation index or keep editing."}
          </p>
        </div>

        {lastSavedDraftAt ? (
          <div className="flex items-center justify-between text-[11px] text-stone-600 bg-stone-50/90 rounded-xl px-3 py-2 border border-stone-200/80 font-mono">
            <span className="flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              <span className="truncate">{lastSavedDraftAt}</span>
            </span>
            {onClearDraft ? (
              <button
                type="button"
                onClick={onClearDraft}
                className="text-[10px] text-stone-400 hover:text-stone-700 underline shrink-0 cursor-pointer ml-2"
                title="Discard browser auto-draft backup"
              >
                Clear
              </button>
            ) : null}
          </div>
        ) : mode === "create" && hasUnsavedDraft ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800">
            You have an unsaved quote draft in progress.
          </div>
        ) : null}

        {/* Metadata summary */}
        <div className="rounded-xl border border-stone-200/80 bg-stone-50/60 p-3.5 text-xs text-stone-600 space-y-1.5 font-mono">
          <div className="flex items-center justify-between">
            <span className="text-stone-400">Author:</span>
            <span className="font-semibold text-stone-800 truncate max-w-[150px]">
              {selectedAuthorName}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-400">Category:</span>
            <span className="font-semibold text-stone-800 truncate max-w-[150px]">
              {selectedCategoryName}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-400">Tags:</span>
            <span className="font-semibold text-stone-800">{selectedTagsCount} selected</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-400">Status:</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                form.status === "PUBLISHED"
                  ? "bg-emerald-100 text-emerald-800"
                  : form.status === "REVIEW"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-stone-200 text-stone-700"
              }`}
            >
              {form.status}
            </span>
          </div>
          {mode === "edit" && (
            <div className="flex items-center justify-between pt-1 border-t border-stone-200/60">
              <span className="text-stone-400">Modified:</span>
              <span
                className={`text-[11px] font-bold ${
                  isDirty ? "text-amber-700" : "text-stone-500"
                }`}
              >
                {isDirty ? "Unsaved edits" : "Synchronized"}
              </span>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="space-y-2 pt-1">
          {mode === "create" ? (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleSubmit("list")}
                className="w-full rounded-xl bg-stone-900 py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-white shadow-xs hover:bg-black disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading && submitMode === "list"
                  ? "Saving..."
                  : form.status === "PUBLISHED"
                  ? "Publish Quote"
                  : "Save Quote"}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleSubmit("another")}
                className="w-full rounded-xl border border-stone-300 bg-white py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-stone-800 hover:bg-stone-50 disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading && submitMode === "another" ? "Saving..." : "Save & Add Another"}
              </button>
              <p className="text-[11px] text-stone-400 text-center">
                Author, category, and language choices are remembered for quick authoring.
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleSubmit("list")}
                className="w-full rounded-xl bg-stone-900 py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-white shadow-xs hover:bg-black disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading && submitMode === "list" ? "Saving..." : "Save & Back to List"}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleSubmit("stay")}
                className="w-full rounded-xl border border-stone-300 bg-white py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-stone-800 hover:bg-stone-50 disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading && submitMode === "stay" ? "Saving..." : "Save & Keep Editing"}
              </button>
              <div className="pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="w-full rounded-xl border border-red-200 bg-red-50/50 py-2 px-4 text-xs font-semibold uppercase tracking-wider text-red-700 hover:bg-red-100/70 transition-all cursor-pointer"
                >
                  Delete Quote
                </button>
              </div>
            </>
          )}

          <div className="flex items-center justify-center gap-3 text-[11px] text-stone-400 pt-2 border-t border-stone-100">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200 font-mono text-[10px]">⌘S</kbd> Save
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200 font-mono text-[10px]">⌘⏎</kbd> {mode === "create" ? "Save & New" : "Save & Close"}
            </span>
          </div>
        </div>
      </div>

      {/* Live Editorial Preview Card */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
            Live Typography Preview
          </span>
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>

        <div className="rounded-xl border border-stone-200/70 bg-[var(--page-cream)]/70 p-4 space-y-3">
          <div className="font-serif text-2xl text-[var(--accent-gold)] leading-none -mb-1">
            &ldquo;
          </div>
          <blockquote className="font-serif text-sm italic text-stone-900 leading-relaxed">
            {form.content.trim() || "Your quotation content will be previewed live here as you compose..."}
          </blockquote>
          <div className="border-t border-stone-300/40 pt-2 flex items-center justify-between text-xs">
            <span className="font-medium text-stone-700">
              — {selectedAuthorName !== "Author" ? selectedAuthorName : "Selected Author"}
            </span>
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] text-stone-500 border border-stone-200/70">
              {selectedCategoryName !== "No category" ? selectedCategoryName : "Category"}
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
