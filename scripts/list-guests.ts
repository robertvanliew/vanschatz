import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
db.guest
  .findMany()
  .then((guests) => {
    console.table(
      guests.map((g) => ({ name: g.name, token: g.token, status: g.rsvpStatus, party: g.partySize }))
    );
    return db.$disconnect();
  });
