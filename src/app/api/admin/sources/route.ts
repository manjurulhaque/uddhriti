import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdmin } from "@/lib/auth/getAdmin"
import { sourceSchema } from "@/lib/validation/source"
import { normalizeSourceYearInput, parseSourceYearInput } from "@/lib/sourceYear"

function getSourceYearLabel(raw: { year?: unknown; yearLabel?: unknown } | null) {
  return normalizeSourceYearInput(raw?.yearLabel) ?? normalizeSourceYearInput(raw?.year)
}

export async function GET() {
  const admin = await getAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sources = await prisma.source.findMany({
    include: {
      author: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(sources)
}

export async function POST(req: Request) {
  const admin = await getAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const raw = await req.json().catch(() => null)
  const parsedYear = parseSourceYearInput(raw?.year, raw?.yearApproximate)
  if (parsedYear.invalid) {
    return NextResponse.json(
      { error: "Invalid year format. Use 1595, -300, or c. 1595-1596." },
      { status: 400 }
    )
  }

  const parsed = sourceSchema.safeParse({
    ...raw,
    year: parsedYear.year,
    yearLabel: getSourceYearLabel(raw),
    yearApproximate: parsedYear.approximate,
  })
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", errors: parsed.error.flatten() },
      { status: 400 }
    )
  }

  if (parsed.data.authorId) {
    const author = await prisma.author.findUnique({
      where: { id: parsed.data.authorId },
      select: { id: true },
    })
    if (!author) {
      return NextResponse.json(
        { error: "Invalid authorId" },
        { status: 400 }
      )
    }
  }

  try {
    const source = await prisma.source.create({
      data: {
        title: parsed.data.title,
        slug: parsed.data.slug,
        type: parsed.data.type,
        year: parsed.data.year ?? null,
        yearLabel: parsed.data.yearLabel ?? null,
        yearApproximate: parsed.data.yearApproximate ?? false,
        publisher: parsed.data.publisher || null,
        location: parsed.data.location || null,
        description: parsed.data.description || null,
        externalUrl: parsed.data.externalUrl || null,
        authorId: parsed.data.authorId || null,
      },
    })

    return NextResponse.json(source)
  } catch {
    return NextResponse.json(
      { error: "Unable to create source. Title/slug may already exist." },
      { status: 409 }
    )
  }
}
