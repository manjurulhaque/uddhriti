import * as React from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { PublicLayout, LegalNav } from "@/components/public"

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms and conditions governing the access, educational research, and scholarly use of the Quotzen quotations database and literary archive.",
}

export default function TermsPage() {
  const lastUpdated = "October 26, 2026"

  const sections = [
    { id: "acceptance", title: "1. Acceptance of Terms" },
    { id: "nature-of-service", title: "2. Nature of the Service" },
    { id: "acceptable-use", title: "3. Permitted & Acceptable Use" },
    { id: "intellectual-property", title: "4. Intellectual Property & Quotations" },
    { id: "scholarly-accuracy", title: "5. Citations & Scholarly Accuracy" },
    { id: "external-references", title: "6. External Reference Links" },
    { id: "disclaimer-warranties", title: "7. Disclaimer of Warranties" },
    { id: "limitation-liability", title: "8. Limitation of Liability" },
    { id: "modifications-law", title: "9. Modifications & Governing Law" },
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
          <span className="text-stone-900 font-medium">Terms of Service</span>
        </nav>

        {/* Page Header */}
        <header className="border-b border-stone-900/10 pb-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-rust)]">
              Terms of Use &amp; Archive Guidelines
            </span>
            <span className="text-xs font-mono text-stone-500 bg-white/70 rounded-full px-3 py-1 border border-stone-200">
              Last Updated: {lastUpdated}
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--ink-900)]">
            Terms of Service
          </h1>
          <p className="text-base sm:text-lg text-stone-600 leading-relaxed font-serif max-w-3xl">
            These terms define the guidelines for reading, citing, and exploring quotes within the Quotzen
            archive. We are committed to fostering open scholarship, responsible citation, and respectful research.
          </p>

          <div className="pt-2">
            <LegalNav currentPath="/terms" />
          </div>
        </header>

        {/* Executive Summary Callout */}
        <div className="rounded-2xl border border-[var(--accent-rust)]/20 bg-[var(--accent-rust)]/5 p-6 sm:p-7">
          <div className="flex items-start gap-3.5">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-rust)] text-white shadow-2xs">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="space-y-1.5 text-xs sm:text-sm text-stone-800">
              <h2 className="font-serif text-base font-bold text-[var(--ink-900)]">
                Key Principles for Readers &amp; Scholars
              </h2>
              <ul className="list-disc pl-4 space-y-1 text-stone-700">
                <li><strong>Open reading &amp; citation:</strong> You are encouraged to read, study, share, and cite quotations with proper historical attribution.</li>
                <li><strong>Respect for authors:</strong> Quotations remain the intellectual property of their original creators or heirs.</li>
                <li><strong>Archive preservation:</strong> Automated scraping or denial-of-service traffic that burdens our infrastructure or compromises availability is strictly prohibited.</li>
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
            <section id="acceptance" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-900)]">
                1. Acceptance of Terms
              </h2>
              <p>
                By accessing, browsing, or utilizing the Quotzen platform (&ldquo;Service&rdquo; or &ldquo;Archive&rdquo;),
                you enter into a legally binding agreement to comply with these Terms of Service, along with our{" "}
                <Link href="/privacy" className="text-[var(--accent-rust)] font-medium hover:underline">Privacy Policy</Link>{" "}
                and <Link href="/copyright" className="text-[var(--accent-rust)] font-medium hover:underline">Copyright &amp; Fair Use Policy</Link>.
              </p>
              <p>
                If you do not agree with any provision of these terms, please discontinue your use of the platform immediately.
              </p>
            </section>

            {/* Section 2 */}
            <section id="nature-of-service" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-900)]">
                2. Nature of the Service
              </h2>
              <p>
                Quotzen is an educational, non-commercial literary reference database. The archive compiles quotations,
                aphorisms, excerpts from literary works, philosophical dissertations, historical speeches, and interviews.
                Each entry is cataloged with available biographical details, source texts, historical year of publication,
                thematic categories, and keywords to aid human inquiry and scholarly discernment.
              </p>
            </section>

            {/* Section 3 */}
            <section id="acceptable-use" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-900)]">
                3. Permitted &amp; Acceptable Use
              </h2>
              <p>You may use Quotzen for legitimate scholarly, educational, personal, and research endeavors. Specifically:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-stone-600 text-sm sm:text-base">
                <li>You may read, search, bookmark, and share links to individual quotation pages.</li>
                <li>You may cite excerpts under recognized fair use / fair dealing doctrines, providing clear attribution to the original author and source.</li>
              </ul>
              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 space-y-2 mt-4 text-xs sm:text-sm">
                <h3 className="font-serif font-bold text-rose-950">Prohibited Activities:</h3>
                <ul className="list-disc pl-4 space-y-1 text-rose-900/90">
                  <li>Deploying aggressive, unthrottled scrapers or bots that overwhelm server capacity or degrade quality of service for other readers.</li>
                  <li>Attempting to bypass access controls, authentication barriers, or security parameters protecting the administrative dashboard.</li>
                  <li>Using the site to transmit malicious code, viruses, or automate unauthorized requests.</li>
                  <li>Misrepresenting the authorship, provenance, or context of historical texts in a deceptive or defamatory manner.</li>
                </ul>
              </div>
            </section>

            {/* Section 4 */}
            <section id="intellectual-property" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-900)]">
                4. Intellectual Property &amp; Quotations
              </h2>
              <div className="space-y-3">
                <p>
                  <strong>A. Quotation Excerpts:</strong> Quotzen does not claim proprietary ownership over the individual
                  quotations, speeches, or literary excerpts displayed on the platform. Such excerpts are the intellectual
                  property of their original creators, estates, or public domain archives. Their presentation on Quotzen
                  is conducted strictly under international fair use and educational doctrines.
                </p>
                <p>
                  <strong>B. Compilation &amp; Platform Architecture:</strong> The unique compilation, editorial taxonomies,
                  tagging schemas, database structure, curatorial annotations, graphic design, and software code constituting
                  Quotzen are the property of Quotzen and are protected under copyright, trademark, and database compilation laws.
                </p>
              </div>
            </section>

            {/* Section 5 */}
            <section id="scholarly-accuracy" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-900)]">
                5. Citations &amp; Scholarly Accuracy
              </h2>
              <p>
                Our editorial team takes reasonable steps to cross-reference quotations against primary historical sources,
                library catalogs (Library of Congress, Open Library, CrossRef), and canonical publications to mitigate
                the proliferation of apocryphal or misattributed quotations.
              </p>
              <p>
                However, historical transmission of sayings frequently involves variants, translation nuances, and debate.
                We provide all material on an &ldquo;as is&rdquo; basis. If you identify a citation inaccuracy or translation dispute,
                we encourage you to notify us at <span className="font-mono text-xs font-semibold text-stone-800">editorial@quotzen.com</span>.
              </p>
            </section>

            {/* Section 6 */}
            <section id="external-references" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-900)]">
                6. External Reference Links
              </h2>
              <p>
                For deeper research, our records link to third-party resources such as Wikimedia Commons, WorldCat,
                Open Library, Internet Archive, and scholarly publishers. Quotzen exercises no editorial or operational
                control over third-party destinations and assumes no responsibility for their content, policies, or availability.
              </p>
            </section>

            {/* Section 7 */}
            <section id="disclaimer-warranties" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-900)]">
                7. Disclaimer of Warranties
              </h2>
              <p className="text-xs uppercase tracking-wide text-stone-500 font-mono">
                PLEASE READ CAREFULLY
              </p>
              <p>
                THE QUOTZEN SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE,&rdquo; WITHOUT EXPRESS OR IMPLIED
                WARRANTIES OF ANY KIND, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
                PARTICULAR SCHOLARLY PURPOSE, CONTINUOUS AVAILABILITY, OR FREEDOM FROM TRANSMISSION ERRORS.
              </p>
            </section>

            {/* Section 8 */}
            <section id="limitation-liability" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-900)]">
                8. Limitation of Liability
              </h2>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, QUOTZEN, ITS CONTRIBUTORS, CURATORS, AND OPERATORS SHALL NOT
                BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES RESULTING FROM YOUR
                ACCESS TO, USE OF, OR INABILITY TO ACCESS THE ARCHIVE OR ANY RELIANCE PLACED ON HISTORICAL EXCERPTS.
              </p>
            </section>

            {/* Section 9 */}
            <section id="modifications-law" className="scroll-mt-24 space-y-4">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-900)]">
                9. Modifications &amp; Governing Law
              </h2>
              <p>
                We reserve the right to revise these Terms of Service at any time. Material revisions will be reflected
                by updating the &ldquo;Last Updated&rdquo; timestamp at the top of this document. Continued engagement with the
                Archive constitutes consent to the modified terms.
              </p>
              <div className="rounded-xl border border-stone-200/90 bg-white p-6 shadow-xs space-y-3">
                <h3 className="font-serif font-bold text-stone-900">Questions Regarding Terms</h3>
                <p className="text-sm text-stone-600">
                  For formal legal correspondence or questions about archive policies:
                </p>
                <div className="text-xs sm:text-sm text-stone-700 space-y-1 font-mono">
                  <p>Quotzen Legal Desk</p>
                  <p>Email: <a href="mailto:legal@quotzen.com" className="text-[var(--accent-rust)] underline">legal@quotzen.com</a></p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
