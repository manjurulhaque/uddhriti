import { redirect } from "next/navigation"
import { getAdmin } from "@/lib/auth/getAdmin"
import { PageHeader } from "@/components/admin"
import { HallucinationDetectorClient } from "./HallucinationDetectorClient"

export default async function HallucinationDetectorPage() {
  const admin = await getAdmin()
  if (!admin || admin.role !== "SUPER_ADMIN") {
    redirect("/admin/login")
  }

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Fake Attribution & Hallucination Detector"
        description="Audit quotation entries against historical canons, internet apocrypha, and Gemini AI fact-checking to detect and resolve misattributed quotes."
      />

      <HallucinationDetectorClient />
    </div>
  )
}
