import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendFinalDetails } from "@/lib/invites";
import { APPROVAL_KEY, editionDue, parseEdition } from "@/lib/final-details";

export const dynamic = "force-dynamic";
// ~25 guests at 150ms apart plus the provider's time: well under a minute.
export const maxDuration = 60;

/**
 * Scheduled send of one edition of the final-details email (see vercel.json).
 *
 * Three gates, so nothing goes out that shouldn't: the cron secret, the
 * couple's approval after reading the tests, and the date — an edition only
 * sends on its own day, however this route gets called.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ edition: string }> }) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const edition = parseEdition((await ctx.params).edition);
  if (!edition) return NextResponse.json({ error: "unknown edition" }, { status: 404 });

  const approval = await db.setting.findUnique({ where: { key: APPROVAL_KEY } });
  if (approval?.value !== "yes") {
    return NextResponse.json({ edition, skipped: "not approved" });
  }
  if (!editionDue(edition, new Date())) {
    return NextResponse.json({ edition, skipped: "not this edition's day" });
  }

  return NextResponse.json({ edition, ...(await sendFinalDetails(edition)) });
}
