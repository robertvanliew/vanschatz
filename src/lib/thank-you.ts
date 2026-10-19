/**
 * The thank-you email, sent after the wedding to every guest who said they
 * were coming.
 *
 * Designed like a premium brand's editorial newsletter rather than a wedding
 * template: a full-bleed photo from the day, a serif headline, a short letter,
 * a "the day in numbers" band and a quiet footer. Guests who claimed gifts get
 * a block naming them.
 *
 * Uses the website's Cormorant Garamond and Jost where the mail app loads web
 * fonts (Apple Mail, iOS), falling back to Georgia and Helvetica elsewhere.
 *
 * "Said they were coming" is the best record there is: the guest list knows
 * RSVPs, not who walked through the door. The couple can leave anyone out.
 *
 * Pure, so who gets what can be tested without emailing anyone.
 */

export const THANKS_KEY = "thank-you-2026-10";

export type ThanksGuest = {
  id: string;
  name: string;
  email: string | null;
  rsvpStatus: string;
  reminders: { scheduleKey: string; channel: string; simulated: boolean }[];
  giftClaims: { gift: { title: string } }[];
};

export type ThanksSend = { guestId: string; to: string; gifts: string[] };

/** Everyone who said yes and has an email, minus anyone already thanked or left out. */
export function planThankYou(
  guests: ThanksGuest[],
  exclude: string[] = []
): { sends: ThanksSend[]; skipped: { guestId: string; reason: string }[] } {
  const sends: ThanksSend[] = [];
  const skipped: { guestId: string; reason: string }[] = [];
  for (const g of guests) {
    if (g.rsvpStatus !== "YES") skipped.push({ guestId: g.id, reason: "not attending" });
    else if (!g.email) skipped.push({ guestId: g.id, reason: "no-email" });
    else if (exclude.includes(g.id)) skipped.push({ guestId: g.id, reason: "left out" });
    else if (g.reminders.some((r) => r.scheduleKey === THANKS_KEY && r.channel === "email" && !r.simulated))
      skipped.push({ guestId: g.id, reason: "already-sent" });
    else sends.push({ guestId: g.id, to: g.email, gifts: g.giftClaims.map((c) => cleanGiftTitle(c.gift.title)) });
  }
  return { sends, skipped };
}

/** "Waterless Aroma Diffuser," → "Waterless Aroma Diffuser". */
export function cleanGiftTitle(title: string): string {
  return title.trim().replace(/[\s,;:.\-–—]+$/, "");
}

