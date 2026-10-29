import * as React from "react"

export interface BookmarkIconProps extends React.SVGProps<SVGSVGElement> {
  filled?: boolean
}

export function BookmarkIcon({
  filled = false,
  className = "h-4 w-4",
  ...props
}: BookmarkIconProps) {
  return (
    <svg
      className={className}
      fill={filled ? "currentColor" : "none"}
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
      />
    </svg>
  )
}

