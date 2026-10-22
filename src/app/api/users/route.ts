import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api/admin-auth";

export async function GET() {
  const { response } = await requireSuperAdmin();
  if (response) return response;

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
}

export async function POST(req: Request) {
  const { response } = await requireSuperAdmin();
  if (response) return response;

  const body = await req.json();

  if (!body?.email || typeof body.email !== "string") {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const admin = await prisma.admin.create({
    data: {
      email: body.email,
      name: typeof body.name === "string" ? body.name : null,
    },
  });

  return NextResponse.json(admin, { status: 201 });
}
