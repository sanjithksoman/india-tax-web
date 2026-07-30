const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();
const members = ["SANJITH", "NISHA", "NEHA", "NETRA"];
const INITIAL_PASSWORD = "India@2024";

async function main() {
  // Seed members
  console.log("Seeding members...");
  for (const name of members) {
    await prisma.member.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    console.log("  ✓", name);
  }

  // Seed initial password (only if not already set)
  const existing = await prisma.appSettings.findUnique({
    where: { key: "password_hash" },
  });

  if (!existing) {
    const hash = await bcrypt.hash(INITIAL_PASSWORD, 12);
    await prisma.appSettings.create({
      data: { key: "password_hash", value: hash },
    });
    console.log("  ✓ Initial password set to: India@2024");
  } else {
    console.log("  ℹ Password already set — skipping.");
  }

  console.log("Done.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
