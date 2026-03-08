import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = ((user as any).role ?? "devotee") as "devotee" | "leader" | "superadmin";
        session.user.sectorName = (user as any).sectorName ?? null;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      const email = user.email ?? "";
      const leaderEmails = (process.env.LEADER_EMAILS ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const data: { role?: "leader" | "superadmin" } = {};
      if (process.env.SUPERADMIN_EMAIL && email === process.env.SUPERADMIN_EMAIL) {
        data.role = "superadmin";
      } else if (leaderEmails.includes(email)) {
        data.role = "leader";
      }

      if (data.role) {
        await prisma.user.update({
          where: { id: user.id },
          data,
        });
      }
    },
  },
  pages: {
    signIn: "/",
  },
  secret: process.env.AUTH_SECRET,
  //debug: true,
});
