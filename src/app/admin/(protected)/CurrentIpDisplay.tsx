"use client"

import { useEffect, useState } from "react"
import { isPrivateOrLocalIp } from "@/lib/ip"

type CurrentIpDisplayProps = {
  initialIp: string
  initialSource: string | null
}

type DisplayState = {
  ip: string
  source: string | null
}

export function CurrentIpDisplay({ initialIp, initialSource }: CurrentIpDisplayProps) {
  const [state, setState] = useState<DisplayState>({
    ip: initialIp,
    source: initialSource,
  })

  useEffect(() => {
    if (!shouldResolvePublicIp(initialIp)) {
      return
    }

    let isCancelled = false

    async function resolvePublicIp() {
      try {
        const response = await fetch("https://api.ipify.org?format=json", {
          cache: "no-store",
        })

        if (!response.ok) {
          return
        }

        const data = (await response.json()) as { ip?: string }
        const publicIp = typeof data.ip === "string" ? data.ip.trim() : ""

        if (!publicIp || isCancelled) {
          return
        }

        setState({
          ip: publicIp,
          source: "public-ipify",
        })
      } catch {
        // Keep the server-detected value if the browser cannot resolve a public IP.
      }
    }

    void resolvePublicIp()

    return () => {
      isCancelled = true
    }
  }, [initialIp])

  return (
    <>
      <p className="text-xs font-mono text-gray-700 break-all">{state.ip}</p>
      {state.source && <p className="text-[11px] text-gray-400 mt-1">via {state.source}</p>}
    </>
  )
}

function shouldResolvePublicIp(ip: string) {
  return ip === "Unavailable" || isPrivateOrLocalIp(ip)
}


