import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"

export async function parseJsonObjectBody(req: Request) {
  const body = await req.json().catch(() => null)
  return body && typeof body === "object" ? body : null
}

export function invalidJsonBodyResponse() {
  return NextResponse.json(
    {
      error: "Validation failed",
      errors: { formErrors: ["Invalid JSON body"], fieldErrors: {} },
    },
    { status: 400 }
  )
}

type PrismaRouteErrorMessages = {
  unique?: string
  foreignKey?: string
}

export function mapPrismaRouteError(
  error: unknown,
  messages: PrismaRouteErrorMessages = {}
) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return null
  }

  if (error.code === "P2002") {
    return NextResponse.json(
      { error: messages.unique || "A record with this unique value already exists." },
      { status: 409 }
    )
  }

  if (error.code === "P2003") {
    return NextResponse.json(
      { error: messages.foreignKey || "This record is still referenced by other records." },
      { status: 409 }
    )
  }

  if (error.code === "P2025") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return null
}
