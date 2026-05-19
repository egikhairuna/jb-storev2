import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertSeedUser(username: string, role: UserRole): Promise<void> {
  const passwordHash = bcrypt.hashSync("changeme123", 10);
  await prisma.user.upsert({
    where: { username },
    create: {
      name: username === "admin" ? "Administrator" : "Cashier",
      username,
      email: `${username}@pos.local`,
      password: passwordHash,
      role,
      isActive: true,
    },
    update: {
      password: passwordHash,
      isActive: true,
    },
  });
}

async function main(): Promise<void> {
  await upsertSeedUser("admin", UserRole.ADMIN);
  await upsertSeedUser("cashier", UserRole.CASHIER);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
