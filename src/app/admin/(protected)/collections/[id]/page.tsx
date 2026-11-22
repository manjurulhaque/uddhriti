import { Suspense } from "react"
import { notFound, redirect } from "next/navigation"
import { getAdmin } from "@/lib/auth/getAdmin"
import { prisma } from "@/lib/prisma"
import { isValidUuid } from "@/lib/api/route-helpers"
import { PageHeader } from "@/components/admin"
import { EditCollectionForm } from "./EditCollectionForm"
import { CollectionQuotesStream } from "./CollectionQuotesStream"
import { CollectionQuotesSkeleton } from "./CollectionQuotesSkeleton"

export default async function EditCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const admin = await getAdmin()
  if (!admin) redirect("/admin/login")

  const { id } = await params
  if (!isValidUuid(id)) notFound()

  const collection = await prisma.collection.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      visibility: true,
      quoteCount: true,
    },
  })

  if (!collection) notFound()

  return (
    <div className="p-8 max-w-4xl space-y-8">
      <PageHeader
        title={`Edit Collection: ${collection.title}`}
        description="Update collection details, public URL slug, description, or visibility."
        backHref="/admin/collections"
        backLabel="Back to Collections"
      />

      {/* Stream Chunk 1: Collection metadata form renders immediately */}
      <EditCollectionForm initialCollection={collection} />

      {/* Stream Chunk 2: Quotes stream in asynchronously with Suspense fallback */}
      <Suspense fallback={<CollectionQuotesSkeleton />}>
        <CollectionQuotesStream
          collectionId={collection.id}
          collectionTitle={collection.title}
        />
      </Suspense>
    </div>
  )
}
