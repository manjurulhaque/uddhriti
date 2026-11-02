import { redirect } from "next/navigation"
import { getAdmin } from "@/lib/auth/getAdmin"
import { PageHeader } from "@/components/admin"
import { ToolsClientManager } from "./ToolsClientManager"

export default async function ToolsPage() {
  const admin = await getAdmin()
  if (!admin || admin.role !== "SUPER_ADMIN") {
    redirect("/admin/login")
  }

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="System Health & Maintenance"
        description="Integrity diagnostics, count synchronizations, deduplication audits, and automated maintenance."
      />

      <ToolsClientManager initialReport={null} />
    </div>
  )
}

