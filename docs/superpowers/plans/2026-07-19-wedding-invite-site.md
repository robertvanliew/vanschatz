# Julie & Robert Wedding Invite Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A cosmic-themed wedding invite site where each guest opens a personal link, is greeted by name, RSVPs (yes/no + party size), and where the admin dashboard manages guests and sends on-demand + auto-scheduled email/SMS reminders — all runnable in practice mode with zero external accounts.

**Architecture:** Next.js App Router monolith. SQLite via Prisma for practice mode (env-swap to Postgres later). Pure-function core in `src/lib` (tested with Vitest); thin server actions/routes on top; React Three Fiber hero + Framer Motion scroll reveals for the guest page; password-gated `/admin` dashboard; `/api/cron/reminders` endpoint for Vercel Cron later.

**Tech Stack:** Next.js 15 (App Router, TypeScript, Tailwind v4, src dir, `@/*` alias), Prisma + SQLite, three / @react-three/fiber / @react-three/drei, framer-motion, Vitest, tsx.

## Global Constraints

- Wedding facts (verbatim, used everywhere): couple **Julie & Robert**; date **Saturday, October 17, 2026**; guest arrival **11:30 AM**; event **12:00 PM – 5:00 PM**; venue **Lakeview House, 343 Lakeside Road, Orange Lake, Newburgh, NY 12550**.
- Dress code, reception details, RSVP deadline are **[TO BE PROVIDED]** — render as tasteful "Details coming soon" copy, never as bracketed placeholders visible to guests.
- RSVP collects ONLY: attending yes/no + party size (1–10). No meal/dietary/notes fields.
- Practice mode is the default: no external network sends; reminder "sends" are logged to DB with `simulated = true`. Real providers activate purely via env vars (`RESEND_API_KEY`, `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`/`TWILIO_FROM_NUMBER`) — no code changes.
- Must honor `prefers-reduced-motion`: static gradient hero instead of 3D/animation.
- Mobile-first; large touch targets (min 44px) for RSVP controls.
- Unknown/invalid guest token → graceful generic page, no crash, no data leak.
- Scheduled reminders are idempotent: unique `(guestId, scheduleKey)` in `ReminderLog`.
- All shell commands in this plan are **PowerShell 5.1** (no `&&`; chain with `;`).
- Working directory for all commands: `C:\Users\12124\Documents\Julie & Robert Wedding Invites`.

## File Structure

```
prisma/schema.prisma          # Guest + ReminderLog models
prisma/seed.ts                # Demo guests for practice mode
src/lib/wedding.ts            # Wedding constants + date helpers (pure)
src/lib/tokens.ts             # Guest token generation (pure)
src/lib/rsvp.ts               # RSVP validation + tallies (pure)
src/lib/reminders.ts          # Schedule keys, eligibility (pure) + orchestration
src/lib/messaging.ts          # Email/SMS provider abstraction (console vs real)
src/lib/db.ts                 # Prisma client singleton
src/app/layout.tsx            # Fonts, metadata, global shell
src/app/globals.css           # Cosmic theme tokens
src/app/page.tsx              # Generic (non-personalized) invite
src/app/invite/[token]/page.tsx  # Personalized invite
src/components/InvitePage.tsx # Shared page composition (guest | null)
src/components/CosmicHero.tsx # R3F starfield + orb, reduced-motion fallback
src/components/Countdown.tsx  # Live countdown (client)
src/components/Sections.tsx   # WhenWhere, Details, Registry stub, Reveal
src/components/RsvpCard.tsx   # RSVP UI (client) → server action
src/app/actions/rsvp.ts       # Guest RSVP server action
src/app/admin/login/page.tsx  # Admin login
src/app/admin/page.tsx        # Dashboard
src/app/admin/actions.ts      # Admin server actions (auth-checked)
src/app/admin/AdminUi.tsx     # Client components (copy link, forms)
src/app/api/cron/reminders/route.ts  # Scheduled reminder endpoint
tests/wedding.test.ts
tests/tokens.test.ts
tests/rsvp.test.ts
tests/reminders.test.ts
vitest.config.ts
```

---

### Task 1: Scaffold Next.js app + test tooling

**Files:**
- Create: entire Next.js scaffold at repo root (via `create-next-app` in temp dir, then move), `vitest.config.ts`
- Modify: `package.json` (scripts, prisma seed hook), `.gitignore`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: working `npm run dev`, `npm test` (Vitest, `@/*` alias resolves), deps installed for every later task

- [ ] **Step 1: Scaffold into temp dir and merge into repo root**

```powershell
npx create-next-app@latest site-tmp --yes --ts --tailwind --eslint --app --src-dir --use-npm
Remove-Item -Recurse -Force site-tmp\.git
Remove-Item -Recurse -Force site-tmp\node_modules -ErrorAction SilentlyContinue
Get-ChildItem site-tmp -Force | Move-Item -Destination .
Remove-Item site-tmp
npm install
```

Expected: repo root now has `package.json`, `src/app/`, `.gitignore`, etc. `docs/` untouched.

- [ ] **Step 2: Install runtime + dev dependencies**

```powershell
npm install three @react-three/fiber @react-three/drei framer-motion @prisma/client
npm install -D prisma vitest tsx @types/three
```

Expected: exit code 0, packages in `package.json`.

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 4: Add scripts and a smoke test**

In `package.json` add to `"scripts"`: `"test": "vitest run"`, and top-level:

```json
"prisma": { "seed": "npx tsx prisma/seed.ts" }
```

Create `tests/smoke.test.ts`:

```ts
import { expect, test } from "vitest";
test("vitest runs", () => expect(1 + 1).toBe(2));
```

Append to `.gitignore`:

```
dev.db
dev.db-journal
```

- [ ] **Step 5: Verify dev server and tests**

Run: `npm test`
Expected: 1 passed.

Run: `npm run build`
Expected: build succeeds (proves scaffold is intact; faster than eyeballing dev server here).

- [ ] **Step 6: Commit**

```powershell
git add -A; git commit -m "chore: scaffold Next.js app with Tailwind, R3F deps, Vitest"
```

---

### Task 2: Wedding constants + date helpers

**Files:**
- Create: `src/lib/wedding.ts`
- Test: `tests/wedding.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `WEDDING: { coupleShort: "Julie & Rob"; coupleFull: "Julie & Robert"; dateLabel: "Saturday, October 17, 2026"; arrivalLabel: "Guests arrive 11:30 AM"; timeLabel: "12:00 PM – 5:00 PM"; venueName: "Lakeview House"; venueAddress: "343 Lakeside Road, Orange Lake, Newburgh, NY 12550"; date: Date /* 2026-10-17T11:30 local */ }`
  - `daysUntil(now: Date, target?: Date): number` — whole calendar days (date-only diff, ceil ≥ 0 semantics as tested)
  - `mapsUrl(): string` and `mapsEmbedUrl(): string`

- [ ] **Step 1: Write the failing tests** — `tests/wedding.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { WEDDING, daysUntil, mapsUrl, mapsEmbedUrl } from "@/lib/wedding";

