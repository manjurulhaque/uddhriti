import { redirect } from "next/navigation"
import { getAdmin } from "@/lib/auth/getAdmin"
import { QuoteBulkUploadPage } from "../QuoteBulkUploadPage"

export default async function QuoteBulkPage() {
  const admin = await getAdmin()
  if (!admin) {
    redirect("/admin/login")
  }

  if (admin.role !== "SUPER_ADMIN") {
    redirect("/")
  }

  return <QuoteBulkUploadPage />
}
