import * as React from "react"
import Link from "next/link"
import { AuthorAvatar } from "../author-avatar"
import { formatEpoch, formatLifespan } from "@/lib/formatters"
import { isSafeExternalUrl } from "@/lib/security/input"

export interface QuoteAuthorInfo {
  name: string
  slug?: string | null
  profession?: string | null
  nationality?: string | null
  birthYear?: number | null
  deathYear?: number | null
  bio?: string | null
  imageUrl?: string | null
  quoteCount?: number | null
  wikipediaUrl?: string | null
}

export interface QuoteAuthorBriefingProps {
  author: QuoteAuthorInfo
  className?: string
  loading?: "eager" | "lazy"
  priority?: boolean
}

export function QuoteAuthorBriefing({
  author,
  className = "",
  loading,
  priority,
}: QuoteAuthorBriefingProps) {
  if (!author) return null

  const authorLifespan = formatLifespan(author)
  const authorEpoch = formatEpoch(author.birthYear)

  return (
    <section
      className={`rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-2xs space-y-4 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
        <div className="flex items-center gap-4">
          <AuthorAvatar
            name={author.name}
            imageUrl={author.imageUrl}
            size="md"
            loading={loading}
            priority={priority}
          />

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-rust)] block">
              About the Thinker
            </span>
            {author.slug ? (
              <Link
                href={`/authors/${author.slug}`}
                className="font-serif text-xl font-bold text-stone-900 hover:text-[var(--accent-rust)] transition-colors inline-flex items-center gap-1.5"
              >
                <span>{author.name}</span>
              </Link>
            ) : (
              <h3 className="font-serif text-xl font-bold text-stone-900">{author.name}</h3>
            )}
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-stone-500 mt-0.5">
              {author.profession && <span>{author.profession}</span>}
              {author.nationality && <span>· {author.nationality}</span>}
              {authorLifespan && <span className="font-mono">({authorLifespan})</span>}
              {authorEpoch && (
                <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.2 text-[10px] font-semibold text-amber-800">
                  {authorEpoch}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {author.slug && (
            <Link
              href={`/authors/${author.slug}`}
              className="text-xs font-semibold text-stone-800 hover:text-[var(--accent-rust)] transition-colors"
            >
              View all {author.quoteCount || "collected"} reflections &rarr;
            </Link>
          )}
          {isSafeExternalUrl(author.wikipediaUrl) && (
            <a
              href={author.wikipediaUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-stone-400 hover:text-stone-700 transition-colors"
              title="Read Wikipedia biography"
            >
              Wikipedia ↗
            </a>
          )}
        </div>
      </div>

      {author.bio && (
        <p className="font-serif text-xs sm:text-sm text-stone-700 leading-relaxed">
          {author.bio}
        </p>
      )}
    </section>
  )
}

