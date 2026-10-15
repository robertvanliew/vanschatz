/**
 * The final-details email: two sends in the last days before the wedding, with
 * the day's details, the dinner menu, and two things guests can do — pick songs
 * and look at the registry.
 *
 * Written for people who skim. One column, large type, a label on every
 * section, and at most two actions, each its own big button. Guests who haven't
 * replied see the RSVP first, because at this point it's the only thing that
 * matters for them.
 *
 *   Edition 1 — two days out (Thursday morning): "2 days to go"
 *   Edition 2 — the evening before (Friday):      "Tomorrow!"
 *
 * Neither goes out until the couple approves after reading the tests (the
 * APPROVAL_KEY setting); the cron routes check it and the date before sending.
 *
 * Pure, so who gets what can be tested without emailing anyone.
 */
import { daysUntil, WEDDING, mapsDirUrl } from "@/lib/wedding";
import { MENU } from "@/lib/menu";

export type Edition = 1 | 2;

export const FINAL_KEYS: Record<Edition, string> = {
  1: "final-details-1",
  2: "final-details-2",
};

/** Setting the couple flips after reading the test emails. */
export const APPROVAL_KEY = "finalDetails.approved";

/** Days before the wedding each edition belongs to. */
const DAYS_OUT: Record<Edition, number> = { 1: 2, 2: 1 };

/**
 * Whether today is this edition's day. The cron routes check it so a misfire,
 * a retry or a redeploy can never send "Tomorrow!" on the wrong day.
 */
export function editionDue(edition: Edition, now: Date): boolean {
  return daysUntil(now) === DAYS_OUT[edition];
}

export function parseEdition(raw: string | null | undefined): Edition | null {
  return raw === "1" ? 1 : raw === "2" ? 2 : null;
}

/* ------------------------------------------------------------- recipients */

export type FinalGuest = {
  id: string;
  name: string;
  email: string | null;
  rsvpStatus: string;
  partySize: number;
  reminders: { scheduleKey: string; channel: string; simulated: boolean }[];
};

export type FinalSend = {
  guestId: string;
  to: string;
  nudgeRsvp: boolean;
  partySize: number | null;
};

/**
 * Who gets an edition: everyone who hasn't declined and has an email, minus
 * anyone this edition already reached. Decided at send time, so someone who
 * declines on Thursday doesn't get Friday's "see you tomorrow".
 */
export function planFinalDetails(
  guests: FinalGuest[],
  edition: Edition
): { sends: FinalSend[]; skipped: { guestId: string; reason: "declined" | "no-email" | "already-sent" }[] } {
  const key = FINAL_KEYS[edition];
  const sends: FinalSend[] = [];
  const skipped: { guestId: string; reason: "declined" | "no-email" | "already-sent" }[] = [];
  for (const g of guests) {
    if (g.rsvpStatus === "NO") {
      skipped.push({ guestId: g.id, reason: "declined" });
    } else if (!g.email) {
      skipped.push({ guestId: g.id, reason: "no-email" });
    } else if (
      g.reminders.some((r) => r.scheduleKey === key && r.channel === "email" && !r.simulated)
    ) {
      skipped.push({ guestId: g.id, reason: "already-sent" });
    } else {
      sends.push({
        guestId: g.id,
        to: g.email,
        nudgeRsvp: g.rsvpStatus === "PENDING",
        partySize: g.rsvpStatus === "YES" && g.partySize > 0 ? g.partySize : null,
      });
    }
  }
  return { sends, skipped };
}

/* ------------------------------------------------------------------ email */

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? "https://thevanschatz.com";
}

const COPY: Record<
  Edition,
  { subject: string; heading: string; intro: string; songsTitle: string; preheader: string }
> = {
  1: {
    subject: "2 days to go — the menu, the music & directions",
    heading: "2 days to go!",
    intro: "Saturday is almost here. Everything you need is below — it takes about a minute.",
    songsTitle: "Pick your songs",
    preheader: "Saturday at 11:30 AM · Lakeview House · the dinner menu · pick your songs",
  },
  2: {
    subject: "Tomorrow! Everything you need for Saturday",
    heading: "See you tomorrow!",
    intro: "Tomorrow’s the day. Here’s everything for the morning, all in one place.",
    songsTitle: "Last chance to pick your songs",
    preheader: "Tomorrow at 11:30 AM · Lakeview House · directions and the dinner menu",
  },
};

