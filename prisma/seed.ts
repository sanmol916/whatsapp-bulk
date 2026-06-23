/**
 * Idempotent seed: ensures the platform admin account exists.
 * Safe to run on every deploy.
 *
 * Run:  npx tsx prisma/seed.ts
 */
import { config as loadEnv } from "dotenv";
loadEnv();

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "thisisprafull";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Prafull_2000";

async function main() {
  const existing = await prisma.user.findUnique({
    where: { username: ADMIN_USERNAME },
  });

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  if (existing) {
    // Keep the admin's password in sync with env, ensure role/limits.
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash, role: "ADMIN" },
    });
    await prisma.organization.update({
      where: { id: existing.organizationId },
      data: {
        plan: "UNLIMITED",
        messageLimit: -1,
        contactLimit: -1,
        active: true,
      },
    });
    console.log(`Admin '${ADMIN_USERNAME}' already exists — refreshed.`);
    return;
  }

  const org = await prisma.organization.create({
    data: {
      name: "Platform Admin",
      plan: "UNLIMITED",
      messageLimit: -1,
      contactLimit: -1,
      active: true,
    },
  });

  await prisma.user.create({
    data: {
      username: ADMIN_USERNAME,
      passwordHash,
      role: "ADMIN",
      organizationId: org.id,
    },
  });

  console.log(`Created admin account '${ADMIN_USERNAME}'.`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
