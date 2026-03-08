import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  const email = process.env.SUPERADMIN_EMAIL;
  if (!email) return NextResponse.json({ error: "SUPERADMIN_EMAIL missing" }, { status: 500 });

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: "superadmin", name: "Super Admin" },
    create: { email, name: "Super Admin", role: "superadmin" },
  });

  return NextResponse.json({ ok: true, userId: user.id });
}