describe("wedding constants", () => {
  test("facts are exact", () => {
    expect(WEDDING.coupleFull).toBe("Julie & Robert");
    expect(WEDDING.dateLabel).toBe("Saturday, October 17, 2026");
    expect(WEDDING.arrivalLabel).toBe("Guests arrive 11:30 AM");
    expect(WEDDING.timeLabel).toBe("12:00 PM – 5:00 PM");
    expect(WEDDING.venueAddress).toBe(
      "343 Lakeside Road, Orange Lake, Newburgh, NY 12550"
    );
    expect(WEDDING.date.getFullYear()).toBe(2026);
    expect(WEDDING.date.getMonth()).toBe(9); // October
    expect(WEDDING.date.getDate()).toBe(17);
  });
});

describe("daysUntil", () => {
  test("7 days before", () => {
    expect(daysUntil(new Date(2026, 9, 10, 8, 0))).toBe(7);
  });
  test("30 days before", () => {
    expect(daysUntil(new Date(2026, 8, 17, 23, 59))).toBe(30);
  });
  test("wedding day is 0", () => {
    expect(daysUntil(new Date(2026, 9, 17, 6, 0))).toBe(0);
  });
  test("after the wedding is negative", () => {
    expect(daysUntil(new Date(2026, 9, 20))).toBe(-3);
  });
});

