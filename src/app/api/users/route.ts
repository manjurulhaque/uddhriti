import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api/admin-auth";

export async function GET() {
  const { response } = await requireSuperAdmin();
  if (response) return response;

  try {
    const admins = await prisma.admin.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json(admins);
  } catch (error) {
    console.error("Failed to list admin users:", error);
    return NextResponse.json(
      { error: "Failed to list admin users" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const { response } = await requireSuperAdmin();
  if (response) return response;

  const body = await req.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid JSON request body" },
      { status: 400 }
    );
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "A valid email is required" },
      { status: 400 }
    );
  }

  const role = body.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "EDITOR";
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : null;

  try {
    const admin = await prisma.admin.create({
      data: {
        email,
        name,
        role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(admin, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "An admin with this email already exists" },
        { status: 409 }
      );
    }

    console.error("Failed to create admin user:", error);
    return NextResponse.json(
      { error: "Failed to create admin user" },
      { status: 500 }
    );
  }
}