/** "the A", "the A and the B", "the A, the B and the C". */
export function giftList(gifts: string[]): string {
  const items = gifts.map((g) => `the ${g}`);
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const C = {
  page: "#f4f1ec",
  paper: "#ffffff",
  ink: "#1f1a2b",
  body: "#3d3650",
  muted: "#7b7489",
  rule: "#e8e2d8",
  gold: "#a0804a",
  plum: "#3b2d55",
  plumText: "#d9cfe9",
  green: "#5f7554",
  giftBg: "#f8f6f1",
};

const SERIF = "font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;";
const SANS = "font-family:'Jost','Helvetica Neue',Helvetica,Arial,sans-serif;";

export const THANKS_SUBJECT = "Thank you, from Julie & Robert";

export type ThankYouInput = {
  name: string;
  gifts: string[];
  /** Absolute URL of the photo from the day; omitted, the email still reads whole. */
  photoUrl: string | null;
  /** Song requests guests sent in; the numbers band leaves it out at zero. */
  songRequests: number;
  siteUrl: string;
};

export function thankYouEmail(input: ThankYouInput): { subject: string; html: string; text: string } {
  const { name, gifts, photoUrl, songRequests, siteUrl } = input;
  const giftThanks = gifts.length
    ? `Thank you so much for ${giftList(gifts)}. Your generosity means more to us than we can say.`
    : null;

  const stats = [
    ...(songRequests > 0 ? [{ n: String(songRequests), label: "Song requests" }] : []),
    { n: "5", label: "Entrées" },
    { n: "2", label: "“I do”s" },
  ];

  const statCells = stats
    .map(
      (s) => `
          <td align="center" valign="top" width="${Math.floor(100 / stats.length)}%" style="padding:0 6px;">
            <div class="stat-n" style="${SERIF}font-size:46px;line-height:1;color:#ffffff;">${esc(s.n)}</div>
            <div style="${SANS}font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:${C.plumText};margin-top:10px;">${esc(s.label)}</div>
          </td>`
    )
    .join("");

  const giftBlock = gifts.length
    ? `
      <tr><td class="px" style="padding:0 56px 44px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td bgcolor="${C.giftBg}" style="background:${C.giftBg};border-left:3px solid ${C.gold};padding:24px 26px;">
            <div style="${SANS}font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${C.gold};">Your ${gifts.length > 1 ? "gifts" : "gift"}</div>
            ${gifts
              .map(
                (g) =>
                  `<div style="${SERIF}font-size:22px;line-height:1.3;color:${C.ink};margin-top:10px;">${esc(g)}</div>`
              )
              .join("")}
            <div style="${SANS}font-size:16px;line-height:1.6;color:${C.body};margin-top:14px;">Thank you so much. Your generosity means more to us than we can say.</div>
          </td>
        </tr></table>
      </td></tr>`
    : "";

  const html = `
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Jost:wght@400;500&display=swap');
  @media only screen and (max-width: 600px) {
    .px { padding-left: 28px !important; padding-right: 28px !important; }
    .h1 { font-size: 46px !important; }
    .stat-n { font-size: 38px !important; }
  }
</style>
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Sharing the day with you is something we&rsquo;ll treasure forever.&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.page}" style="background:${C.page};">
  <tr><td align="center" style="padding:28px 12px 40px;">

    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
      <tr>
        <td style="padding:0 8px 18px;${SERIF}font-size:22px;color:${C.ink};">Julie &amp; Robert</td>
        <td align="right" style="padding:0 8px 18px;${SANS}font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:${C.muted};">October 17, 2026</td>
      </tr>
    </table>

    <table role="presentation" width="600" cellpadding="0" cellspacing="0" bgcolor="${C.paper}" style="max-width:600px;width:100%;background:${C.paper};border-radius:14px;overflow:hidden;">
      ${
        photoUrl
          ? `<tr><td><img src="${esc(photoUrl)}" width="600" alt="Julie and Robert by the lake on their wedding day" style="display:block;width:100%;height:auto;border:0;"/></td></tr>`
          : ""
      }

      <tr><td class="px" style="padding:52px 56px 8px;">
        <div style="${SANS}font-size:11px;letter-spacing:3.5px;text-transform:uppercase;color:${C.gold};">With gratitude</div>
        <div class="h1" style="${SERIF}font-size:58px;line-height:1.02;font-weight:400;color:${C.ink};margin-top:14px;">Thank you.</div>
        <div style="width:48px;height:2px;background:${C.gold};margin:26px 0 30px;line-height:2px;font-size:0;">&nbsp;</div>
        <div style="${SANS}font-size:18px;line-height:1.7;color:${C.ink};">Dear ${esc(name)},</div>
        <div style="${SANS}font-size:18px;line-height:1.7;color:${C.body};margin-top:14px;">
          Thank you for celebrating with us at Lakeview House on October&nbsp;17. Sharing the day with the
          people we love most is something we&rsquo;ll treasure forever, and having you there meant the world to us.
        </div>
        <div style="${SERIF}font-style:italic;font-size:22px;color:${C.body};margin-top:30px;">With love,</div>
        <div style="${SERIF}font-size:34px;line-height:1.1;color:${C.ink};margin-top:2px;">Julie &amp; Robert</div>
      </td></tr>
      <tr><td style="height:44px;line-height:44px;font-size:0;">&nbsp;</td></tr>
      ${giftBlock}

      <tr><td bgcolor="${C.plum}" style="background:${C.plum};padding:44px 24px 46px;">
        <div style="${SANS}font-size:11px;letter-spacing:3.5px;text-transform:uppercase;color:${C.plumText};text-align:center;margin-bottom:28px;">The day in numbers</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${statCells}</tr></table>
      </td></tr>

      <tr><td align="center" style="padding:40px 32px 44px;">
        <div style="${SERIF}font-size:30px;color:${C.ink};letter-spacing:2px;">J <span style="color:${C.gold};font-style:italic;">&amp;</span> R</div>
        <div style="${SANS}font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${C.muted};margin-top:12px;">Married October 17, 2026</div>
        <div style="${SANS}font-size:13px;color:${C.muted};margin-top:4px;">Lakeview House &middot; Newburgh, New York</div>
      </td></tr>
    </table>

    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
      <tr><td align="center" style="padding:24px 24px 0;${SANS}font-size:12px;line-height:1.6;color:${C.muted};">
        You&rsquo;re receiving this because you celebrated with us.<br/>
        <a href="${esc(siteUrl)}" style="color:${C.muted};text-decoration:underline;">${esc(siteUrl.replace(/^https?:\/\//, ""))}</a>
      </td></tr>
    </table>

  </td></tr>
</table>`;

  const text = [
    "Julie & Robert, October 17, 2026",
    "",
    "THANK YOU.",
    "",
    `Dear ${name},`,
    "",
    "Thank you for celebrating with us at Lakeview House on October 17. Sharing the day with the people we love most is something we'll treasure forever, and having you there meant the world to us.",
    ...(giftThanks ? ["", giftThanks] : []),
    "",
    "With love,",
    "Julie & Robert",
    "",
    `The day in numbers: ${stats.map((s) => `${s.n} ${s.label.toLowerCase()}`).join(" / ")}`,
  ].join("\n");

  return { subject: THANKS_SUBJECT, html, text };
}
