import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function calcTotal(body: any) {
  const a = (body.mangalaArati ? 4 : 0) + (body.tulasiPuja ? 4 : 0);
  const b = Number(body.chantBefore630 || 0) * 5 + Number(body.chant630to8 || 0) * 4 + Number(body.chant8to10 || 0) * 2 + Number(body.chant10to9 || 0) - Number(body.chantAfter9 || 0);
  const m = Number(body.readingMinutes || 0);
  const c = m >= 60 ? 20 : m >= 45 ? 15 : m >= 30 ? 10 : m >= 15 ? 5 : 0;
  return a + b + c;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const requestedUserId = body.userId as string;

  if (session.user.role === "devotee" && requestedUserId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (session.user.role === "leader") {
    const allowed = await prisma.user.findFirst({ where: { id: requestedUserId, leaderId: session.user.id }, select: { id: true } });
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const date = new Date(`${body.date}T00:00:00.000Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (date.getTime() > today.getTime()) {
    return NextResponse.json({ error: "Future date entry is not allowed" }, { status: 400 });
  }

  const totalScore = calcTotal(body);

  const row = await prisma.sadhanaDay.upsert({
    where: { userId_date: { userId: requestedUserId, date } },
    update: {
      mangalaArati: !!body.mangalaArati,
      tulasiPuja: !!body.tulasiPuja,
      chantBefore630: Number(body.chantBefore630 || 0),
      chant630to8: Number(body.chant630to8 || 0),
      chant8to10: Number(body.chant8to10 || 0),
      chant10to9: Number(body.chant10to9 || 0),
      chantAfter9: Number(body.chantAfter9 || 0),
      readingName: body.readingName || "",
      readingMinutes: Number(body.readingMinutes || 0),
      totalScore,
      ekadashiObserved: !!body.ekadashiObserved,
      festivalNote: body.festivalNote || "",
    },
    create: {
      userId: requestedUserId,
      date,
      mangalaArati: !!body.mangalaArati,
      tulasiPuja: !!body.tulasiPuja,
      chantBefore630: Number(body.chantBefore630 || 0),
      chant630to8: Number(body.chant630to8 || 0),
      chant8to10: Number(body.chant8to10 || 0),
      chant10to9: Number(body.chant10to9 || 0),
      chantAfter9: Number(body.chantAfter9 || 0),
      readingName: body.readingName || "",
      readingMinutes: Number(body.readingMinutes || 0),
      totalScore,
      ekadashiObserved: !!body.ekadashiObserved,
      festivalNote: body.festivalNote || "",
    },
    include: { user: { select: { name: true, email: true, sectorName: true, leader: { select: { name: true } } } } },
  });

  return NextResponse.json({
    row: {
      id: row.id,
      userId: row.userId,
      userName: row.user.name || "Unnamed devotee",
      userEmail: row.user.email,
      leaderName: row.user.leader?.name || null,
      sectorName: (row.user as any).sectorName || null,
      date: row.date.toISOString().slice(0, 10),
      mangalaArati: row.mangalaArati,
      tulasiPuja: row.tulasiPuja,
      chantBefore630: row.chantBefore630,
      chant630to8: row.chant630to8,
      chant8to10: row.chant8to10,
      chant10to9: row.chant10to9,
      chantAfter9: row.chantAfter9,
      readingName: row.readingName || "",
      readingMinutes: row.readingMinutes,
      totalScore: row.totalScore,
      ekadashiObserved: (row as any).ekadashiObserved || false,
      festivalNote: (row as any).festivalNote || "",
    },
  });
}
