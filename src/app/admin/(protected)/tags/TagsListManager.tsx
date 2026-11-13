"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { tagTypeOptions, type TagTypeOption } from "@/lib/tags/catalog"
import { FilterToolbar, AdminEntityCard, AdminEntityCountBadge, AdminBulkActionBar } from "@/components/admin"
import { Select, EmptyState, ConfirmModal, Button } from "@/components/ui"
import { formatCountWithNoun } from "@/lib/formatters"

type TagItem = {
  id: string
  name: string
  slug: string
  type: string
  quoteCount: number
}

type QuoteFilter = "all" | "used" | "unused"

const GROUP_INITIAL_LIMIT = 15

function ChevronDownIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function ChevronUpIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  )
}

export function TagsListManager({ tags }: { tags: TagItem[] }) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deletingIds, setDeletingIds] = useState<string[]>([])
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null)
  const [updatingIds, setUpdatingIds] = useState<string[]>([])
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<"all" | TagTypeOption>("all")
  const [quoteFilter, setQuoteFilter] = useState<QuoteFilter>("all")
  const [bulkType, setBulkType] = useState<TagTypeOption>(tagTypeOptions[0])
  const [tagTypesById, setTagTypesById] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(tags.map((tag) => [tag.id, tag.type]))
  )
  const [collapsedTypes, setCollapsedTypes] = useState<Set<string>>(() => new Set())
  const [expandedGroupLimits, setExpandedGroupLimits] = useState<Set<string>>(() => new Set())
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

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const tag of tags) {
      counts[tag.type] = (counts[tag.type] || 0) + 1
    }
    return counts
  }, [tags])

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

  function toggleSelectGroup(groupTags: TagItem[]) {
    const groupIds = groupTags.map((t) => t.id)
    const allGroupSelected = groupIds.every((id) => selectedIds.includes(id))

    setSelectedIds((prev) => {
      if (allGroupSelected) {
        return prev.filter((id) => !groupIds.includes(id))
      }
      return Array.from(new Set([...prev, ...groupIds]))
    })
  }

  function toggleGroupCollapse(type: string) {
    setCollapsedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  function toggleGroupLimit(type: string) {
    setExpandedGroupLimits((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  function collapseAllGroups() {
    setCollapsedTypes(new Set(tagTypeOptions))
  }

  function expandAllGroups() {
    setCollapsedTypes(new Set())
  }

  async function executeDeleteTags(ids: string[]) {
    if (ids.length === 0) return

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
      setPendingDeleteIds(null)
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

    // Optimistic local state update
    setTagTypesById((prev) => {
      const next = { ...prev }
      for (const id of ids) {
        next[id] = type
      }
      return next
    })

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
      router.refresh()
    } finally {
      setUpdatingIds([])
    }
  }

  const isActivelySearching = search.trim().length > 0

  return (
    <div className="space-y-4">
      {/* Sticky Bulk Action Bar */}
      <AdminBulkActionBar
        selectedCount={selectedIds.length}
        entityLabel="tag"
        onDeselectAll={() => setSelectedIds([])}
        onDelete={() => setPendingDeleteIds(selectedIds)}
        isDeleting={deletingIds.length > 0 || updatingIds.length > 0}
      >
        <select
          value={bulkType}
          onChange={(event) => setBulkType(event.target.value as TagTypeOption)}
          disabled={updatingIds.length > 0}
          className="bg-stone-800 border border-stone-700 text-stone-100 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-stone-400"
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
          className="bg-white text-stone-900 font-medium text-xs px-3 py-1.5 rounded-lg hover:bg-stone-100 disabled:opacity-50 transition cursor-pointer"
        >
          {updatingIds.length > 0 ? "Updating..." : "Change Category"}
        </button>
      </AdminBulkActionBar>

      {error ? <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</p> : null}

      {/* Main Filter Toolbar */}
      <FilterToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search tags by name, slug, or category..."
        visibleCount={filteredTags.length}
        totalCount={tags.length}
        itemLabel="tags"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        filters={
          <>
            <Select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as "all" | TagTypeOption)}
              options={[
                { value: "all", label: "Type: All" },
                ...tagTypeOptions.map((type) => ({ value: type, label: `Type: ${type}` })),
              ]}
            />
            <Select
              value={quoteFilter}
              onChange={(event) => setQuoteFilter(event.target.value as QuoteFilter)}
              options={[
                { value: "all", label: "Usage: All tags" },
                { value: "used", label: "Usage: With quotes" },
                { value: "unused", label: "Usage: No quotes" },
              ]}
            />
          </>
        }
      />

      {/* Horizontal Category Quick Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-thin">
        <button
          type="button"
          onClick={() => setTypeFilter("all")}
          className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition cursor-pointer ${
            typeFilter === "all"
              ? "bg-neutral-900 text-white shadow-2xs"
              : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"
          }`}
        >
          All ({tags.length})
        </button>
        {tagTypeOptions.map((type) => {
          const count = typeCounts[type] || 0
          if (count === 0) return null
          const isActive = typeFilter === type
          return (
            <button
              key={type}
              type="button"
              onClick={() => setTypeFilter(isActive ? "all" : type)}
              className={`px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? "bg-neutral-900 text-white shadow-2xs"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span>{type}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isActive ? "bg-neutral-800 text-neutral-200" : "bg-gray-100 text-gray-600"
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Global Controls & Count */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-2 text-sm text-gray-600">
        {filteredTags.length > 0 ? (
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="rounded border-gray-300 text-black focus:ring-black"
            />
            <span>Select all {filteredTags.length} visible tags</span>
          </label>
        ) : <div />}

        {groupedTags.length > 1 && !isActivelySearching ? (
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={expandAllGroups}
              className="text-gray-500 hover:text-gray-900 underline cursor-pointer"
            >
              Expand All
            </button>
            <span className="text-gray-300">•</span>
            <button
              type="button"
              onClick={collapseAllGroups}
              className="text-gray-500 hover:text-gray-900 underline cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        ) : null}
      </div>

      {/* Grouped Tag Sections */}
      <div className="space-y-4">
        {groupedTags.length > 0 ? (
          groupedTags.map((group) => {
            const isCollapsed = !isActivelySearching && collapsedTypes.has(group.type)
            const isGroupExpanded = isActivelySearching || expandedGroupLimits.has(group.type)
            const visibleGroupTags = isGroupExpanded
              ? group.tags
              : group.tags.slice(0, GROUP_INITIAL_LIMIT)
            const hasMoreTags = group.tags.length > GROUP_INITIAL_LIMIT && !isGroupExpanded

            const groupIds = group.tags.map((t) => t.id)
            const groupSelectedCount = groupIds.filter((id) => selectedIds.includes(id)).length
            const isGroupAllSelected = groupIds.length > 0 && groupSelectedCount === groupIds.length
            const isGroupPartiallySelected = groupSelectedCount > 0 && !isGroupAllSelected

            return (
              <section
                key={group.type}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xs transition"
              >
                {/* Collapsible Group Header */}
                <div className="p-3.5 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isGroupAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isGroupPartiallySelected
                      }}
                      onChange={() => toggleSelectGroup(group.tags)}
                      className="rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                      title={`Select all in ${group.type}`}
                    />
                    <button
                      type="button"
                      onClick={() => toggleGroupCollapse(group.type)}
                      className="flex items-center gap-2 text-left font-semibold text-gray-900 hover:text-black transition cursor-pointer"
                    >
                      <span className="text-base">{group.type}</span>
                      <span className="text-xs font-normal text-gray-500">
                        ({formatCountWithNoun(group.tags.length, "tag")})
                      </span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {groupSelectedCount > 0 ? (
                      <span className="text-xs font-medium text-stone-700 bg-stone-100 px-2 py-0.5 rounded-full">
                        {groupSelectedCount} selected
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => toggleGroupCollapse(group.type)}
                      className="p-1 text-gray-400 hover:text-gray-700 rounded-md transition cursor-pointer"
                      aria-label={isCollapsed ? `Expand ${group.type}` : `Collapse ${group.type}`}
                    >
                      {isCollapsed ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronUpIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Group Tag Cards */}
                {!isCollapsed && (
                  <div className="p-3 space-y-2">
                    {visibleGroupTags.map((tag) => {
                      const isDeleting = deletingSet.has(tag.id)
                      const isUpdating = updatingSet.has(tag.id)

                      return (
                        <AdminEntityCard
                          key={tag.id}
                          href={`/admin/tags/${tag.id}`}
                          title={tag.name}
                          subtitle={`/${tag.slug}`}
                          selected={selectedIds.includes(tag.id)}
                          onSelect={() => toggleSelect(tag.id)}
                          disabled={isDeleting || isUpdating}
                          badge={
                            tag.quoteCount > 0 ? (
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  router.push(`/admin/quotes?tag=${tag.slug}`)
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    router.push(`/admin/quotes?tag=${tag.slug}`)
                                  }
                                }}
                                className="cursor-pointer inline-flex transition hover:opacity-80"
                                title={`View ${tag.quoteCount} quotes tagged with #${tag.name}`}
                              >
                                <AdminEntityCountBadge count={tag.quoteCount} />
                              </span>
                            ) : (
                              <AdminEntityCountBadge count={tag.quoteCount} />
                            )
                          }
                          actions={
                            <div className="flex flex-wrap gap-2 items-center justify-end">
                              {tag.quoteCount > 0 && (
                                <Button
                                  href={`/admin/quotes?tag=${tag.slug}`}
                                  variant="ghost"
                                  size="xs"
                                  className="text-stone-700 hover:text-stone-900 hidden sm:inline-flex"
                                  title={`View ${tag.quoteCount} quotes tagged with #${tag.name}`}
                                >
                                  View quotes &rarr;
                                </Button>
                              )}
                              <select
                                value={tagTypesById[tag.id] || tag.type}
                                onChange={(event) =>
                                  setTagTypesById((prev) => ({
                                    ...prev,
                                    [tag.id]: event.target.value,
                                  }))
                                }
                                disabled={isDeleting || isUpdating}
                                className="border border-stone-200/90 rounded-lg px-2.5 py-1 text-xs bg-white text-stone-800 focus:outline-hidden"
                              >
                                {tagTypeOptions.map((type) => (
                                  <option key={type} value={type}>
                                    {type}
                                  </option>
                                ))}
                              </select>
                              <Button
                                type="button"
                                variant="secondary"
                                size="xs"
                                onClick={() => updateTagType([tag.id], tagTypesById[tag.id] || tag.type)}
                                disabled={
                                  isDeleting ||
                                  isUpdating ||
                                  (tagTypesById[tag.id] || tag.type) === tag.type
                                }
                              >
                                {isUpdating ? "Saving..." : "Save Category"}
                              </Button>
                              <Button
                                href={`/admin/tags/${tag.id}`}
                                variant="outline"
                                size="xs"
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="danger"
                                size="xs"
                                onClick={() => setPendingDeleteIds([tag.id])}
                                disabled={deletingIds.length > 0 || updatingIds.length > 0}
                              >
                                {isDeleting ? "..." : "Delete"}
                              </Button>
                            </div>
                          }
                        />
                      )
                    })}

                    {/* Show More / Show Less Toggle for Group */}
                    {group.tags.length > GROUP_INITIAL_LIMIT && !isActivelySearching ? (
                      <div className="pt-2 text-center border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => toggleGroupLimit(group.type)}
                          className="text-xs font-medium text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-md hover:bg-gray-100 transition cursor-pointer"
                        >
                          {hasMoreTags
                            ? `Show all ${group.tags.length} ${group.type} tags (${group.tags.length - GROUP_INITIAL_LIMIT} more)`
                            : `Show fewer (limit to ${GROUP_INITIAL_LIMIT})`}
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </section>
            )
          })
        ) : (
          <EmptyState
            title="No tags match your search"
            description="Try adjusting your search terms or clearing your filters."
            action={
              hasActiveFilters
                ? { label: "Clear filters", onClick: clearFilters }
                : undefined
            }
          />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={pendingDeleteIds !== null}
        onClose={() => setPendingDeleteIds(null)}
        onConfirm={async () => {
          if (pendingDeleteIds && pendingDeleteIds.length > 0) {
            await executeDeleteTags(pendingDeleteIds)
          }
        }}
        title={pendingDeleteIds && pendingDeleteIds.length > 1 ? `Delete ${pendingDeleteIds.length} Tags?` : "Delete Tag?"}
        message={
          pendingDeleteIds && pendingDeleteIds.length > 1
            ? `Are you sure you want to delete these ${pendingDeleteIds.length} selected tags? Quotes associated with these tags will have them detached.`
            : "Are you sure you want to delete this tag? Quotes associated with this tag will have it detached."
        }
        confirmLabel="Delete"
        isDestructive
        isLoading={deletingIds.length > 0}
      />
    </div>
  )
}
