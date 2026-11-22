import * as React from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { PublicLayout, LegalNav, Breadcrumb } from "@/components/public"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how Quotzen respects and protects your privacy. We are committed to minimal data collection, privacy-first analytics, and absolute transparency.",
}

export default function PrivacyPage() {
  const effectiveDate = "October 26, 2026"
  const lastUpdated = "October 26, 2026"

  const sections = [
    { id: "overview", title: "1. Overview & Scholarly Mission" },
    { id: "information-we-collect", title: "2. Information We Collect" },
    { id: "how-we-use-information", title: "3. How We Use Information" },
    { id: "cookies-and-storage", title: "4. Cookies & Web Storage" },
    { id: "third-party-services", title: "5. Third-Party Service Providers" },
    { id: "data-retention-security", title: "6. Data Retention & Security" },
    { id: "your-privacy-rights", title: "7. Your Privacy Rights (GDPR & CCPA)" },
    { id: "children-privacy", title: "8. Children's Privacy" },
    { id: "policy-updates", title: "9. Policy Updates & Contact" },
  ]

  return (
    <PublicLayout>
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12 space-y-10 font-sans">
        {/* Breadcrumb Navigation */}
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Legal" },
            { label: "Privacy Policy" },
          ]}
        />

        {/* Page Header */}
        <header className="border-b border-stone-900/10 pb-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-rust)]">
              Legal &amp; Privacy Safeguards
            </span>
            <span className="text-xs font-mono text-stone-500 bg-white/70 rounded-full px-3 py-1 border border-stone-200">
              Effective Date: {effectiveDate} &middot; Last Updated: {lastUpdated}
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--ink-900)]">
            Privacy Policy
          </h1>
          <p className="text-base sm:text-lg text-stone-600 leading-relaxed font-serif max-w-3xl">
            Quotzen is an open literary sanctuary dedicated to human wisdom. We believe reading,
            researching, and reflecting on timeless ideas should never require surrendering your personal privacy.
          </p>

          <div className="pt-2">
            <LegalNav currentPath="/privacy" />
          </div>
        </header>

        {/* Executive Summary / At-a-Glance Callout */}
        <div className="rounded-2xl border border-[var(--accent-rust)]/20 bg-[var(--accent-rust)]/5 p-6 sm:p-7">
          <div className="flex items-start gap-3.5">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-rust)] text-white shadow-2xs">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="space-y-1.5 text-xs sm:text-sm text-stone-800">
              <h2 className="font-serif text-base font-bold text-[var(--ink-900)]">
                Our Privacy Pledge in Brief
              </h2>
              <ul className="list-disc pl-4 space-y-1 text-stone-700">
                <li><strong>No ad-tracking or cross-site profiling:</strong> We never sell, rent, or monetize your personal data.</li>
                <li><strong>Privacy-first analytics:</strong> We use aggregated, cookieless metrics (via Vercel Analytics) to monitor uptime and reader interest without tracking individual readers.</li>
                <li><strong>Minimal data collection:</strong> You do not need an account to browse, search, or read quotes. Only editorial staff require credentials.</li>
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
          <div className="min-w-0 lg:col-span-3 space-y-10 text-stone-700 leading-relaxed text-sm sm:text-base">
            {/* Section 1 */}
            <section id="overview" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-900)]">
                1. Overview &amp; Scholarly Mission
              </h2>
              <p>
                Welcome to <strong>Quotzen</strong>, accessible at{" "}
                <span className="font-mono text-xs bg-stone-100 px-1.5 py-0.5 rounded">https://www.quotzen.com</span>.
                Quotzen operates as an archival, literary, and educational database dedicated to the curation of
                philosophical quotations, historic speeches, and literary passages.
              </p>
              <p>
                This Privacy Policy explains how we collect, process, and safeguard information when you interact
                with our website, browse quotes, navigate taxonomy categories, or communicate with our editorial team.
                By using Quotzen, you acknowledge the practices described herein.
              </p>
            </section>

            {/* Section 2 */}
            <section id="information-we-collect" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-900)]">
                2. Information We Collect
              </h2>
              <p>We adhere to strict data minimization principles. We collect only what is strictly necessary:</p>
              <div className="space-y-3 pl-2">
                <div className="border-l-2 border-[var(--accent-rust)]/40 pl-4 py-1">
                  <h3 className="font-serif font-bold text-[var(--ink-900)]">A. Information Automatically Collected</h3>
                  <p className="text-sm text-stone-600 mt-1">
                    When you access the site, our edge infrastructure automatically receives standard technical logs,
                    such as coarse geographical location (country or region level), browser user-agent, operating system,
                    referring URLs, and timestamp. These logs are used exclusively for security, load balancing, and
                    protecting against automated denial-of-service abuse.
                  </p>
                </div>
                <div className="border-l-2 border-[var(--accent-rust)]/40 pl-4 py-1">
                  <h3 className="font-serif font-bold text-[var(--ink-900)]">B. Information You Provide Directly</h3>
                  <p className="text-sm text-stone-600 mt-1">
                    If you submit a copyright inquiry, editorial correction, or correspondence to our team, we retain
                    the correspondence (including your name, email address, and message contents) solely to respond
                    and address your request.
                  </p>
                </div>
                <div className="border-l-2 border-[var(--accent-rust)]/40 pl-4 py-1">
                  <h3 className="font-serif font-bold text-[var(--ink-900)]">C. Administrative Accounts</h3>
                  <p className="text-sm text-stone-600 mt-1">
                    Only authorized editors and platform administrators hold accounts. For these accounts, authentication
                    credentials and access tokens are managed via secure, encrypted authentication services (Supabase Auth).
                  </p>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section id="how-we-use-information" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-900)]">
                3. How We Use Information
              </h2>
              <p>We process the minimal data collected for legitimate, limited purposes:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-stone-600 text-sm sm:text-base">
                <li>To serve page requests swiftly via edge content delivery networks (CDNs).</li>
                <li>To measure platform health, Core Web Vitals, and page load performance.</li>
                <li>To diagnose technical errors, system anomalies, and database query bottlenecks.</li>
                <li>To safeguard the integrity of the archive against malicious scraping, spam, or denial-of-service attacks.</li>
                <li>To evaluate community feedback, scholarly corrections, and attribution adjustments.</li>
              </ul>
              <p className="text-stone-600 text-sm">
                We do not construct advertising profiles, we do not participate in real-time ad bidding (RTB),
                and we never share reader habits with data brokers.
              </p>
            </section>

            {/* Section 4 */}
            <section id="cookies-and-storage" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-900)]">
                4. Cookies &amp; Web Storage
              </h2>
              <p>
                Quotzen utilizes minimal browser storage technologies. We do not use third-party marketing or
                behavioral advertising cookies. For public readers, analytics are cookieless.
              </p>
              <p>
                For detailed disclosure on local storage keys, session tokens, and how to manage browser preferences,
                please consult our dedicated <Link href="/cookies" className="text-[var(--accent-rust)] font-medium hover:underline">Cookie Policy</Link>.
              </p>
            </section>

            {/* Section 5 */}
            <section id="third-party-services" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-900)]">
                5. Third-Party Service Providers
              </h2>
              <p>We rely on carefully selected infrastructure partners that adhere to rigorous privacy standards:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="rounded-xl border border-stone-200/90 bg-white p-4 shadow-2xs">
                  <h3 className="font-serif font-bold text-stone-900">Vercel Inc.</h3>
                  <p className="text-xs text-stone-600 mt-1">
                    Hosts application serverless functions, Edge Middleware, and provides aggregated, privacy-compliant
                    Web Analytics and Speed Insights.
                  </p>
                </div>
                <div className="rounded-xl border border-stone-200/90 bg-white p-4 shadow-2xs">
                  <h3 className="font-serif font-bold text-stone-900">Supabase &amp; PostgreSQL</h3>
                  <p className="text-xs text-stone-600 mt-1">
                    Provides managed database hosting with row-level security and encrypted storage for quotation data
                    and administrative sessions.
                  </p>
                </div>
                <div className="rounded-xl border border-stone-200/90 bg-white p-4 shadow-2xs">
                  <h3 className="font-serif font-bold text-stone-900">Wikimedia Commons</h3>
                  <p className="text-xs text-stone-600 mt-1">
                    Serves public domain and Creative Commons licensed portraits of historical authors via unoptimized
                    direct media links.
                  </p>
                </div>
                <div className="rounded-xl border border-stone-200/90 bg-white p-4 shadow-2xs">
                  <h3 className="font-serif font-bold text-stone-900">Open Library &amp; CrossRef</h3>
                  <p className="text-xs text-stone-600 mt-1">
                    Public API services queried server-side for bibliographic validation of works, ISBNs, and publication dates.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 6 */}
            <section id="data-retention-security" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-900)]">
                6. Data Retention &amp; Security
              </h2>
              <p>
                Technical server logs are automatically rotated and purged on a rolling 30-day schedule. Correspondence
                received regarding editorial corrections or copyright matters is retained only as long as necessary
                to conclude the inquiry and maintain archival integrity.
              </p>
              <p>
                We employ modern transport security (HTTPS / TLS 1.3), Content Security Policies, strict input sanitation,
                and environment variable isolation to protect the archive against unauthorized access or disclosure.
              </p>
            </section>

            {/* Section 7 */}
            <section id="your-privacy-rights" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-900)]">
                7. Your Privacy Rights (GDPR &amp; CCPA)
              </h2>
              <p>
                Depending on your jurisdiction (including the European Economic Area, the United Kingdom, and California),
                you enjoy rights regarding any personal information that may be associated with you:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-stone-600 text-sm sm:text-base">
                <li><strong>Right of Access &amp; Portability:</strong> Request confirmation of what data, if any, is held about you.</li>
                <li><strong>Right to Rectification:</strong> Request correction of inaccurate personal or bibliographic data.</li>
                <li><strong>Right to Erasure (&ldquo;Right to be Forgotten&rdquo;):</strong> Request deletion of your personal communications or user details.</li>
                <li><strong>Right to Object:</strong> Object to processing based on legitimate interests.</li>
              </ul>
              <p className="text-stone-600 text-sm">
                To exercise any of these rights, please contact our privacy desk at{" "}
                <span className="font-mono text-stone-800 font-medium">privacy@quotzen.com</span>.
                We respond to all verified requests within 30 days without charge.
              </p>
            </section>

            {/* Section 8 */}
            <section id="children-privacy" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-900)]">
                8. Children&rsquo;s Privacy
              </h2>
              <p>
                Quotzen is an educational archive designed for general audiences and scholars of all ages.
                We do not knowingly collect personal identifiable information from children under the age of 13
                (or 16 in applicable jurisdictions). If you believe a minor has submitted personal contact details,
                please notify us immediately and we will promptly delete such information.
              </p>
            </section>

            {/* Section 9 */}
            <section id="policy-updates" className="scroll-mt-24 space-y-4">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-900)]">
                9. Policy Updates &amp; Contact
              </h2>
              <p>
                We may periodically update this policy to reflect enhancements in our architecture or legal standards.
                Any modifications will be posted here with a revised &ldquo;Last Updated&rdquo; date.
              </p>
              <div className="rounded-xl border border-stone-200/90 bg-white p-6 shadow-xs space-y-3">
                <h3 className="font-serif font-bold text-stone-900">Contact the Privacy &amp; Editorial Desk</h3>
                <p className="text-sm text-stone-600">
                  Questions, concerns, or requests regarding this Privacy Policy should be directed to:
                </p>
                <div className="text-xs sm:text-sm text-stone-700 space-y-1 font-mono">
                  <p>Quotzen Literary Archive</p>
                  <p>Email: <a href="mailto:privacy@quotzen.com" className="text-[var(--accent-rust)] underline">privacy@quotzen.com</a></p>
                  <p>Editorial Inquiries: <a href="mailto:editorial@quotzen.com" className="text-[var(--accent-rust)] underline">editorial@quotzen.com</a></p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
