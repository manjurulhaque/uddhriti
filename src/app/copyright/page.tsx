import * as React from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { PublicLayout, LegalNav } from "@/components/public"

export const metadata: Metadata = {
  title: "Copyright & Fair Use Policy | Uddhriti",
  description:
    "Scholarly fair use principles, attribution standards, public domain works, and formal DMCA notice and takedown procedures for the Uddhriti literary archive.",
}

export default function CopyrightPage() {
  const lastUpdated = "October 26, 2026"

  const sections = [
    { id: "mission-fair-use", title: "1. Scholarly Mission & Fair Use" },
    { id: "public-domain", title: "2. Public Domain & Historical Texts" },
    { id: "attribution-standards", title: "3. Attribution & Provenance" },
    { id: "dmca-takedown", title: "4. DMCA Notice & Takedown Process" },
    { id: "counter-notice", title: "5. Counter-Notification Procedure" },
    { id: "errata-corrections", title: "6. Scholarly Errata & Corrections" },
    { id: "designated-agent", title: "7. Designated Copyright Agent" },
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
          <span className="text-stone-900 font-medium">Copyright &amp; Fair Use</span>
        </nav>

        {/* Page Header */}
        <header className="border-b border-stone-900/10 pb-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-rust)]">
              Intellectual Property &amp; Archival Rights
            </span>
            <span className="text-xs font-mono text-stone-500 bg-white/70 rounded-full px-3 py-1 border border-stone-200">
              Last Updated: {lastUpdated}
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--ink-900)]">
            Copyright &amp; Fair Use Policy
          </h1>
          <p className="text-base sm:text-lg text-stone-600 leading-relaxed font-serif max-w-3xl">
            Uddhriti is committed to the protection of intellectual property while honoring the centuries-old
            tradition of quotation, criticism, scholarly commentary, and educational fair use.
          </p>

          <div className="pt-2">
            <LegalNav currentPath="/copyright" />
          </div>
        </header>

        {/* Executive Summary Callout */}
        <div className="rounded-2xl border border-[var(--accent-rust)]/20 bg-[var(--accent-rust)]/5 p-6 sm:p-7">
          <div className="flex items-start gap-3.5">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-rust)] text-white shadow-2xs">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <div className="space-y-1.5 text-xs sm:text-sm text-stone-800">
              <h2 className="font-serif text-base font-bold text-[var(--ink-900)]">
                Our Archival Copyright Framework
              </h2>
              <ul className="list-disc pl-4 space-y-1 text-stone-700">
                <li><strong>Fair Use / Fair Dealing:</strong> Short excerpts are reproduced for historical documentation, critique, education, and philosophical research.</li>
                <li><strong>Public Domain Heritage:</strong> Works out of copyright (including pre-1929 texts) are celebrated as the shared cultural heritage of humankind.</li>
                <li><strong>Rapid DMCA Compliance:</strong> We promptly review and honor valid notices of copyright infringement sent to our Designated Agent.</li>
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
            <section id="mission-fair-use" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-900)]">
                1. Scholarly Mission &amp; Fair Use
              </h2>
              <p>
                Uddhriti (&ldquo;উদ্ধৃতি&rdquo; means &ldquo;quotation&rdquo; or &ldquo;citation&rdquo; in Bengali) is designed
                as a digital common for reflection, literary exploration, and historical reference.
              </p>
              <p>
                Under Section 107 of the United States Copyright Act (17 U.S.C. &sect; 107) and international equivalents
                (including Article 10(1) of the Berne Convention for the Protection of Literary and Artistic Works),
                the reproduction of brief excerpts from copyrighted works is permissible for purposes such as criticism,
                comment, news reporting, teaching, scholarship, and research.
              </p>
              <div className="rounded-xl border border-stone-200/90 bg-white p-5 space-y-2 text-xs sm:text-sm">
                <h3 className="font-serif font-bold text-stone-900">The Four Fair Use Factors Applied to Uddhriti:</h3>
                <ul className="list-disc pl-4 space-y-1.5 text-stone-600">
                  <li><strong>Purpose and Character:</strong> Transformative, non-commercial scholarly indexing, categorizing, and biographical annotation.</li>
                  <li><strong>Nature of the Work:</strong> Informational citation of published philosophical, historical, and literary statements.</li>
                  <li><strong>Amount and Substantiality:</strong> Limited to brief, memorable sentences or passages representing a minuscule fraction of the full original source work.</li>
                  <li><strong>Effect upon Market Value:</strong> Does not substitute for the full original book, speech recording, or published treatise; rather, quotation entries stimulate reader interest in discovering and purchasing the complete source text.</li>
                </ul>
              </div>
            </section>

            {/* Section 2 */}
            <section id="public-domain" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-900)]">
                2. Public Domain &amp; Historical Texts
              </h2>
              <p>
                A substantial portion of the Uddhriti archive consists of quotations from historical figures—such as
                Socrates, Confucius, Rabindranath Tagore, Jane Austen, Marcus Aurelius, and William Shakespeare—whose
                works are firmly in the public domain.
              </p>
              <p>
                Public domain texts are free from copyright restrictions under applicable laws (e.g., works published
                prior to January 1, 1929 in the United States, or where the author passed away over 70 years ago in jurisdictions
                applying the life-plus-70 rule). Uddhriti freely disseminates these cultural treasures for the enrichment of all humanity.
              </p>
            </section>

            {/* Section 3 */}
            <section id="attribution-standards" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-900)]">
                3. Attribution &amp; Provenance
              </h2>
              <p>
                Scholarly integrity requires exact attribution. Whenever known, our editorial records identify:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-stone-600 text-sm sm:text-base">
                <li>The author, speaker, or philosopher.</li>
                <li>The primary source title (book, letter, lecture, or recorded speech).</li>
                <li>The original publication year or historical date of utterance.</li>
                <li>Translator credits and original language provenance where applicable.</li>
              </ul>
              <p className="text-stone-600 text-sm">
                If an author or their estate prefers that an excerpt not be highlighted in our thematic database,
                we honor reasonable editorial requests promptly as a matter of cultural goodwill.
              </p>
            </section>

            {/* Section 4 */}
            <section id="dmca-takedown" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-900)]">
                4. DMCA Notice &amp; Takedown Process
              </h2>
              <p>
                In accordance with Title II of the Digital Millennium Copyright Act (17 U.S.C. &sect; 512), Uddhriti
                maintains a notice-and-takedown procedure for copyright owners.
              </p>
              <p>
                If you are a copyright owner (or an authorized agent) and believe in good faith that any content hosted
                on Uddhriti infringes upon your copyright, please provide a written notification to our Designated Copyright
                Agent containing the following statutory information:
              </p>

              <div className="rounded-xl border border-stone-200/90 bg-white p-5 space-y-2 text-xs sm:text-sm">
                <ol className="list-decimal pl-5 space-y-2 text-stone-700">
                  <li>
                    <strong>Physical or Electronic Signature:</strong> An authorized signature of the person entitled to act on behalf of the copyright holder.
                  </li>
                  <li>
                    <strong>Identification of the Work:</strong> A description of the copyrighted work claimed to have been infringed (or a representative list if multiple works).
                  </li>
                  <li>
                    <strong>Identification of Infringing Material:</strong> The specific URL(s) on Uddhriti where the claimed material is located so we can locate it quickly.
                  </li>
                  <li>
                    <strong>Contact Information:</strong> Your full legal name, mailing address, telephone number, and email address.
                  </li>
                  <li>
                    <strong>Good Faith Statement:</strong> A statement that you have a good faith belief that the disputed use of the material is not authorized by the copyright owner, its agent, or the law.
                  </li>
                  <li>
                    <strong>Perjury Statement:</strong> A statement that the information in your notification is accurate, and under penalty of perjury, that you are the copyright owner or authorized to act on their behalf.
                  </li>
                </ol>
              </div>

              <p className="text-stone-500 text-xs italic">
                Please note that under 17 U.S.C. &sect; 512(f), any person who knowingly materially misrepresents that
                material or activity is infringing may be subject to liability for damages, including costs and attorney fees.
              </p>
            </section>

            {/* Section 5 */}
            <section id="counter-notice" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-900)]">
                5. Counter-Notification Procedure
              </h2>
              <p>
                If material you submitted was removed or disabled as a result of a DMCA takedown notice and you believe
                such removal was due to a mistake, misidentification, or legitimate fair use privilege, you may file a written
                counter-notification with our Designated Agent pursuant to 17 U.S.C. &sect; 512(g).
              </p>
            </section>

            {/* Section 6 */}
            <section id="errata-corrections" className="scroll-mt-24 space-y-3">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-900)]">
                6. Scholarly Errata &amp; Corrections
              </h2>
              <p>
                The Internet is saturated with misattributed quotes (e.g. quotes erroneously assigned to Albert Einstein,
                Mark Twain, or Buddha). Uddhriti strives to be an antidote to false citations.
              </p>
              <p>
                If you have documentary proof that a quotation on Uddhriti has been misattributed, misquoted, or taken
                severely out of historical context, please send bibliographic citations, page numbers, or primary scans to{" "}
                <span className="font-mono text-stone-800 font-semibold text-xs">editorial@uddhriti.org</span>.
                We actively celebrate scholar and reader contributions to our errata ledger.
              </p>
            </section>

            {/* Section 7 */}
            <section id="designated-agent" className="scroll-mt-24 space-y-4">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-900)]">
                7. Designated Copyright Agent
              </h2>
              <div className="rounded-xl border border-stone-200/90 bg-white p-6 shadow-xs space-y-3">
                <h3 className="font-serif font-bold text-stone-900">Uddhriti DMCA &amp; Rights Compliance Officer</h3>
                <p className="text-sm text-stone-600">
                  All copyright notices, takedown requests, and scholarly licensing inquiries should be addressed to:
                </p>
                <div className="text-xs sm:text-sm text-stone-700 space-y-1 font-mono">
                  <p>Attn: Copyright Agent</p>
                  <p>Uddhriti Literary Archive &amp; Digital Humanities Project</p>
                  <p>Email: <a href="mailto:dmca@uddhriti.org" className="text-[var(--accent-rust)] underline">dmca@uddhriti.org</a></p>
                  <p>Secondary: <a href="mailto:legal@uddhriti.org" className="text-[var(--accent-rust)] underline">legal@uddhriti.org</a></p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
