import fs from "fs";
import path from "path";
import { WEDDING } from "@/lib/wedding";
import { db } from "@/lib/db";
import { sendMessage } from "@/lib/messaging";

const INVITE_KEY = "invite";
const INVITE_SUBJECT = "You're invited — Julie & Robert's wedding";

function baseUrl(): string {
  // Prefer an explicit env override; otherwise the production domain so email
  // links never point at localhost.
  return process.env.NEXT_PUBLIC_BASE_URL ?? "https://thevanschatz.com";
}

/** If a poster image exists in /public, return its public URL (else null). */
function posterUrl(): string | null {
  const names = ["invite-poster.jpg", "invite-poster.jpeg", "invite-poster.png", "invite-poster.webp"];
  for (const name of names) {
    if (fs.existsSync(path.join(process.cwd(), "public", name))) {
      return `${baseUrl()}/${name}`;
    }
  }
  return null;
}

export function inviteBody(name: string, token: string): string {
  return (
    `Hi ${name}! Julie & Robert are getting married on ${WEDDING.dateLabel} ` +
    `at ${WEDDING.venueName}, Newburgh, NY — and you're invited. ` +
    `Please RSVP with your personal link (let us know how many adults & children): ` +
    `${baseUrl()}/invite/${token}`
  );
}

/** A designed HTML invitation — reads like a poster in the inbox. */
export function inviteHtml(name: string, token: string): string {
  const url = `${baseUrl()}/invite/${token}`;
  const poster = posterUrl();
  const posterRow = poster
    ? `<tr><td><img src="${poster}" alt="Julie & Robert" width="600" style="display:block;width:100%;height:auto;border:0;"/></td></tr>`
    : "";
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3eee7;padding:32px 0;font-family:Georgia,'Times New Roman',serif;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(107,79,150,0.15);">
        ${posterRow}
        <tr><td style="padding:44px 40px 8px;text-align:center;">
          <div style="font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#8f6f3a;">You&rsquo;re Invited</div>
          <div style="font-size:42px;color:#5f7554;margin:14px 0 4px;">Julie <span style="color:#8f6f3a;font-style:italic;">&amp;</span> Robert</div>
          <div style="height:1px;width:120px;background:#e4dccd;margin:20px auto;"></div>
          <div style="font-size:16px;color:#332c44;">Hi ${name},</div>
          <p style="font-size:16px;line-height:1.6;color:#6d6582;margin:14px 0;">We&rsquo;re getting married, and we&rsquo;d be honored to have you celebrate with us.</p>
          <div style="font-size:15px;color:#332c44;letter-spacing:1px;line-height:1.8;margin-top:10px;">
            ${WEDDING.dateLabel}<br/>${WEDDING.timeLabel}<br/>${WEDDING.venueName} &middot; Newburgh, NY<br/>
            <span style="color:#6d6582;">${WEDDING.scheduleLabel}</span>
          </div>
        </td></tr>
        <tr><td style="padding:26px 40px 46px;text-align:center;">
          <a href="${url}" style="display:inline-block;background:#6b4f96;color:#ffffff;text-decoration:none;font-size:16px;padding:14px 44px;border-radius:999px;">RSVP here</a>
          <p style="font-size:13px;color:#9a93aa;line-height:1.6;margin-top:20px;">Let us know if you can make it, and how many adults &amp; children.<br/>Or open: <a href="${url}" style="color:#8a6db1;">${url}</a></p>
        </td></tr>
      </table>
      <div style="font-style:italic;color:#9a93aa;font-size:14px;margin-top:20px;">With love, Julie &amp; Robert</div>
    </td></tr>
  </table>`;
}

const claimWhere = (guestId: string) => ({
  guestId_scheduleKey_channel: { guestId, scheduleKey: INVITE_KEY, channel: "email" },
});

/** Email one guest their invite. Re-sendable; records that they've been invited. */
export async function sendInviteToGuest(
  guestId: string
): Promise<{ ok: boolean; reason?: string }> {
  const guest = await db.guest.findUnique({ where: { id: guestId } });
  if (!guest) return { ok: false, reason: "not found" };
  if (!guest.email) return { ok: false, reason: "no email on file" };

  const { simulated } = await sendMessage(
    "email",
    guest.email,
    inviteBody(guest.name, guest.token),
    INVITE_SUBJECT,
    inviteHtml(guest.name, guest.token)
  );

  // Mark as invited (upsert so re-sends just refresh the timestamp).
  await db.reminderLog.upsert({
    where: claimWhere(guest.id),
    create: { guestId: guest.id, scheduleKey: INVITE_KEY, channel: "email", simulated },
    update: { simulated, sentAt: new Date() },
  });
  return { ok: true };
}

/**
 * Email every guest who has an address and hasn't had a *real* invite sent yet.
 * A simulated send (practice mode, before Resend keys exist) does NOT count as
 * done, so testing the button now won't block the real send later.
 */
export async function sendAllInvites(): Promise<{ sent: number; skipped: number }> {
  const guests = await db.guest.findMany({ include: { reminders: true } });
  let sent = 0;
  let skipped = 0;

  for (const g of guests) {
    if (!g.email) {
      skipped++;
      continue;
    }
    const reallyInvited = g.reminders.some(
      (r) => r.scheduleKey === INVITE_KEY && r.channel === "email" && !r.simulated
    );
    if (reallyInvited) {
      skipped++;
      continue;
    }
    try {
      const { simulated } = await sendMessage(
        "email",
        g.email,
        inviteBody(g.name, g.token),
        INVITE_SUBJECT,
        inviteHtml(g.name, g.token)
      );
      // upsert so the fixed (guest, invite, email) row can't collide, and a
      // later real send can overwrite an earlier simulated one.
      await db.reminderLog.upsert({
        where: claimWhere(g.id),
        create: { guestId: g.id, scheduleKey: INVITE_KEY, channel: "email", simulated },
        update: { simulated, sentAt: new Date() },
      });
      sent++;
    } catch (err) {
      console.error(`Failed to send invite to guest ${g.id}:`, err);
    }
  }
  return { sent, skipped };
}
