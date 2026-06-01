import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { getAdmin } from "@/lib/auth/getAdmin"
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
    <div className="min-h-screen flex">
      <aside className="w-64 bg-white border-r p-6 space-y-6">
        <div>
          <h2 className="font-bold text-lg">Admin Panel</h2>
          <p className="text-xs text-gray-500 mt-1">{admin.email}</p>
          <p className="text-xs text-blue-600 font-medium">{admin.role}</p>
          <p className="text-xs text-gray-500 mt-3">Current IP</p>
          <CurrentIpDisplay initialIp={requestIp.value} initialSource={requestIp.source} />
        </div>

        <nav className="flex flex-col space-y-3 text-sm">
          <SidebarLink href="/admin/dashboard">Dashboard</SidebarLink>
          <SidebarLink href="/admin/quotes">Quotes</SidebarLink>
          <SidebarLink href="/admin/quotes/bulk">Bulk Upload Quotes</SidebarLink>
          <SidebarLink href="/admin/quotes/new">+ Submit Quote</SidebarLink>
          <SidebarLink href="/admin/authors">Authors</SidebarLink>
          <SidebarLink href="/admin/categories">Categories</SidebarLink>
          <SidebarLink href="/admin/tags">Tags</SidebarLink>
          <SidebarLink href="/admin/collections">Collections</SidebarLink>
          <SidebarLink href="/admin/sources">Sources</SidebarLink>
          <SidebarLink href="/admin/sources/bulk">Import Sources</SidebarLink>
          <SidebarLink href="/admin/faqs">FAQs</SidebarLink>
          <SidebarLink href="/admin/faqs/bulk">Import FAQs</SidebarLink>

          <div className="pt-6 border-t mt-6">
            <form action="/admin/logout" method="POST">
              <button
                type="submit"
                className="w-full text-left text-red-600 hover:text-red-800 transition"
              >
                Logout
              </button>
            </form>
          </div>
        </nav>
      </aside>

      <main className="flex-1 bg-gray-50">{children}</main>
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

function isPrivateOrLocalIp(value: string) {
  if (value === "127.0.0.1" || value === "0.0.0.0") {
    return true
  }

  if (value.includes(":")) {
    const normalized = value.toLowerCase()

    return (
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80:") ||
      normalized.startsWith("fec0:")
    )
  }

  const octets = value.split(".").map(Number)
  if (octets.length !== 4 || octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) {
    return false
  }

  const [first, second] = octets

  return (
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254)
  )
}

function SidebarLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Link href={href} className="text-gray-600 hover:text-black transition">
      {children}
    </Link>
  )
}