export type FinalEmailInput = {
  edition: Edition;
  name: string;
  token: string;
  nudgeRsvp: boolean;
  partySize: number | null;
  /** Whether the honeymoon fund is live, so the gifts line can mention it. */
  fundLive: boolean;
};

const C = {
  ink: "#332c44",
  dim: "#5f5873",
  soft: "#8a8399",
  purple: "#6b4f96",
  line: "#ece5f3",
  cream: "#faf8f4",
};

/** A full-width button; tables so Outlook draws it too. */
function button(href: string, label: string, filled: boolean): string {
  const style = filled
    ? `background:${C.purple};color:#ffffff;border:2px solid ${C.purple};`
    : `background:#ffffff;color:${C.purple};border:2px solid #cdbde3;`;
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td align="center" style="border-radius:999px;${style}">
        <a href="${href}" style="display:block;padding:15px 20px;font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:bold;text-decoration:none;color:${filled ? "#ffffff" : C.purple};border-radius:999px;">${label}</a>
      </td>
    </tr></table>`;
}

/** A small uppercase label that starts every section, so the eye can find it. */
function label(icon: string, text: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;letter-spacing:2px;color:${C.purple};text-transform:uppercase;margin:0 0 14px;">${icon}&nbsp; ${text}</div>`;
}

const section = (inner: string, pad = "28px 32px") =>
  `<tr><td style="padding:${pad};border-top:1px solid ${C.line};">${inner}</td></tr>`;

