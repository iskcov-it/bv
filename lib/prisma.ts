// Works before and after `prisma generate` in local development.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const prismaPkg = require("@prisma/client") as { PrismaClient: new () => any };
const PrismaClient = prismaPkg.PrismaClient;

declare global {
  var prisma: InstanceType<typeof PrismaClient> | undefined;
}

export const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
