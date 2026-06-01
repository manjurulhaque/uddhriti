"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { tagTypeOptions, type TagTypeOption } from "@/lib/tags/catalog"

type TagItem = {
  id: string
  name: string
  slug: string
  type: string
  quoteCount: number
}

type QuoteFilter = "all" | "used" | "unused"

export function TagsListManager({ tags }: { tags: TagItem[] }) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deletingIds, setDeletingIds] = useState<string[]>([])
  const [updatingIds, setUpdatingIds] = useState<string[]>([])
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<"all" | TagTypeOption>("all")
  const [quoteFilter, setQuoteFilter] = useState<QuoteFilter>("all")
  const [bulkType, setBulkType] = useState<TagTypeOption>(tagTypeOptions[0])
  const [tagTypesById, setTagTypesById] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(tags.map((tag) => [tag.id, tag.type]))
  )
  const [error, setError] = useState("")

  const deletingSet = useMemo(() => new Set(deletingIds), [deletingIds])
  const updatingSet = useMemo(() => new Set(updatingIds), [updatingIds])
  const filteredTags = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return tags.filter((tag) => {
      const matchesSearch = needle
        ? `${tag.name} ${tag.slug} ${tag.type}`.toLowerCase().includes(needle)
        : true
      const matchesType = typeFilter === "all" || tag.type === typeFilter
      const matchesQuoteFilter =
        quoteFilter === "all" ||
        (quoteFilter === "used" && tag.quoteCount > 0) ||
        (quoteFilter === "unused" && tag.quoteCount === 0)

      return matchesSearch && matchesType && matchesQuoteFilter
    })
  }, [quoteFilter, search, tags, typeFilter])
  const allSelected =
    filteredTags.length > 0 &&
    filteredTags.every((tag) => selectedIds.includes(tag.id))
  const hasActiveFilters =
    search.trim().length > 0 || typeFilter !== "all" || quoteFilter !== "all"
  const groupedTags = useMemo(
    () =>
      tagTypeOptions
        .map((type) => ({
          type,
          tags: filteredTags
            .filter((tag) => tag.type === type)
            .sort((a, b) => a.name.localeCompare(b.name)),
        }))
        .filter((group) => group.tags.length > 0),
    [filteredTags]
  )

  function clearFilters() {
    setSearch("")
    setTypeFilter("all")
    setQuoteFilter("all")
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]
    )
  }

  function toggleSelectAll() {
    const filteredIds = filteredTags.map((tag) => tag.id)

    setSelectedIds((prev) => {
      if (allSelected) {
        return prev.filter((id) => !filteredIds.includes(id))
      }

      return Array.from(new Set([...prev, ...filteredIds]))
    })
  }

  async function deleteTags(ids: string[]) {
    if (ids.length === 0) return

    const isBulk = ids.length > 1
    const confirmed = window.confirm(
      isBulk
        ? `Delete ${ids.length} selected tags?`
        : "Delete this tag?"
    )

    if (!confirmed) return

    setDeletingIds(ids)
    setError("")

    try {
      const responses = await Promise.all(
        ids.map((id) =>
          fetch(`/api/admin/tags/${id}`, {
            method: "DELETE",
          }).then(async (res) => ({
            ok: res.ok,
            data: await res.json().catch(() => null),
          }))
        )
      )

      const failed = responses.find((response) => !response.ok)
      if (failed) {
        throw new Error(failed.data?.error || "Failed to delete tag")
      }

      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)))
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete tag")
    } finally {
      setDeletingIds([])
    }
  }

  async function updateTagType(ids: string[], type: string) {
    if (ids.length === 0) return

    setUpdatingIds(ids)
    setError("")

    try {
      const res = await fetch("/api/admin/tags/bulk-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tagIds: ids,
          action: "setType",
          type,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to update tag category")
      }

      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)))
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update tag category")
    } finally {
      setUpdatingIds([])
    }
  }

  return (
    <div className="space-y-4">
      {selectedIds.length > 0 ? (
        <div className="border rounded p-3 bg-gray-50 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-medium">{selectedIds.length} selected</div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={bulkType}
              onChange={(event) => setBulkType(event.target.value as TagTypeOption)}
              disabled={updatingIds.length > 0}
              className="border rounded px-3 py-2 text-sm"
            >
              {tagTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => updateTagType(selectedIds, bulkType)}
              disabled={updatingIds.length > 0 || deletingIds.length > 0}
              className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {updatingIds.length > 0 ? "Updating..." : "Change Category"}
            </button>
            <button
              type="button"
              onClick={() => deleteTags(selectedIds)}
              disabled={deletingIds.length > 0 || updatingIds.length > 0}
              className="bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {deletingIds.length > 0 ? "Deleting..." : "Delete Selected"}
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="space-y-2">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tags by name, slug, or category"
            className="w-full rounded border px-3 py-2 text-sm md:flex-1"
          />
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as "all" | TagTypeOption)}
            className="rounded border px-3 py-2 text-sm md:w-56"
          >
            <option value="all">Type: All</option>
            {tagTypeOptions.map((type) => (
              <option key={type} value={type}>
                Type: {type}
              </option>
            ))}
          </select>
          <select
            value={quoteFilter}
            onChange={(event) => setQuoteFilter(event.target.value as QuoteFilter)}
            className="rounded border px-3 py-2 text-sm md:w-56"
          >
            <option value="all">Usage: All tags</option>
            <option value="used">Usage: With quotes</option>
            <option value="unused">Usage: No quotes</option>
          </select>
        </div>

        <div className="flex flex-col gap-2 rounded border bg-gray-50 p-3 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
          <div>
            Showing <span className="font-medium text-gray-900">{filteredTags.length}</span> of{" "}
            <span className="font-medium text-gray-900">{tags.length}</span> tags
          </div>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded border bg-white px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-100"
            >
              Clear filters
            </button>
          ) : null}
        </div>

        {filteredTags.length > 0 ? (
          <label className="inline-flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
            Select all on page
          </label>
        ) : null}

        {groupedTags.length > 0 ? (
          groupedTags.map((group) => (
            <section key={group.type} className="space-y-2">
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="text-lg font-semibold">{group.type}</h2>
                <span className="text-sm text-gray-500">{group.tags.length} tag(s)</span>
              </div>

              {group.tags.map((tag) => {
                const isDeleting = deletingSet.has(tag.id)
                const isUpdating = updatingSet.has(tag.id)

                return (
                  <div key={tag.id} className="border p-4 rounded bg-white">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(tag.id)}
                          onChange={() => toggleSelect(tag.id)}
                          disabled={isDeleting || isUpdating}
                          className="mt-1"
                        />

                        <Link href={`/admin/tags/${tag.id}`} className="block min-w-0 hover:bg-gray-50 rounded">
                          <div className="font-semibold">{tag.name}</div>
                          <div className="text-sm text-gray-500 break-all">{tag.slug}</div>
                          <div className="text-xs text-gray-400">
                            Quotes: {tag.quoteCount}
                          </div>
                        </Link>
                      </div>

                      <div className="flex flex-wrap gap-2 shrink-0 items-center justify-end">
                        <select
                          value={tagTypesById[tag.id] || tag.type}
                          onChange={(event) =>
                            setTagTypesById((prev) => ({
                              ...prev,
                              [tag.id]: event.target.value,
                            }))
                          }
                          disabled={isDeleting || isUpdating}
                          className="border px-3 py-2 rounded text-sm"
                        >
                          {tagTypeOptions.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => updateTagType([tag.id], tagTypesById[tag.id] || tag.type)}
                          disabled={
                            isDeleting ||
                            isUpdating ||
                            (tagTypesById[tag.id] || tag.type) === tag.type
                          }
                          className="bg-black text-white px-3 py-2 rounded text-sm disabled:opacity-50"
                        >
                          {isUpdating ? "Saving..." : "Save Category"}
                        </button>
                        <Link
                          href={`/admin/tags/${tag.id}`}
                          className="border px-3 py-2 rounded text-sm"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => deleteTags([tag.id])}
                          disabled={deletingIds.length > 0 || updatingIds.length > 0}
                          className="bg-red-600 text-white px-3 py-2 rounded text-sm disabled:opacity-50"
                        >
                          {isDeleting ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </section>
          ))
        ) : (
          <div className="rounded border border-dashed p-4 text-sm text-gray-500">
            No tags match your search.
          </div>
        )}
      </div>
    </div>
  )
}