export function finalDetailsEmail(input: FinalEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const copy = COPY[input.edition];
  const invite = `${baseUrl()}/invite/${input.token}`;
  const songs = `${invite}#songs`;
  const gifts = `${invite}/registry`;
  const directions = mapsDirUrl();
  const sans = "font-family:Arial,Helvetica,sans-serif;";
  const party =
    input.partySize === null
      ? null
      : `${input.partySize} ${input.partySize === 1 ? "guest" : "guests"}`;
  const giftsLine = input.fundLive
    ? "Having you there is the gift. If you’d like to, here’s our registry and honeymoon fund."
    : "Having you there is the gift. If you’d like to, here’s our registry.";

  const rsvp = input.nudgeRsvp
    ? `
    <tr><td style="padding:0 32px 28px;">
      <div style="background:#fff7e8;border:2px solid #efd9a7;border-radius:16px;padding:22px;">
        <div style="${sans}font-size:19px;font-weight:bold;color:${C.ink};">First: can you make it?</div>
        <div style="${sans}font-size:16px;line-height:1.5;color:${C.dim};margin:6px 0 16px;">We still need your RSVP. One tap.</div>
        ${button(invite, "Reply yes or no", true)}
      </div>
    </td></tr>`
    : "";

  const step = (n: number, title: string, body: string, cta: string) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;"><tr>
      <td width="44" valign="top">
        <div style="width:34px;height:34px;line-height:34px;border-radius:17px;background:${C.purple};color:#fff;text-align:center;${sans}font-size:17px;font-weight:bold;">${n}</div>
      </td>
      <td valign="top">
        <div style="${sans}font-size:19px;font-weight:bold;color:${C.ink};line-height:34px;">${title}</div>
        <div style="${sans}font-size:16px;line-height:1.5;color:${C.dim};margin:2px 0 14px;">${body}</div>
        ${cta}
      </td>
    </tr></table>`;

  const menu = MENU.entrees
    .map(
      (e, i) => `
      <div style="padding:14px 0;${i ? `border-top:1px dashed ${C.line};` : ""}">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;color:${C.ink};">${esc(e.name)}</div>
        <div style="${sans}font-size:15px;line-height:1.5;color:${C.dim};margin-top:3px;">${esc(e.description)}</div>
      </div>`
    )
    .join("");

  const html = `
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(copy.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3eee7;padding:28px 12px;">
  <tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:22px;overflow:hidden;">

      <tr><td style="padding:40px 32px 26px;text-align:center;">
        <div style="${sans}font-size:12px;letter-spacing:3px;color:${C.soft};text-transform:uppercase;">Julie &amp; Robert</div>
        <div style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:40px;line-height:1.15;color:${C.purple};margin-top:10px;">${esc(copy.heading)}</div>
        <div style="${sans}font-size:17px;line-height:1.5;color:${C.dim};margin-top:14px;">Hi ${esc(input.name)}! ${esc(copy.intro)}</div>
      </td></tr>
      ${rsvp}

      ${section(`
        ${label("&#128205;", "The day")}
        <div style="${sans}font-size:21px;font-weight:bold;color:${C.ink};">${esc(WEDDING.dateLabel)}</div>
        <div style="${sans}font-size:17px;color:${C.dim};margin-top:4px;">${esc(WEDDING.timeLabel)} &middot; ${esc(WEDDING.scheduleLabel)}</div>
        <div style="${sans}font-size:19px;font-weight:bold;color:${C.ink};margin-top:16px;">${esc(WEDDING.venueName)}</div>
        <div style="${sans}font-size:16px;color:${C.dim};margin:4px 0 18px;">${esc(WEDDING.venueAddress)}</div>
        ${button(directions, "Get directions", false)}
        ${
          party
            ? `<div style="${sans}font-size:15px;color:${C.soft};margin-top:16px;text-align:center;">We have you down for <b style="color:${C.ink};">${party}</b>. Changed? <a href="${invite}" style="color:${C.purple};">Update it here</a>.</div>`
            : ""
        }
      `)}

      ${section(`
        ${label("&#10024;", "Two quick things")}
        ${step(1, copy.songsTitle, "What gets you on the dance floor? Choose up to 5 songs.", button(songs, "Pick my songs", true))}
        ${step(2, "Gifts <span style=\"font-weight:normal;color:" + C.soft + ";\">(optional)</span>", esc(giftsLine), button(gifts, "See the gifts", false))}
      `, "28px 32px 6px")}

      ${section(`
        ${label("&#127869;&#65039;", "What’s for dinner")}
        <div style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:17px;line-height:1.5;color:${C.dim};margin-bottom:6px;">${esc(MENU.intro)}</div>
        ${menu}
      `)}

      <tr><td style="padding:30px 32px 38px;text-align:center;background:${C.cream};border-top:1px solid ${C.line};">
        <div style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:26px;color:${C.purple};">See you Saturday!</div>
        <div style="${sans}font-size:16px;color:${C.dim};margin-top:8px;">With love, Julie &amp; Robert</div>
        <div style="${sans}font-size:13px;color:${C.soft};margin-top:18px;">Your invitation: <a href="${invite}" style="color:${C.purple};">${esc(invite.replace(/^https?:\/\//, ""))}</a></div>
      </td></tr>

    </table>
  </td></tr>
</table>`;

  const text = [
    `${copy.heading}`,
    "",
    `Hi ${input.name}! ${copy.intro}`,
    ...(input.nudgeRsvp ? ["", "FIRST: CAN YOU MAKE IT?", `We still need your RSVP: ${invite}`] : []),
    "",
    "THE DAY",
    `${WEDDING.dateLabel}`,
    `${WEDDING.timeLabel} - ${WEDDING.scheduleLabel}`,
    `${WEDDING.venueName}, ${WEDDING.venueAddress}`,
    `Directions: ${directions}`,
    ...(party ? [`We have you down for ${party}. Changed? ${invite}`] : []),
    "",
    "TWO QUICK THINGS",
    `1. ${copy.songsTitle} (up to 5): ${songs}`,
    `2. Gifts (optional). ${giftsLine} ${gifts}`,
    "",
    "WHAT'S FOR DINNER",
    MENU.intro,
    ...MENU.entrees.map((e) => `- ${e.name}: ${e.description}`),
    "",
    "See you Saturday!",
    "With love, Julie & Robert",
  ].join("\n");

  return { subject: copy.subject, html, text };
}