describe("maps urls", () => {
  test("link encodes address", () => {
    expect(mapsUrl()).toContain("343+Lakeside+Road");
  });
  test("embed url uses output=embed", () => {
    expect(mapsEmbedUrl()).toContain("output=embed");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/wedding.test.ts`
Expected: FAIL — cannot resolve `@/lib/wedding`.

- [ ] **Step 3: Implement `src/lib/wedding.ts`**

```ts
export const WEDDING = {
  coupleShort: "Julie & Rob",
  coupleFull: "Julie & Robert",
  dateLabel: "Saturday, October 17, 2026",
  arrivalLabel: "Guests arrive 11:30 AM",
  timeLabel: "12:00 PM – 5:00 PM",
  venueName: "Lakeview House",
  venueAddress: "343 Lakeside Road, Orange Lake, Newburgh, NY 12550",
  date: new Date(2026, 9, 17, 11, 30),
} as const;

function dateOnly(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Whole calendar days from `now` until `target` (default: wedding day). Negative after. */
export function daysUntil(now: Date, target: Date = WEDDING.date): number {
  const MS_PER_DAY = 86_400_000;
  return Math.round((dateOnly(target) - dateOnly(now)) / MS_PER_DAY);
}

const encodedAddress = encodeURIComponent(
  `${WEDDING.venueName}, ${WEDDING.venueAddress}`
).replace(/%20/g, "+");

export function mapsUrl(): string {
  return `https://maps.google.com/?q=${encodedAddress}`;
}

export function mapsEmbedUrl(): string {
  return `https://www.google.com/maps?q=${encodedAddress}&output=embed`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/wedding.test.ts`
Expected: all PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/wedding.ts tests/wedding.test.ts; git commit -m "feat: wedding constants and date helpers"
```

---

### Task 3: Prisma schema, client, seed

**Files:**
- Create: `prisma/schema.prisma`, `prisma/seed.ts`, `src/lib/db.ts`, `.env`

**Interfaces:**
- Consumes: nothing
- Produces:
  - Prisma models `Guest` and `ReminderLog` (fields below — later tasks depend on exact names)
  - `db` — PrismaClient singleton from `@/lib/db`
  - Seeded practice guests

- [ ] **Step 1: Create `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Guest {
  id          String        @id @default(cuid())
  token       String        @unique
  name        String
  email       String?
  phone       String?
  rsvpStatus  String        @default("PENDING") // PENDING | YES | NO
  partySize   Int           @default(0)
  respondedAt DateTime?
  createdAt   DateTime      @default(now())
  reminders   ReminderLog[]
}

model ReminderLog {
  id          String   @id @default(cuid())
  guestId     String
  guest       Guest    @relation(fields: [guestId], references: [id], onDelete: Cascade)
  scheduleKey String   // "1month" | "1week" | "3days" | "manual-<iso>"
  channel     String   // "email" | "sms"
  simulated   Boolean  @default(true)
  sentAt      DateTime @default(now())

  @@unique([guestId, scheduleKey, channel])
}
```

- [ ] **Step 2: Create `.env`**

```
DATABASE_URL="file:./dev.db"
ADMIN_PASSWORD="lakeview2026"
```

(`.env` is already gitignored by create-next-app; confirm — if not, add it.)

- [ ] **Step 3: Create `src/lib/db.ts`**

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

- [ ] **Step 4: Create `prisma/seed.ts`**

```ts
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
```

Note: this imports `makeToken` from Task 4. Create `src/lib/tokens.ts` in Task 4 **before** running the seed — the seed run is deferred to Task 4 Step 6.

- [ ] **Step 5: Generate client and create database**

Run: `npx prisma migrate dev --name init --skip-seed`
Expected: migration applied, `dev.db` created, client generated. (`--skip-seed` is required: the seed imports `makeToken`, which doesn't exist until Task 4.)

- [ ] **Step 6: Commit**

```powershell
git add prisma src/lib/db.ts .gitignore; git commit -m "feat: Prisma schema (Guest, ReminderLog), db client, seed script"
```

---

### Task 4: Guest tokens

**Files:**
- Create: `src/lib/tokens.ts`
- Test: `tests/tokens.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `makeToken(): string` — 16-char base64url-safe, crypto-random (used by seed and admin addGuest)

- [ ] **Step 1: Write the failing tests** — `tests/tokens.test.ts`:

```ts
import { expect, test } from "vitest";
import { makeToken } from "@/lib/tokens";

test("token is 16 chars, url-safe", () => {
  const t = makeToken();
  expect(t).toHaveLength(16);
  expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
});

test("tokens are unique across 1000 draws", () => {
  const seen = new Set(Array.from({ length: 1000 }, () => makeToken()));
  expect(seen.size).toBe(1000);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/tokens.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/tokens.ts`**

```ts
import { randomBytes } from "crypto";

/** 16-char unguessable URL-safe guest token. */
export function makeToken(): string {
  return randomBytes(12).toString("base64url");
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/tokens.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the seed (deferred from Task 3)**

Run: `npx prisma db seed`
Expected: `Seeded 3 guests`.

- [ ] **Step 6: Commit**

```powershell
git add src/lib/tokens.ts tests/tokens.test.ts; git commit -m "feat: guest token generation + seed data"
```

---

### Task 5: RSVP validation + tallies (pure logic)

**Files:**
- Create: `src/lib/rsvp.ts`
- Test: `tests/rsvp.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type RsvpInput = { attending: boolean; partySize: number }`
  - `validateRsvp(input: RsvpInput): { ok: true; status: "YES" | "NO"; partySize: number } | { ok: false; error: string }` — attending YES requires integer partySize 1–10; NO normalizes partySize to 0
  - `type GuestLike = { rsvpStatus: string; partySize: number }`
  - `computeTallies(guests: GuestLike[]): { attending: number; declined: number; pending: number; headcount: number }`

- [ ] **Step 1: Write the failing tests** — `tests/rsvp.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { validateRsvp, computeTallies } from "@/lib/rsvp";

describe("validateRsvp", () => {
  test("yes with valid party size", () => {
    expect(validateRsvp({ attending: true, partySize: 2 })).toEqual({
      ok: true,
      status: "YES",
      partySize: 2,
    });
  });
  test("no normalizes party size to 0", () => {
    expect(validateRsvp({ attending: false, partySize: 5 })).toEqual({
      ok: true,
      status: "NO",
      partySize: 0,
    });
  });
  test.each([0, 11, 1.5, -1, NaN])("rejects party size %s when attending", (n) => {
    const r = validateRsvp({ attending: true, partySize: n as number });
    expect(r.ok).toBe(false);
  });
});

describe("computeTallies", () => {
  test("sums statuses and headcount", () => {
    const guests = [
      { rsvpStatus: "YES", partySize: 2 },
      { rsvpStatus: "YES", partySize: 1 },
      { rsvpStatus: "NO", partySize: 0 },
      { rsvpStatus: "PENDING", partySize: 0 },
    ];
    expect(computeTallies(guests)).toEqual({
      attending: 2,
      declined: 1,
      pending: 1,
      headcount: 3,
    });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/rsvp.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement `src/lib/rsvp.ts`**

```ts
export type RsvpInput = { attending: boolean; partySize: number };

export type RsvpResult =
  | { ok: true; status: "YES" | "NO"; partySize: number }
  | { ok: false; error: string };

export const MAX_PARTY_SIZE = 10;

export function validateRsvp(input: RsvpInput): RsvpResult {
  if (!input.attending) return { ok: true, status: "NO", partySize: 0 };
  const n = input.partySize;
  if (!Number.isInteger(n) || n < 1 || n > MAX_PARTY_SIZE) {
    return { ok: false, error: `Party size must be between 1 and ${MAX_PARTY_SIZE}.` };
  }
  return { ok: true, status: "YES", partySize: n };
}

export type GuestLike = { rsvpStatus: string; partySize: number };

export function computeTallies(guests: GuestLike[]) {
  const attending = guests.filter((g) => g.rsvpStatus === "YES");
  return {
    attending: attending.length,
    declined: guests.filter((g) => g.rsvpStatus === "NO").length,
    pending: guests.filter((g) => g.rsvpStatus === "PENDING").length,
    headcount: attending.reduce((sum, g) => sum + g.partySize, 0),
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/rsvp.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/rsvp.ts tests/rsvp.test.ts; git commit -m "feat: RSVP validation and tally logic"
```

---

### Task 6: Reminder logic + messaging providers

**Files:**
- Create: `src/lib/reminders.ts`, `src/lib/messaging.ts`
- Test: `tests/reminders.test.ts`

**Interfaces:**
- Consumes: `daysUntil` from `@/lib/wedding`; `db` from `@/lib/db`
- Produces:
  - `getScheduleKey(now: Date): "1month" | "1week" | "3days" | null` (30/7/3 days out)
  - `type ReminderGuest = { id: string; rsvpStatus: string; email: string | null; phone: string | null; reminders: { scheduleKey: string; channel: string }[] }`
  - `eligibleSends(guests: ReminderGuest[], scheduleKey: string): { guestId: string; channel: "email" | "sms"; to: string }[]` — PENDING guests only, one send per available channel, skipping channels already logged for that key
  - `runScheduledReminders(now: Date): Promise<{ scheduleKey: string | null; sent: number }>`
  - `runManualReminders(now: Date): Promise<{ scheduleKey: string; sent: number }>`
  - From messaging: `sendMessage(channel: "email" | "sms", to: string, body: string): Promise<{ simulated: boolean }>` and `isPracticeMode(channel): boolean`

- [ ] **Step 1: Write the failing tests** — `tests/reminders.test.ts` (pure parts only):

```ts
import { describe, expect, test } from "vitest";
import { getScheduleKey, eligibleSends } from "@/lib/reminders";

describe("getScheduleKey", () => {
  test("30 days out → 1month", () => {
    expect(getScheduleKey(new Date(2026, 8, 17))).toBe("1month");
  });
  test("7 days out → 1week", () => {
    expect(getScheduleKey(new Date(2026, 9, 10))).toBe("1week");
  });
  test("3 days out → 3days", () => {
    expect(getScheduleKey(new Date(2026, 9, 14))).toBe("3days");
  });
  test("other days → null", () => {
    expect(getScheduleKey(new Date(2026, 9, 12))).toBeNull();
  });
});

describe("eligibleSends", () => {
  const base = { rsvpStatus: "PENDING", reminders: [] as { scheduleKey: string; channel: string }[] };
  test("skips guests who already responded", () => {
    const guests = [
      { id: "a", ...base, rsvpStatus: "YES", email: "a@x.com", phone: null },
      { id: "b", ...base, email: "b@x.com", phone: null },
    ];
    expect(eligibleSends(guests, "1week")).toEqual([
      { guestId: "b", channel: "email", to: "b@x.com" },
    ]);
  });
  test("sends on every available channel", () => {
    const guests = [{ id: "c", ...base, email: "c@x.com", phone: "+15551234567" }];
    expect(eligibleSends(guests, "1week")).toEqual([
      { guestId: "c", channel: "email", to: "c@x.com" },
      { guestId: "c", channel: "sms", to: "+15551234567" },
    ]);
  });
  test("idempotent: skips channels already logged for this key", () => {
    const guests = [
      {
        id: "d",
        rsvpStatus: "PENDING",
        email: "d@x.com",
        phone: "+15550000000",
        reminders: [{ scheduleKey: "1week", channel: "email" }],
      },
    ];
    expect(eligibleSends(guests, "1week")).toEqual([
      { guestId: "d", channel: "sms", to: "+15550000000" },
    ]);
  });
  test("guest with no contact info yields nothing", () => {
    const guests = [{ id: "e", ...base, email: null, phone: null }];
    expect(eligibleSends(guests, "1week")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/reminders.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement `src/lib/messaging.ts`**

```ts
/**
 * Channel providers. Practice mode (no env keys) logs to console and reports
 * simulated=true. Real sends activate purely via env vars — no code changes.
 */

export type Channel = "email" | "sms";

export function isPracticeMode(channel: Channel): boolean {
  if (channel === "email") return !process.env.RESEND_API_KEY;
  return !(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER
  );
}

export async function sendMessage(
  channel: Channel,
  to: string,
  body: string
): Promise<{ simulated: boolean }> {
  if (isPracticeMode(channel)) {
    console.log(`[practice ${channel}] to=${to}: ${body}`);
    return { simulated: true };
  }
  if (channel === "email") {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Julie & Robert <onboarding@resend.dev>",
        to: [to],
        subject: "A reminder from Julie & Robert",
        html: `<p>${body}</p>`,
      }),
    });
    if (!res.ok) throw new Error(`Resend failed: ${res.status}`);
    return { simulated: false };
  }
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: process.env.TWILIO_FROM_NUMBER!,
        Body: body,
      }),
    }
  );
  if (!res.ok) throw new Error(`Twilio failed: ${res.status}`);
  return { simulated: false };
}
```

- [ ] **Step 4: Implement `src/lib/reminders.ts`**

```ts
import { daysUntil, WEDDING } from "@/lib/wedding";
import { db } from "@/lib/db";
import { sendMessage, type Channel } from "@/lib/messaging";

export type ScheduleKey = "1month" | "1week" | "3days";

export function getScheduleKey(now: Date): ScheduleKey | null {
  const days = daysUntil(now);
  if (days === 30) return "1month";
  if (days === 7) return "1week";
  if (days === 3) return "3days";
  return null;
}

export type ReminderGuest = {
  id: string;
  rsvpStatus: string;
  email: string | null;
  phone: string | null;
  reminders: { scheduleKey: string; channel: string }[];
};

export type PlannedSend = { guestId: string; channel: Channel; to: string };

/** PENDING guests only; one send per available channel not already logged for this key. */
export function eligibleSends(guests: ReminderGuest[], scheduleKey: string): PlannedSend[] {
  const sends: PlannedSend[] = [];
  for (const g of guests) {
    if (g.rsvpStatus !== "PENDING") continue;
    const done = new Set(
      g.reminders.filter((r) => r.scheduleKey === scheduleKey).map((r) => r.channel)
    );
    if (g.email && !done.has("email")) sends.push({ guestId: g.id, channel: "email", to: g.email });
    if (g.phone && !done.has("sms")) sends.push({ guestId: g.id, channel: "sms", to: g.phone });
  }
  return sends;
}

function reminderBody(guestName: string, token: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  return (
    `Hi ${guestName}! A gentle reminder to RSVP for Julie & Robert's wedding on ` +
    `${WEDDING.dateLabel} at ${WEDDING.venueName}. Tap your personal link: ${base}/invite/${token}`
  );
}

async function executeSends(scheduleKey: string): Promise<number> {
  const guests = await db.guest.findMany({ include: { reminders: true } });
  const planned = eligibleSends(guests, scheduleKey);
  const byId = new Map(guests.map((g) => [g.id, g]));
  let sent = 0;
  for (const p of planned) {
    const guest = byId.get(p.guestId)!;
    const { simulated } = await sendMessage(p.channel, p.to, reminderBody(guest.name, guest.token));
    await db.reminderLog.create({
      data: { guestId: p.guestId, scheduleKey, channel: p.channel, simulated },
    });
    sent++;
  }
  return sent;
}

export async function runScheduledReminders(now: Date) {
  const scheduleKey = getScheduleKey(now);
  if (!scheduleKey) return { scheduleKey: null, sent: 0 };
  return { scheduleKey, sent: await executeSends(scheduleKey) };
}

export async function runManualReminders(now: Date) {
  const scheduleKey = `manual-${now.toISOString()}`;
  return { scheduleKey, sent: await executeSends(scheduleKey) };
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run tests/reminders.test.ts` — Expected: all PASS.
Run: `npm test` — Expected: full suite PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/lib/reminders.ts src/lib/messaging.ts tests/reminders.test.ts; git commit -m "feat: reminder eligibility, scheduling keys, practice-mode messaging"
```

---

### Task 7: Guest RSVP server action + invite page plumbing (unstyled)

**Files:**
- Create: `src/app/actions/rsvp.ts`, `src/app/invite/[token]/page.tsx`, `src/components/InvitePage.tsx` (minimal version — styled in Tasks 8–10)
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `db`, `validateRsvp`, `WEDDING`
- Produces:
  - Server action `submitRsvp(token: string, input: { attending: boolean; partySize: number }): Promise<{ ok: boolean; error?: string }>`
  - `<InvitePage guest={ { name, token, rsvpStatus, partySize } | null } />` — the single composition both routes render (guest `null` → generic page, no greeting, RSVP replaced by "check your personal link" note)
  - Route `/invite/[token]` — unknown token renders InvitePage with `guest={null}` plus a gentle "We couldn't find your invitation — reach out to Julie & Rob" note (prop `unknownToken`)

- [ ] **Step 1: Implement `src/app/actions/rsvp.ts`**

```ts
"use server";

import { db } from "@/lib/db";
import { validateRsvp } from "@/lib/rsvp";
import { revalidatePath } from "next/cache";

export async function submitRsvp(
  token: string,
  input: { attending: boolean; partySize: number }
): Promise<{ ok: boolean; error?: string }> {
  const result = validateRsvp(input);
  if (!result.ok) return { ok: false, error: result.error };

  const guest = await db.guest.findUnique({ where: { token } });
  if (!guest) return { ok: false, error: "Invitation not found." };

  await db.guest.update({
    where: { token },
    data: {
      rsvpStatus: result.status,
      partySize: result.partySize,
      respondedAt: new Date(),
    },
  });
  revalidatePath(`/invite/${token}`);
  return { ok: true };
}
```

- [ ] **Step 2: Minimal `src/components/InvitePage.tsx`** (structure only; cosmic styling lands in Task 8)

```tsx
import { WEDDING } from "@/lib/wedding";

export type InviteGuest = {
  name: string;
  token: string;
  rsvpStatus: string;
  partySize: number;
};

export default function InvitePage({
  guest,
  unknownToken = false,
}: {
  guest: InviteGuest | null;
  unknownToken?: boolean;
}) {
  return (
    <main>
      {unknownToken && (
        <p>We couldn&apos;t find your invitation — please reach out to Julie &amp; Rob.</p>
      )}
      {guest && <p>Welcome, {guest.name}</p>}
      <h1>{WEDDING.coupleFull}</h1>
      <p>{WEDDING.dateLabel}</p>
      <p>{WEDDING.arrivalLabel}</p>
      <p>{WEDDING.timeLabel}</p>
      <p>
        {WEDDING.venueName}, {WEDDING.venueAddress}
      </p>
      {!guest && !unknownToken && <p>Please use your personal invitation link to RSVP.</p>}
    </main>
  );
}
```

- [ ] **Step 3: Create `src/app/invite/[token]/page.tsx`**

```tsx
import { db } from "@/lib/db";
import InvitePage from "@/components/InvitePage";

export const dynamic = "force-dynamic";

export default async function GuestInvite({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const guest = await db.guest.findUnique({ where: { token } });
  if (!guest) return <InvitePage guest={null} unknownToken />;
  return (
    <InvitePage
      guest={{
        name: guest.name,
        token: guest.token,
        rsvpStatus: guest.rsvpStatus,
        partySize: guest.partySize,
      }}
    />
  );
}
```

- [ ] **Step 4: Replace `src/app/page.tsx`**

```tsx
import InvitePage from "@/components/InvitePage";

export default function Home() {
  return <InvitePage guest={null} />;
}
```

- [ ] **Step 5: Verify with dev server**

First create a small helper `scripts/list-guests.ts` (kept in repo; the admin dashboard supersedes it later but it's handy for CLI checks):

```ts
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
```

Start dev server (`npm run dev`). Check:
- `http://localhost:3000/` shows generic page with all wedding facts.
- Get a seeded token: `npx tsx scripts/list-guests.ts` — then `http://localhost:3000/invite/<token>` shows "Welcome, Aunt Carol".
- `http://localhost:3000/invite/bogus` shows the graceful unknown-token message.

- [ ] **Step 6: Commit**

```powershell
git add src/app src/components scripts; git commit -m "feat: invite routes, RSVP server action, graceful unknown token"
```

---

### Task 8: Cosmic theme + hero (the wow)

**Files:**
- Modify: `src/app/layout.tsx`, `src/app/globals.css`, `src/components/InvitePage.tsx`
- Create: `src/components/CosmicHero.tsx`

**Interfaces:**
- Consumes: `WEDDING`, `InviteGuest` type
- Produces: `<CosmicHero guestName={string | undefined} />` client component — full-viewport 3D starfield + glowing distorted orb + name reveal; static aurora-gradient fallback under `prefers-reduced-motion` (and as SSR fallback while 3D loads)

- [ ] **Step 1: Fonts + metadata in `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Cormorant_Garamond, Space_Grotesk } from "next/font/google";
import "./globals.css";

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
});
const sans = Space_Grotesk({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Julie & Robert — October 17, 2026",
  description:
    "Join Julie & Robert under the same sky. Saturday, October 17, 2026 · Lakeview House, Newburgh, NY.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Theme tokens in `src/app/globals.css`** (replace file)

```css
@import "tailwindcss";

:root {
  --bg: #060714;
  --bg-2: #0b0e26;
  --ink: #e8e9f5;
  --ink-dim: #9a9fc4;
  --aurora-1: #7c6cf0;
  --aurora-2: #47c3ff;
  --aurora-3: #ff7ad9;
  --gold: #e8c47a;
}

@theme inline {
  --color-bg: var(--bg);
  --color-ink: var(--ink);
  --color-ink-dim: var(--ink-dim);
  --color-gold: var(--gold);
  --font-serif: var(--font-serif);
  --font-sans: var(--font-sans);
}

html {
  scroll-behavior: smooth;
}

body {
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-sans), sans-serif;
  overflow-x: hidden;
}

.font-display {
  font-family: var(--font-serif), serif;
}

.aurora-text {
  background: linear-gradient(100deg, var(--aurora-1), var(--aurora-2) 45%, var(--aurora-3));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.static-cosmos {
  background:
    radial-gradient(ellipse 80% 55% at 70% 15%, rgba(124, 108, 240, 0.35), transparent),
    radial-gradient(ellipse 60% 45% at 20% 70%, rgba(71, 195, 255, 0.22), transparent),
    radial-gradient(ellipse 45% 40% at 85% 80%, rgba(255, 122, 217, 0.16), transparent),
    linear-gradient(180deg, var(--bg-2), var(--bg));
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
}
```

- [ ] **Step 3: Create `src/components/CosmicHero.tsx`**

```tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Stars, Float, MeshDistortMaterial } from "@react-three/drei";
import { motion } from "framer-motion";
import { WEDDING } from "@/lib/wedding";

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(true); // static until we know (also SSR-safe)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function Orb() {
  return (
    <Float speed={1.4} rotationIntensity={0.4} floatIntensity={1.2}>
      <mesh scale={1.35}>
        <sphereGeometry args={[1, 64, 64]} />
        <MeshDistortMaterial
          color="#7c6cf0"
          emissive="#2a1f66"
          distort={0.35}
          speed={1.6}
          roughness={0.15}
          metalness={0.4}
        />
      </mesh>
    </Float>
  );
}

function Scene() {
  return (
    <Canvas camera={{ position: [0, 0, 4.2], fov: 50 }} dpr={[1, 1.8]}>
      <ambientLight intensity={0.35} />
      <pointLight position={[4, 3, 4]} intensity={45} color="#47c3ff" />
      <pointLight position={[-4, -2, 2]} intensity={30} color="#ff7ad9" />
      <Stars radius={80} depth={40} count={3500} factor={3.2} fade speed={0.6} />
      <Suspense fallback={null}>
        <Orb />
      </Suspense>
    </Canvas>
  );
}

export default function CosmicHero({ guestName }: { guestName?: string }) {
  const reduced = useReducedMotion();
  return (
    <section className="relative h-[100svh] w-full overflow-hidden static-cosmos">
      {!reduced && (
        <div className="absolute inset-0" aria-hidden>
          <Scene />
        </div>
      )}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="mb-6 text-sm uppercase tracking-[0.35em] text-ink-dim"
        >
          {guestName ? `Welcome, ${guestName}` : "Under the same sky"}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.5 }}
          className="font-display text-6xl font-light italic leading-tight sm:text-8xl"
        >
          Julie <span className="aurora-text not-italic">&amp;</span> Robert
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.1 }}
          className="mt-8 text-base tracking-[0.2em] text-ink-dim sm:text-lg"
        >
          {WEDDING.dateLabel.toUpperCase()}
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.6 }}
          className="absolute bottom-10 text-xs uppercase tracking-[0.3em] text-ink-dim"
        >
          Scroll ↓
        </motion.div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Use hero in `InvitePage`** — replace the top of `src/components/InvitePage.tsx`'s JSX: swap the bare `<h1>`/greeting block for `<CosmicHero guestName={guest?.name} />` (keep the remaining facts below for now; Task 9 restyles them).

- [ ] **Step 5: Verify in browser**

Dev server: `/` renders full-viewport starfield + floating orb + names; simulate reduced motion (DevTools → Rendering → prefers-reduced-motion) → static gradient, no canvas. Check mobile viewport (375px): no horizontal scroll, text legible.

- [ ] **Step 6: Commit**

```powershell
git add src/app/layout.tsx src/app/globals.css src/components; git commit -m "feat: cosmic theme, R3F starfield hero with reduced-motion fallback"
```

---

### Task 9: Countdown + content sections + registry stub

**Files:**
- Create: `src/components/Countdown.tsx`, `src/components/Sections.tsx`
- Modify: `src/components/InvitePage.tsx`

**Interfaces:**
- Consumes: `WEDDING`, `mapsUrl`, `mapsEmbedUrl`
- Produces:
  - `<Countdown />` client component — live days/hours/minutes/seconds to `WEDDING.date`; static "days to go" text under reduced motion is fine (interval still OK; no animation needed)
  - `Reveal` — scroll-into-view fade/rise wrapper (framer-motion `whileInView`)
  - `WhenWhere`, `Details`, `Registry` section components

- [ ] **Step 1: Create `src/components/Countdown.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { WEDDING } from "@/lib/wedding";

type Parts = { days: number; hours: number; minutes: number; seconds: number };

function partsUntil(target: Date): Parts {
  const ms = Math.max(0, target.getTime() - Date.now());
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor(ms / 3_600_000) % 24,
    minutes: Math.floor(ms / 60_000) % 60,
    seconds: Math.floor(ms / 1000) % 60,
  };
}

export default function Countdown() {
  const [parts, setParts] = useState<Parts | null>(null); // null until mounted (avoids hydration mismatch)
  useEffect(() => {
    setParts(partsUntil(WEDDING.date));
    const id = setInterval(() => setParts(partsUntil(WEDDING.date)), 1000);
    return () => clearInterval(id);
  }, []);

  const cells: [string, number][] = parts
    ? [
        ["Days", parts.days],
        ["Hours", parts.hours],
        ["Minutes", parts.minutes],
        ["Seconds", parts.seconds],
      ]
    : [];

  return (
    <div className="flex justify-center gap-4 sm:gap-8" aria-label="Countdown to the wedding">
      {cells.map(([label, value]) => (
        <div
          key={label}
          className="w-20 rounded-2xl border border-white/10 bg-white/5 py-4 backdrop-blur-sm sm:w-24"
        >
          <div className="font-display text-3xl sm:text-4xl">{value}</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.25em] text-ink-dim">{label}</div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/Sections.tsx`**

```tsx
"use client";

import { motion } from "framer-motion";
import { WEDDING, mapsUrl, mapsEmbedUrl } from "@/lib/wedding";

export function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display mb-8 text-center text-4xl font-light italic sm:text-5xl">
      <span className="aurora-text not-italic">✦</span> {children}
    </h2>
  );
}

export function WhenWhere() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <Reveal>
        <SectionHeading>When &amp; Where</SectionHeading>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm">
          <p className="font-display text-2xl">{WEDDING.venueName}</p>
          <p className="mt-2 text-ink-dim">{WEDDING.venueAddress}</p>
          <div className="my-6 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          <p className="text-lg">{WEDDING.dateLabel}</p>
          <p className="mt-2 text-gold">{WEDDING.arrivalLabel}</p>
          <p className="mt-1 text-ink-dim">Celebration {WEDDING.timeLabel}</p>
          <a
            href={mapsUrl()}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-block rounded-full border border-white/20 px-6 py-3 text-sm uppercase tracking-[0.2em] transition hover:bg-white/10"
          >
            Open in Maps
          </a>
        </div>
        <div className="mt-6 overflow-hidden rounded-3xl border border-white/10">
          <iframe
            src={mapsEmbedUrl()}
            className="h-64 w-full sm:h-80"
            style={{ filter: "invert(90%) hue-rotate(180deg)" }}
            loading="lazy"
            title="Map to Lakeview House"
          />
        </div>
      </Reveal>
    </section>
  );
}

export function Details() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <Reveal>
        <SectionHeading>Details</SectionHeading>
        <div className="grid gap-6 sm:grid-cols-2">
          {[
            ["Arrival", "Please arrive by 11:30 AM so we can begin promptly at noon."],
            ["Attire", "Dress code details coming soon."],
            ["Celebration", "Ceremony and reception details coming soon."],
            ["RSVP", "Kindly respond using your personal link below."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <h3 className="text-sm uppercase tracking-[0.25em] text-gold">{title}</h3>
              <p className="mt-3 text-ink-dim">{body}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

export function Registry() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24 text-center">
      <Reveal>
        <SectionHeading>Gifts</SectionHeading>
        <p className="mx-auto max-w-xl text-ink-dim">
          Your presence is the greatest gift. Our registry is coming soon — check back here closer to the day.
        </p>
      </Reveal>
    </section>
  );
}
```

- [ ] **Step 3: Compose in `src/components/InvitePage.tsx`** (replace file)

```tsx
import CosmicHero from "@/components/CosmicHero";
import Countdown from "@/components/Countdown";
import { WhenWhere, Details, Registry, Reveal, SectionHeading } from "@/components/Sections";
import RsvpCard from "@/components/RsvpCard";

export type InviteGuest = {
  name: string;
  token: string;
  rsvpStatus: string;
  partySize: number;
};

export default function InvitePage({
  guest,
  unknownToken = false,
}: {
  guest: InviteGuest | null;
  unknownToken?: boolean;
}) {
  return (
    <main>
      <CosmicHero guestName={guest?.name} />
      <section className="px-6 py-24">
        <Reveal>
          <SectionHeading>Counting down</SectionHeading>
          <Countdown />
        </Reveal>
      </section>
      <WhenWhere />
      <Details />
      <section id="rsvp" className="mx-auto max-w-xl px-6 py-24">
        <Reveal>
          <SectionHeading>RSVP</SectionHeading>
          {guest ? (
            <RsvpCard guest={guest} />
          ) : (
            <p className="text-center text-ink-dim">
              {unknownToken
                ? "We couldn't find your invitation — please reach out to Julie & Rob and we'll fix it right up."
                : "Please use the personal link from your invitation text or email to RSVP."}
            </p>
          )}
        </Reveal>
      </section>
      <Registry />
      <footer className="pb-16 text-center text-sm text-ink-dim">
        <p className="font-display text-lg italic">With love, Julie &amp; Robert</p>
      </footer>
    </main>
  );
}
```

Note: `RsvpCard` is created in Task 10 — to keep this task shippable, create a stub `src/components/RsvpCard.tsx` now:

```tsx
"use client";
import type { InviteGuest } from "@/components/InvitePage";

export default function RsvpCard({ guest }: { guest: InviteGuest }) {
  return <p className="text-center text-ink-dim">RSVP for {guest.name} — coming right up.</p>;
}
```

- [ ] **Step 4: Verify in browser**

`/` scrolls through hero → countdown (live ticking) → when/where card + map → details grid → RSVP note → gifts stub → footer. Sections fade in on scroll. Mobile 375px: cards stack, no horizontal scroll.

- [ ] **Step 5: Commit**

```powershell
git add src/components; git commit -m "feat: countdown, when/where with map, details, registry stub sections"
```

---

### Task 10: RSVP UI

**Files:**
- Modify: `src/components/RsvpCard.tsx` (replace stub)

**Interfaces:**
- Consumes: `submitRsvp` server action, `InviteGuest`, `MAX_PARTY_SIZE`
- Produces: full RSVP flow: two large buttons → party-size stepper (attending only) → submit → animated confirmation; pre-fills and allows changing an existing response

- [ ] **Step 1: Implement `src/components/RsvpCard.tsx`** (replace file)

```tsx
"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { submitRsvp } from "@/app/actions/rsvp";
import { MAX_PARTY_SIZE } from "@/lib/rsvp";
import type { InviteGuest } from "@/components/InvitePage";

export default function RsvpCard({ guest }: { guest: InviteGuest }) {
  const [attending, setAttending] = useState<boolean | null>(
    guest.rsvpStatus === "YES" ? true : guest.rsvpStatus === "NO" ? false : null
  );
  const [partySize, setPartySize] = useState(Math.max(1, guest.partySize));
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(nextAttending: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await submitRsvp(guest.token, {
        attending: nextAttending,
        partySize: nextAttending ? partySize : 0,
      });
      if (res.ok) setDone(true);
      else setError(res.error ?? "Something went wrong — please try again.");
    });
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.15 }}
              className="font-display aurora-text mx-auto text-6xl"
            >
              ✦
            </motion.div>
            <p className="font-display mt-4 text-2xl italic">
              {attending ? "We can't wait to celebrate with you!" : "You'll be missed — thank you for letting us know."}
            </p>
            <button
              onClick={() => setDone(false)}
              className="mt-6 text-sm uppercase tracking-[0.2em] text-ink-dim underline-offset-4 hover:underline"
            >
              Change response
            </button>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="text-center text-ink-dim">
              {guest.rsvpStatus === "PENDING"
                ? `${guest.name}, will you join us?`
                : `${guest.name}, you can update your response anytime.`}
            </p>
            <div className="mt-6 grid gap-4">
              <button
                onClick={() => setAttending(true)}
                className={`min-h-14 rounded-2xl border px-6 py-4 text-lg transition ${
                  attending === true
                    ? "border-transparent bg-gradient-to-r from-[#7c6cf0] to-[#47c3ff] text-white"
                    : "border-white/20 hover:bg-white/10"
                }`}
              >
                Yes, I&apos;ll be there ✨
              </button>
              <button
                onClick={() => setAttending(false)}
                className={`min-h-14 rounded-2xl border px-6 py-4 text-lg transition ${
                  attending === false
                    ? "border-transparent bg-white/20 text-white"
                    : "border-white/20 hover:bg-white/10"
                }`}
              >
                Sorry, can&apos;t make it
              </button>
            </div>
            <AnimatePresence>
              {attending === true && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-6 flex items-center justify-center gap-6">
                    <button
                      aria-label="Fewer people"
                      onClick={() => setPartySize((n) => Math.max(1, n - 1))}
                      className="h-12 w-12 rounded-full border border-white/20 text-2xl hover:bg-white/10"
                    >
                      −
                    </button>
                    <div className="text-center">
                      <div className="font-display text-4xl">{partySize}</div>
                      <div className="text-[10px] uppercase tracking-[0.25em] text-ink-dim">
                        {partySize === 1 ? "guest" : "guests"} total
                      </div>
                    </div>
                    <button
                      aria-label="More people"
                      onClick={() => setPartySize((n) => Math.min(MAX_PARTY_SIZE, n + 1))}
                      className="h-12 w-12 rounded-full border border-white/20 text-2xl hover:bg-white/10"
                    >
                      +
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {attending !== null && (
              <button
                onClick={() => submit(attending)}
                disabled={pending}
                className="mt-8 min-h-14 w-full rounded-2xl bg-gradient-to-r from-[#7c6cf0] via-[#47c3ff] to-[#ff7ad9] px-6 py-4 text-lg font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {pending ? "Sending…" : "Send RSVP"}
              </button>
            )}
            {error && <p className="mt-4 text-center text-sm text-red-300">{error}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Verify the full guest flow in browser**

Open a seeded guest's `/invite/<token>`: tap Yes → stepper appears → set 2 → Send → confirmation animation. Reload page → shows "you can update your response anytime" with YES pre-selected. Tap "Change response" → decline → confirm. Check DB reflects it: `npx tsx scripts/list-guests.ts`.

- [ ] **Step 3: Run full test suite**

Run: `npm test` — Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add src/components/RsvpCard.tsx; git commit -m "feat: RSVP flow with party-size stepper and confirmation animation"
```

---

### Task 11: Admin auth + dashboard

**Files:**
- Create: `src/app/admin/login/page.tsx`, `src/app/admin/page.tsx`, `src/app/admin/actions.ts`, `src/app/admin/AdminUi.tsx`

**Interfaces:**
- Consumes: `db`, `makeToken`, `computeTallies`, `validateRsvp`, `runManualReminders`, `runScheduledReminders`
- Produces:
  - Cookie-based admin session: httpOnly cookie `admin_session` = SHA-256 hex of `ADMIN_PASSWORD`; every admin server action + the dashboard page verify it
  - Server actions: `loginAction(formData)`, `addGuestAction(formData)`, `deleteGuestAction(formData)`, `setRsvpAction(formData)` (RSVP on behalf), `manualRemindersAction()`, `scheduledRemindersAction()`
  - Dashboard UI: tallies, guest table (status, party size, contact, copy-link, set RSVP, delete), add-guest form, reminders panel with recent `ReminderLog` entries (name, key, channel, simulated badge, time)

- [ ] **Step 1: Create `src/app/admin/actions.ts`**

```ts
"use server";

import { createHash } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { makeToken } from "@/lib/tokens";
import { validateRsvp } from "@/lib/rsvp";
import { runManualReminders, runScheduledReminders } from "@/lib/reminders";

function sessionValue(): string {
  return createHash("sha256").update(process.env.ADMIN_PASSWORD ?? "").digest("hex");
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return jar.get("admin_session")?.value === sessionValue();
}

async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}

export async function loginAction(formData: FormData): Promise<void> {
  const password = String(formData.get("password") ?? "");
  if (password !== (process.env.ADMIN_PASSWORD ?? "")) redirect("/admin/login?error=1");
  const jar = await cookies();
  jar.set("admin_session", sessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  redirect("/admin");
}

export async function addGuestAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  await db.guest.create({ data: { name, email, phone, token: makeToken() } });
  revalidatePath("/admin");
}

export async function deleteGuestAction(formData: FormData): Promise<void> {
  await requireAdmin();
  await db.guest.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/admin");
}

export async function setRsvpAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const attending = formData.get("attending") === "yes";
  const partySize = Number(formData.get("partySize") ?? 1);
  const result = validateRsvp({ attending, partySize });
  if (!result.ok) return;
  await db.guest.update({
    where: { id },
    data: { rsvpStatus: result.status, partySize: result.partySize, respondedAt: new Date() },
  });
  revalidatePath("/admin");
}

export async function manualRemindersAction(): Promise<void> {
  await requireAdmin();
  await runManualReminders(new Date());
  revalidatePath("/admin");
}

export async function scheduledRemindersAction(): Promise<void> {
  await requireAdmin();
  await runScheduledReminders(new Date());
  revalidatePath("/admin");
}
```

- [ ] **Step 2: Create `src/app/admin/login/page.tsx`**

```tsx
import { loginAction } from "@/app/admin/actions";

export default async function AdminLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form
        action={loginAction}
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm"
      >
        <h1 className="font-display text-center text-3xl italic">Admin</h1>
        <input
          type="password"
          name="password"
          placeholder="Password"
          autoFocus
          className="mt-6 w-full rounded-xl border border-white/20 bg-transparent px-4 py-3 outline-none focus:border-white/50"
        />
        {error && <p className="mt-3 text-sm text-red-300">Wrong password — try again.</p>}
        <button className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#7c6cf0] to-[#47c3ff] px-4 py-3 font-medium text-white">
          Enter
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Create `src/app/admin/AdminUi.tsx`** (client bits)

```tsx
"use client";

import { useState } from "react";

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded-lg border border-white/20 px-3 py-1.5 text-xs uppercase tracking-wider hover:bg-white/10"
    >
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}
```

- [ ] **Step 4: Create `src/app/admin/page.tsx`**

```tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { computeTallies } from "@/lib/rsvp";
import { isPracticeMode } from "@/lib/messaging";
import {
  isAdmin,
  addGuestAction,
  deleteGuestAction,
  setRsvpAction,
  manualRemindersAction,
  scheduledRemindersAction,
} from "@/app/admin/actions";
import { CopyLinkButton } from "@/app/admin/AdminUi";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  if (!(await isAdmin())) redirect("/admin/login");

  const guests = await db.guest.findMany({ orderBy: { createdAt: "asc" } });
  const logs = await db.reminderLog.findMany({
    orderBy: { sentAt: "desc" },
    take: 50,
    include: { guest: true },
  });
  const tallies = computeTallies(guests);

  const h = await headers();
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ?? `http://${h.get("host") ?? "localhost:3000"}`;
  const practice = isPracticeMode("email") || isPracticeMode("sms");

  const statCard = (label: string, value: number) => (
    <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
      <div className="font-display text-4xl">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.2em] text-ink-dim">{label}</div>
    </div>
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-display text-4xl italic">
        Wedding HQ {practice && <span className="align-middle rounded-full border border-gold/50 px-3 py-1 text-xs not-italic uppercase tracking-wider text-gold">Practice mode</span>}
      </h1>

      <section className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCard("Attending", tallies.attending)}
        {statCard("Declined", tallies.declined)}
        {statCard("No response", tallies.pending)}
        {statCard("Headcount", tallies.headcount)}
      </section>

      <section className="mt-12">
        <h2 className="text-sm uppercase tracking-[0.25em] text-ink-dim">Add guest</h2>
        <form action={addGuestAction} className="mt-4 flex flex-wrap gap-3">
          <input name="name" placeholder="Name" required className="min-w-40 flex-1 rounded-xl border border-white/20 bg-transparent px-4 py-2.5" />
          <input name="email" placeholder="Email (optional)" className="min-w-40 flex-1 rounded-xl border border-white/20 bg-transparent px-4 py-2.5" />
          <input name="phone" placeholder="Phone (optional)" className="min-w-40 flex-1 rounded-xl border border-white/20 bg-transparent px-4 py-2.5" />
          <button className="rounded-xl bg-gradient-to-r from-[#7c6cf0] to-[#47c3ff] px-6 py-2.5 font-medium text-white">Add</button>
        </form>
      </section>

      <section className="mt-12">
        <h2 className="text-sm uppercase tracking-[0.25em] text-ink-dim">Guests ({guests.length})</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-ink-dim">
              <tr>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Party</th>
                <th className="py-2 pr-4">Contact</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((g) => (
                <tr key={g.id} className="border-t border-white/10">
                  <td className="py-3 pr-4">{g.name}</td>
                  <td className="py-3 pr-4">
                    {g.rsvpStatus === "YES" ? "✅ Yes" : g.rsvpStatus === "NO" ? "❌ No" : "⏳ Pending"}
                  </td>
                  <td className="py-3 pr-4">{g.rsvpStatus === "YES" ? g.partySize : "—"}</td>
                  <td className="py-3 pr-4 text-ink-dim">{[g.email, g.phone].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <CopyLinkButton url={`${base}/invite/${g.token}`} />
                      <form action={setRsvpAction} className="flex items-center gap-1">
                        <input type="hidden" name="id" value={g.id} />
                        <select name="attending" defaultValue={g.rsvpStatus === "NO" ? "no" : "yes"} className="rounded-lg border border-white/20 bg-[#0b0e26] px-2 py-1.5 text-xs">
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                        <input name="partySize" type="number" min={1} max={10} defaultValue={Math.max(1, g.partySize)} className="w-14 rounded-lg border border-white/20 bg-transparent px-2 py-1.5 text-xs" />
                        <button className="rounded-lg border border-white/20 px-3 py-1.5 text-xs uppercase tracking-wider hover:bg-white/10">Set</button>
                      </form>
                      <form action={deleteGuestAction}>
                        <input type="hidden" name="id" value={g.id} />
                        <button className="rounded-lg border border-red-400/30 px-3 py-1.5 text-xs uppercase tracking-wider text-red-300 hover:bg-red-400/10">Remove</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-sm uppercase tracking-[0.25em] text-ink-dim">Reminders</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <form action={manualRemindersAction}>
            <button className="rounded-xl bg-gradient-to-r from-[#7c6cf0] to-[#ff7ad9] px-6 py-3 font-medium text-white">
              Send reminder to everyone who hasn&apos;t RSVP&apos;d
            </button>
          </form>
          <form action={scheduledRemindersAction}>
            <button className="rounded-xl border border-white/20 px-6 py-3 hover:bg-white/10">
              Run scheduled check now
            </button>
          </form>
        </div>
        <div className="mt-6">
          <h3 className="text-xs uppercase tracking-wider text-ink-dim">Recent sends</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {logs.length === 0 && <li className="text-ink-dim">No reminders sent yet.</li>}
            {logs.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5">
                <span>{l.guest.name}</span>
                <span className="text-ink-dim">· {l.channel} · {l.scheduleKey}</span>
                {l.simulated && <span className="rounded-full border border-gold/50 px-2 py-0.5 text-[10px] uppercase text-gold">simulated</span>}
                <span className="ml-auto text-xs text-ink-dim">{l.sentAt.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Verify in browser**

- `/admin` redirects to `/admin/login`; wrong password shows error; `lakeview2026` enters.
- Tallies match seed. Add a guest → appears with Pending. Copy link works. Set RSVP on behalf (Yes, party 2) → tallies update. Remove the test guest.
- "Send reminder…" button → each PENDING guest gets one log row per available contact channel, all badged "simulated"; guests who responded get none. Press again → new rows (manual keys are unique per press — expected).
- "Run scheduled check now" → no sends (today isn't 30/7/3 days out) — verify no new rows.

- [ ] **Step 6: Commit**

```powershell
git add src/app/admin; git commit -m "feat: admin auth, dashboard with tallies, guest management, reminder controls"
```

---

### Task 12: Cron endpoint + final verification

**Files:**
- Create: `src/app/api/cron/reminders/route.ts`, `vercel.json`
- Modify: none

**Interfaces:**
- Consumes: `runScheduledReminders`
- Produces: `GET /api/cron/reminders` — optional `Authorization: Bearer <CRON_SECRET>` check (enforced only when env var set); returns JSON `{ scheduleKey, sent }`. `vercel.json` schedules it daily.

- [ ] **Step 1: Create `src/app/api/cron/reminders/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { runScheduledReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runScheduledReminders(new Date());
  return NextResponse.json(result);
}
```

- [ ] **Step 2: Create `vercel.json`**

```json
{
  "crons": [{ "path": "/api/cron/reminders", "schedule": "0 14 * * *" }]
}
```

(14:00 UTC ≈ 10 AM Eastern daily.)

- [ ] **Step 3: Verify endpoint**

With dev server running: `Invoke-RestMethod http://localhost:3000/api/cron/reminders`
Expected: `{ scheduleKey: null, sent: 0 }` (today isn't a trigger day).

- [ ] **Step 4: Full suite + build**

Run: `npm test` — Expected: PASS.
Run: `npm run build` — Expected: clean production build.

- [ ] **Step 5: End-to-end practice-mode walkthrough (from spec's testing section)**

1. Admin: add guest "Test Guest" with email + phone.
2. Open their copied `/invite/<token>` → greeted by name → RSVP Yes, party 2 → confirmation.
3. Admin: tallies reflect it.
4. Admin: manual reminder → Test Guest gets **no** rows (already RSVP'd); pending seed guests get simulated rows.
5. `/invite/bogus` → graceful message.
6. Mobile viewport + reduced-motion checks on `/`.
7. Remove "Test Guest".

- [ ] **Step 6: Commit**

```powershell
git add src/app/api vercel.json; git commit -m "feat: cron reminder endpoint and Vercel schedule"
```

---

## Deferred to future phases (per spec)

- Real Resend/Twilio/Neon/Vercel/domain hookup (env vars only — step-by-step guide for Robert at that time; switching SQLite→Postgres = change `datasource` provider + `DATABASE_URL`, re-run `prisma migrate`).
- Registry content, dress code, reception details, RSVP deadline copy.
