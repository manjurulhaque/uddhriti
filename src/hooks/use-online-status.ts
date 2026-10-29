"use client"

import * as React from "react"

function subscribeOnline(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {}

  window.addEventListener("online", callback)
  window.addEventListener("offline", callback)
  return () => {
    window.removeEventListener("online", callback)
    window.removeEventListener("offline", callback)
  }
}

function getOnlineSnapshot(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true
}

function getServerOnlineSnapshot(): boolean {
  return true
}

export function useOnlineStatus(): boolean {
  return React.useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getServerOnlineSnapshot
  )
}

