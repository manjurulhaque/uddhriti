import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { getAdmin } from "@/lib/auth/getAdmin"
import { isPrivateOrLocalIp } from "@/lib/ip"
import { AdminSidebar } from "@/components/admin"
import { CurrentIpDisplay } from "./CurrentIpDisplay"

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await getAdmin()
  const requestIp = await getRequestIp()

  if (!admin) {
    redirect("/admin/login")
  }

  if (admin.role !== "SUPER_ADMIN") {
    redirect("/")
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      <AdminSidebar
        admin={{ email: admin.email, role: admin.role }}
        ipDisplay={<CurrentIpDisplay initialIp={requestIp.value} initialSource={requestIp.source} />}
      />

      <main className="flex-1 min-w-0 bg-gray-50">{children}</main>
    </div>
  )
}

async function getRequestIp() {
  const headerStore = await headers()
  const sources = [
    { name: "cf-connecting-ip", values: [headerStore.get("cf-connecting-ip")] },
    { name: "true-client-ip", values: [headerStore.get("true-client-ip")] },
    { name: "fly-client-ip", values: [headerStore.get("fly-client-ip")] },
    { name: "fastly-client-ip", values: [headerStore.get("fastly-client-ip")] },
    { name: "x-real-ip", values: [headerStore.get("x-real-ip")] },
    { name: "x-client-ip", values: [headerStore.get("x-client-ip")] },
    { name: "x-cluster-client-ip", values: [headerStore.get("x-cluster-client-ip")] },
    { name: "forwarded", values: parseForwardedHeader(headerStore.get("forwarded")) },
    { name: "x-forwarded-for", values: parseForwardedFor(headerStore.get("x-forwarded-for")) },
  ]

  for (const source of sources) {
    const normalizedValues = source.values
      .map(normalizeIpCandidate)
      .filter((value): value is string => Boolean(value))

    const publicIp = normalizedValues.find((value) => !isPrivateOrLocalIp(value))
    if (publicIp) {
      return { value: publicIp, source: source.name }
    }

    if (normalizedValues[0]) {
      return { value: normalizedValues[0], source: source.name }
    }
  }

  return { value: "Unavailable", source: null }
}

function parseForwardedFor(value: string | null) {
  if (!value) return []
  return value.split(",").map((entry) => entry.trim())
}

function parseForwardedHeader(value: string | null) {
  if (!value) return []

  return value
    .split(",")
    .flatMap((entry) => entry.split(";"))
    .map((part) => part.trim())
    .filter((part) => part.toLowerCase().startsWith("for="))
    .map((part) => part.slice(4).trim())
}

function normalizeIpCandidate(value: string | null | undefined) {
  if (!value) return null

  let candidate = value.trim()

  if (!candidate || candidate.toLowerCase() === "unknown") {
    return null
  }

  if (candidate.startsWith('"') && candidate.endsWith('"')) {
    candidate = candidate.slice(1, -1)
  }

  if (candidate.startsWith("[")) {
    const closingBracketIndex = candidate.indexOf("]")
    if (closingBracketIndex !== -1) {
      candidate = candidate.slice(1, closingBracketIndex)
    }
  } else {
    const ipv4WithPortMatch = candidate.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/)
    if (ipv4WithPortMatch) {
      candidate = ipv4WithPortMatch[1]
    }
  }

  const lowerCased = candidate.toLowerCase()
  if (lowerCased.startsWith("::ffff:")) {
    candidate = candidate.slice(7)
  }

  if (candidate === "::1") {
    return "127.0.0.1"
  }

  return candidate
}

