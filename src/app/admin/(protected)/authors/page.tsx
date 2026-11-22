import { redirect } from "next/navigation"
import { getAdmin } from "@/lib/auth/getAdmin"
import { prisma } from "@/lib/prisma"
import { AuthorsListManager } from "./AuthorsListManager"
import { PageHeader } from "@/components/admin"

export default async function AuthorsPage() {
  const admin = await getAdmin()
  if (!admin) redirect("/admin/login")

  const authors = await prisma.author.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      birthYear: true,
      deathYear: true,
      profession: true,
      nationality: true,
      quoteCount: true,
      bio: true,
      createdAt: true,
    },
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
    hasBio: Boolean(author.bio && author.bio.trim().length > 0),
    bio: author.bio,
    createdAt: author.createdAt.toISOString(),
  }))

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Authors"
        description="Manage writer, speaker, and historical figure profiles."
        secondaryAction={{
          label: "Bulk Import",
          href: "/admin/authors/bulk",
        }}
        primaryAction={{
          label: "+ New Author",
          href: "/admin/authors/new",
        }}
      />


      <AuthorsListManager authors={normalizedAuthors} />
    </div>
  )
}
