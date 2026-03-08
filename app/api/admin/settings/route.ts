import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const setting = await prisma.appSetting.upsert({
    where: { key: "global" },
    update: {},
    create: { key: "global", showFestivalFlags: true },
  });

  return NextResponse.json(setting);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const setting = await prisma.appSetting.upsert({
    where: { key: "global" },
    update: { showFestivalFlags: !!body.showFestivalFlags },
    create: { key: "global", showFestivalFlags: !!body.showFestivalFlags },
  });

  return NextResponse.json(setting);
}
