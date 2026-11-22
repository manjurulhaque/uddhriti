import { redirect } from "next/navigation"
import { getAdmin } from "@/lib/auth/getAdmin"
import { PageHeader } from "@/components/admin"
import { ActivityClientManager } from "./ActivityClientManager"

export default async function ActivityPage() {
  const admin = await getAdmin()
  if (!admin) {
    redirect("/admin/login")
  }

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Admin Activity & Audit Trail"
        description="Immutable administrative ledger tracking entity modifications, publishing events, bulk actions, and system repairs."
      />

      <ActivityClientManager adminRole={admin.role} adminId={admin.id} />
    </div>
  )
}

