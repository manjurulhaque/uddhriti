"use client"

import * as React from "react"
import Image from "next/image"
import { getAuthorInitials, normalizeWikimediaThumbnailUrl } from "@/lib/formatters"

export type AuthorAvatarSize = "xs" | "sm" | "md" | "lg" | "xl"

export interface AuthorAvatarProps {
  name: string
  imageUrl?: string | null
  size?: AuthorAvatarSize
  className?: string
  priority?: boolean
  loading?: "eager" | "lazy"
  showBadge?: boolean
  badgeLabel?: string
}

const SIZE_CLASSES: Record<AuthorAvatarSize, { container: string; text: string; imageSizes: string }> = {
  xs: {
    container: "h-8 w-8 rounded-lg",
    text: "text-xs font-semibold",
    imageSizes: "32px",
  },
  sm: {
    container: "h-12 w-12 rounded-xl",
    text: "text-sm font-bold",
    imageSizes: "48px",
  },
  md: {
    container: "h-14 w-14 sm:h-16 sm:w-16 rounded-2xl",
    text: "text-base sm:text-lg font-bold",
    imageSizes: "64px",
  },
  lg: {
    container: "h-20 w-20 rounded-2xl",
    text: "text-xl sm:text-2xl font-bold italic",
    imageSizes: "80px",
  },
  xl: {
    container: "h-32 w-32 sm:h-40 sm:w-40 rounded-2xl",
    text: "text-4xl sm:text-5xl font-bold italic",
    imageSizes: "(max-width: 640px) 128px, 160px",
  },
}

export function AuthorAvatar({
  name,
  imageUrl,
  size = "md",
  className = "",
  priority = false,
  loading,
  showBadge = false,
  badgeLabel = "Thinker",
}: AuthorAvatarProps) {
  const normalizedUrl = normalizeWikimediaThumbnailUrl(imageUrl)
  const initials = getAuthorInitials(name)
  const sizeConfig = SIZE_CLASSES[size]
  const [hasError, setHasError] = React.useState(false)

  React.useEffect(() => {
    setHasError(false)
  }, [normalizedUrl])

  // On mobile WebKit (iOS Safari), loading="lazy" inside overflow:hidden containers with position:absolute
  // frequently fails to trigger the intersection observer. Defaulting to "eager" with decoding="async"
  // and referrerPolicy="no-referrer" (preventing Wikimedia 403 hotlink blocking) ensures instant loading.
  const effectiveLoading = loading ?? "eager"

  return (
    <div
      className={`relative shrink-0 overflow-hidden border border-stone-200/90 bg-stone-100 shadow-2xs group ${sizeConfig.container} ${className}`}
    >
      {normalizedUrl && !hasError ? (
        <Image
          src={normalizedUrl}
          alt={name}
          fill
          sizes={sizeConfig.imageSizes}
          unoptimized
          priority={priority}
          loading={effectiveLoading}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-[#faf6f0] to-[#f4ebe1] text-[var(--ink-900)] relative">
          <span className={`font-serif text-[var(--accent-rust)] ${sizeConfig.text}`}>
            {initials}
          </span>
          {showBadge && (
            <span className="text-[10px] uppercase font-mono tracking-widest text-stone-400 mt-1">
              {badgeLabel}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

