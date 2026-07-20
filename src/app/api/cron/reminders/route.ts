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
