import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "@/components/DashboardClient";
import { redirect } from "next/navigation";

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const today = new Date();
  const start = fmtDate(new Date(today.getFullYear(), today.getMonth(), 1));
  const end = fmtDate(today);

  let visibleUsers: { id: string; name: string; email: string; sectorName?: string | null }[] = [];
  if (session.user.role === "leader") {
    visibleUsers = await prisma.user.findMany({
      where: { leaderId: session.user.id },
      select: { id: true, name: true, email: true, sectorName: true },
      orderBy: { name: "asc" },
    });
  } else if (session.user.role === "superadmin") {
    visibleUsers = await prisma.user.findMany({
      where: { role: "devotee" },
      select: { id: true, name: true, email: true, sectorName: true },
      orderBy: { name: "asc" },
    });
  }

  const targetUserIds =
    session.user.role === "devotee" ? [session.user.id] : visibleUsers.map((u) => u.id);

  const appSetting = await prisma.appSetting.upsert({
    where: { key: "global" },
    update: {},
    create: { key: "global", showFestivalFlags: true },
  });

  const rows = await prisma.sadhanaDay.findMany({
    where: {
      userId: { in: targetUserIds.length ? targetUserIds : ["__none__"] },
      date: {
        gte: new Date(`${start}T00:00:00.000Z`),
        lte: new Date(`${end}T23:59:59.999Z`),
      },
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true, sectorName: true, leader: { select: { name: true } } },
      },
    },
    orderBy: [{ date: "desc" }],
  });

  const initialRows = rows.map((r: (typeof rows)[number]) => ({
    id: r.id,
    userId: r.userId,
    userName: r.user.name || "Unnamed devotee",
    userEmail: r.user.email,
    leaderName: r.user.leader?.name || null,
    sectorName: r.user.sectorName || null,
    date: fmtDate(r.date),
    mangalaArati: r.mangalaArati,
    tulasiPuja: r.tulasiPuja,
    chantBefore630: r.chantBefore630,
    chant630to8: r.chant630to8,
    chant8to10: r.chant8to10,
    chant10to9: r.chant10to9,
    chantAfter9: r.chantAfter9,
    readingName: r.readingName || "",
    readingMinutes: r.readingMinutes,
    totalScore: r.totalScore,
    ekadashiObserved: (r as any).ekadashiObserved || false,
    festivalNote: (r as any).festivalNote || "",
  }));

  return (
    <main>
      <div className="container" style={{ paddingTop: 24, paddingBottom: 24 }}>
        <DashboardClient
          role={session.user.role}
          currentUserId={session.user.id}
          currentUserName={session.user.name || "Unnamed devotee"}
          currentUserEmail={session.user.email || ""}
          currentUserImage={session.user.image || null}
          currentUserSectorName={session.user.sectorName || null}
          initialRows={initialRows}
          visibleUsers={visibleUsers}
          initialStart={start}
          initialEnd={end}
          initialShowFestivalFlags={appSetting.showFestivalFlags}
        />
      </div>
    </main>
  );
}
