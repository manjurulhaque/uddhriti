import Link from "next/link"
import { redirect } from "next/navigation"
import { getAdmin } from "@/lib/auth/getAdmin"
import { prisma } from "@/lib/prisma"
import { AuthorsListManager } from "./AuthorsListManager"

export default async function AuthorsPage() {
  const admin = await getAdmin()
  if (!admin) redirect("/admin/login")

  const authors = await prisma.author.findMany({
    orderBy: { createdAt: "desc" },
  })

  const normalizedAuthors = authors.map((author) => ({
    id: author.id,
    name: author.name,
    slug: author.slug,
    birthYear: author.birthYear,
    deathYear: author.deathYear,
    profession: author.profession,
    nationality: author.nationality,
    quoteCount: author.quoteCount,
    createdAt: author.createdAt.toISOString(),
  }))

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Authors</h1>

        <div className="flex gap-2">
          <Link
            href="/admin/authors/bulk"
            className="bg-white border px-4 py-2 rounded"
          >
            Bulk Import
          </Link>
          <Link
            href="/admin/authors/new"
            className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition"
          >
            + New Author
          </Link>
        </div>
      </div>

      <AuthorsListManager authors={normalizedAuthors} />
    </div>
  )
}
