import { PrismaClient } from "@prisma/client";

const prismaGlobal =
  globalThis as typeof globalThis & {
    prisma?: PrismaClient;
  };

export const prisma: PrismaClient =
  prismaGlobal.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  prismaGlobal.prisma = prisma;
}
