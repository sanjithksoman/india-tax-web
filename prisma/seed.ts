import { PrismaClient } from "@prisma/client";

const members = ["SANJITH", "NISHA", "NEHA", "NETRA"];

async function main() {
  const client = new PrismaClient();

  console.log("Seeding members...");
  for (const name of members) {
    await client.member.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    console.log(`  ✓ ${name}`);
  }

  console.log("Seeding complete.");
  await client.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
