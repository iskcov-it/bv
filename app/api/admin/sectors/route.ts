import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const userId = body.userId as string;
  const sectorName = String(body.sectorName || "").trim();

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { sectorName },
    select: { id: true, name: true, email: true, sectorName: true },
  });

  return NextResponse.json({ user: updated });
}
