import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "leader") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const devoteeId = searchParams.get("devoteeId");
  if (!start || !end) return NextResponse.json({ error: "start and end are required" }, { status: 400 });

  const memberIds = (await prisma.user.findMany({ where: { leaderId: session.user.id }, select: { id: true } })).map((u: { id: string }) => u.id);
  const rows = await prisma.sadhanaDay.findMany({
    where: {
      userId: devoteeId && devoteeId !== "all" ? devoteeId : { in: memberIds.length ? memberIds : ["__none__"] },
      date: { gte: new Date(`${start}T00:00:00.000Z`), lte: new Date(`${end}T23:59:59.999Z`) },
    },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: [{ date: "asc" }],
  });
  return NextResponse.json({ rows });
}
