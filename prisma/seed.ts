import { PrismaClient } from "@prisma/client";
import { makeToken } from "../src/lib/tokens";

const db = new PrismaClient();

const demoGuests = [
  { name: "Aunt Carol", email: "carol@example.com", phone: "+15550000001" },
  { name: "Mike & Dana Rivera", email: "rivera@example.com", phone: null },
  { name: "Grandpa Joe", email: null, phone: "+15550000003" },
];

async function main() {
  for (const g of demoGuests) {
    const existing = await db.guest.findFirst({ where: { name: g.name } });
    if (!existing) {
      await db.guest.create({ data: { ...g, token: makeToken() } });
    }
  }
  console.log("Seeded", await db.guest.count(), "guests");
}

main().finally(() => db.$disconnect());
