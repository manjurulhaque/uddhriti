import * as React from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { PublicLayout, LegalNav } from "@/components/public"

export const metadata: Metadata = {
  title: "Cookie Policy | Uddhriti",
  description:
    "Learn about how Uddhriti uses essential cookies, browser local storage, and cookieless, privacy-preserving analytics to power the literary archive.",
}

export default function CookiesPage() {
  const lastUpdated = "October 26, 2026"

  const sections = [
    { id: "what-are-cookies", title: "1. What Are Cookies & Web Storage?" },
    { id: "our-privacy-pledge", title: "2. Zero Third-Party Advertising Cookies" },
    { id: "cookie-categories", title: "3. Categories of Storage We Use" },
    { id: "inventory", title: "4. Detailed Storage & Cookie Inventory" },
    { id: "managing-cookies", title: "5. How to Control Cookies in Your Browser" },
    { id: "policy-updates", title: "6. Updates to this Policy & Contact" },
  ]

  const cookieInventory = [
    {
      name: "sb-*-auth-token",
      category: "Essential (Strictly Necessary)",
      provider: "Supabase Auth",
      purpose: "Secures authentication state and cryptographic session tokens for authorized editorial staff accessing the admin dashboard.",
      duration: "Session / 7 Days",
    },
    {
      name: "Vercel Web Analytics",
      category: "Cookieless Analytics",
      provider: "Vercel Inc.",
      purpose: "Aggregates anonymous page request counts and coarse geography without setting persistent client cookies or tracking users across domains.",
      duration: "None (Cookieless)",
    },
    {
      name: "Vercel Speed Insights",
      category: "Performance / Core Web Vitals",
      provider: "Vercel Inc.",
      purpose: "Measures browser rendering performance (First Contentful Paint, Cumulative Layout Shift) to optimize archive load speeds.",
      duration: "Session only",
    },
    {
      name: "reader_theme / prefs",
      category: "Functional (Local Storage)",
      provider: "Uddhriti Archive",
      purpose: "Stores non-identifying client preferences (e.g. search filter state, display density) entirely within your local browser storage.",
      duration: "Persistent on client device",
    },
  ]

  return (
    <PublicLayout>
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12 space-y-10 font-sans">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="text-xs text-stone-500 flex flex-wrap items-center gap-2">
          <Link href="/" className="hover:text-stone-900 transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-stone-700">Legal</span>
          <span>/</span>
          <span className="text-stone-900 font-medium">Cookie Policy</span>
        </nav>

        {/* Page Header */}
        <header className="border-b border-stone-900/10 pb-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-rust)]">
              Transparency &amp; Storage Technologies
            </span>
            <span className="text-xs font-mono text-stone-500 bg-white/70 rounded-full px-3 py-1 border border-stone-200">
              Last Updated: {lastUpdated}
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--ink-900)]">
            Cookie &amp; Storage Policy
          </h1>
          <p className="text-base sm:text-lg text-stone-600 leading-relaxed font-serif max-w-3xl">
            We believe the web should be respectful of readers. Learn how Uddhriti uses minimal, privacy-centric
            storage technologies to maintain platform reliability without commercial surveillance.
          </p>

          <div className="pt-2">
            <LegalNav currentPath="/cookies" />
          </div>
        </header>

        {/* Executive Summary Callout */}
        <div className="rounded-2xl border border-[var(--accent-rust)]/20 bg-[var(--accent-rust)]/5 p-6 sm:p-7">
          <div className="flex items-start gap-3.5">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-rust)] text-white shadow-2xs">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="space-y-1.5 text-xs sm:text-sm text-stone-800">
              <h2 className="font-serif text-base font-bold text-[var(--ink-900)]">
                Key Takeaways on Cookies at Uddhriti
              </h2>
              <ul className="list-disc pl-4 space-y-1 text-stone-700">
                <li><strong>Zero tracking pixels or ad networks:</strong> We do not deploy Meta Pixel, Google AdSense, or third-party marketing cookies.</li>
                <li><strong>Cookieless analytics:</strong> Public readership metrics are anonymous and cookieless, respecting Global Privacy Control (GPC) signals by design.</li>
                <li><strong>Cookies only where necessary:</strong> Browser cookies are strictly limited to authenticated editorial team sessions.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Content Layout with Table of Contents */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          {/* Sidebar Table of Contents */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 rounded-xl border border-stone-200/90 bg-white/90 p-4 shadow-2xs backdrop-blur-xs space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Contents
              </h3>
              <nav className="flex flex-col space-y-1.5 text-xs text-stone-600">
                {sections.map((sec) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    className="hover:text-[var(--accent-rust)] transition-colors py-0.5 leading-snug"
                  >
                    {sec.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Legal Body Sections */}
          <div className="lg:col-span-3 space-y-10 text-stone-700 leading-relaxed text-sm sm:text-base">
            {/* Section 1 */}
            <section id="what-are-cookies" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-900)]">
                1. What Are Cookies &amp; Web Storage?
              </h2>
              <p>
                A cookie is a small data file deposited on your computer or mobile device when visiting a web page.
                Cookies and modern web storage mechanisms (such as HTML5 LocalStorage and SessionStorage) allow web
                applications to remember preferences, preserve security states, and function efficiently.
              </p>
              <p>
                Different types of cookies exist: &ldquo;first-party&rdquo; cookies are set by the website you are directly
                visiting, while &ldquo;third-party&rdquo; cookies are typically set by external advertising and surveillance
                networks across multiple unaffiliated domains.
              </p>
            </section>

            {/* Section 2 */}
            <section id="our-privacy-pledge" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-900)]">
                2. Zero Third-Party Advertising Cookies
              </h2>
              <p>
                Uddhriti is committed to being an ad-free cultural resource. <strong>We do not use any third-party
                advertising cookies, behavioral tracking scripts, or data broker integrations.</strong>
              </p>
              <p>
                You can browse thousands of quotes, authors, and philosophical traditions without any third party
                monitoring your intellectual curiosity for behavioral commercial targeting.
              </p>
            </section>

            {/* Section 3 */}
            <section id="cookie-categories" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-900)]">
                3. Categories of Storage We Use
              </h2>
              <div className="space-y-4">
                <div className="rounded-xl border border-stone-200/90 bg-white p-4 shadow-2xs space-y-1">
                  <h3 className="font-serif font-bold text-stone-900">A. Strictly Necessary &amp; Security</h3>
                  <p className="text-xs sm:text-sm text-stone-600">
                    Required for the website to function securely. These tokens verify editorial credentials, protect
                    against cross-site request forgery (CSRF), and ensure encrypted transactions with our database backend.
                  </p>
                </div>
                <div className="rounded-xl border border-stone-200/90 bg-white p-4 shadow-2xs space-y-1">
                  <h3 className="font-serif font-bold text-stone-900">B. Performance &amp; Web Vitals</h3>
                  <p className="text-xs sm:text-sm text-stone-600">
                    We use Vercel Analytics and Speed Insights to collect aggregate, privacy-first telemetry on page load speeds,
                    DNS resolution latency, and visual stability without collecting personal identifiers.
                  </p>
                </div>
                <div className="rounded-xl border border-stone-200/90 bg-white p-4 shadow-2xs space-y-1">
                  <h3 className="font-serif font-bold text-stone-900">C. Reader Preferences (Local Storage)</h3>
                  <p className="text-xs sm:text-sm text-stone-600">
                    Kept strictly within your device&rsquo;s local browser storage to save your UI preferences (such as
                    search filters or display options). These entries are never transmitted to our remote servers.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 4 */}
            <section id="inventory" className="scroll-mt-24 space-y-4">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-900)]">
                4. Detailed Storage &amp; Cookie Inventory
              </h2>
              <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50/70 font-semibold text-stone-800">
                      <th className="p-3">Identifier / Technology</th>
                      <th className="p-3">Provider</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Purpose</th>
                      <th className="p-3">Lifespan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-600">
                    {cookieInventory.map((item) => (
                      <tr key={item.name} className="hover:bg-stone-50/40">
                        <td className="p-3 font-mono font-medium text-stone-900">{item.name}</td>
                        <td className="p-3">{item.provider}</td>
                        <td className="p-3 font-medium text-[var(--accent-rust)]">{item.category}</td>
                        <td className="p-3">{item.purpose}</td>
                        <td className="p-3 font-mono text-[11px]">{item.duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 5 */}
            <section id="managing-cookies" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-900)]">
                5. How to Control Cookies in Your Browser
              </h2>
              <p>
                Most modern web browsers allow you to control cookie settings through their options or preferences menu.
                You can configure your browser to reject all cookies, notify you when a cookie is placed, or delete
                stored cookies at any time:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-stone-600 text-xs sm:text-sm">
                <li><strong>Google Chrome:</strong> Settings &rarr; Privacy and security &rarr; Third-party cookies.</li>
                <li><strong>Mozilla Firefox:</strong> Settings &rarr; Privacy &amp; Security &rarr; Enhanced Tracking Protection.</li>
                <li><strong>Apple Safari:</strong> Settings &rarr; Safari &rarr; Advanced &rarr; Block All Cookies.</li>
                <li><strong>Microsoft Edge:</strong> Settings &rarr; Cookies and site permissions &rarr; Manage and delete cookies.</li>
              </ul>
              <p className="text-xs text-stone-500">
                Note: Disabling all cookies will not impact public reading of quotes, but will prevent editorial staff
                from logging into the administrative curation dashboard.
              </p>
            </section>

            {/* Section 6 */}
            <section id="policy-updates" className="scroll-mt-24 space-y-4">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-900)]">
                6. Updates to this Policy &amp; Contact
              </h2>
              <p>
                We may modify this Cookie Policy to reflect changes in technical infrastructure or regulatory standards.
                Any adjustments will be updated on this page with an updated revision date.
              </p>
              <div className="rounded-xl border border-stone-200/90 bg-white p-6 shadow-xs space-y-3">
                <h3 className="font-serif font-bold text-stone-900">Questions Concerning Storage Practices?</h3>
                <p className="text-sm text-stone-600">
                  For inquiries about our cookie and storage practices, please contact:
                </p>
                <div className="text-xs sm:text-sm text-stone-700 space-y-1 font-mono">
                  <p>Uddhriti Privacy Operations</p>
                  <p>Email: <a href="mailto:privacy@uddhriti.org" className="text-[var(--accent-rust)] underline">privacy@uddhriti.org</a></p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
