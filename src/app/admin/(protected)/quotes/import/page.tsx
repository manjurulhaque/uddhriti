import { redirect } from "next/navigation"
import { getAdmin } from "@/lib/auth/getAdmin"
import { QuoteBulkUploadPage } from "../QuoteBulkUploadPage"

export default async function QuoteBulkImportPage() {
  const admin = await getAdmin()
  if (!admin || admin.role !== "SUPER_ADMIN") {
    redirect("/admin/login")
  }

  return <QuoteBulkUploadPage />
}
