/**
 * Shared HTML for wedding emails. Embeds this guest's personal flyer (whose QR
 * points at their own RSVP page) followed by a short greeting and a big RSVP
 * button. Used by both invites and reminders.
 */

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? "https://thevanschatz.com";
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function weddingEmailHtml({
  name,
  token,
  intro,
}: {
  name: string;
  token: string;
  intro: string;
}): string {
  const url = `${baseUrl()}/invite/${token}`;
  const flyer = `${baseUrl()}/invite/${token}/flyer`;
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3eee7;padding:32px 0;font-family:Georgia,'Times New Roman',serif;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(107,79,150,0.15);">
        <tr><td><img src="${flyer}" alt="Julie &amp; Robert — You're Invited" width="600" style="display:block;width:100%;height:auto;border:0;"/></td></tr>
        <tr><td style="padding:36px 40px 8px;text-align:center;">
          <div style="font-size:16px;color:#332c44;">Hi ${esc(name)},</div>
          <p style="font-size:16px;line-height:1.6;color:#6d6582;margin:12px 0 0;">${esc(intro)}</p>
        </td></tr>
        <tr><td style="padding:24px 40px 46px;text-align:center;">
          <a href="${url}" style="display:inline-block;background:#6b4f96;color:#ffffff;text-decoration:none;font-size:16px;padding:14px 44px;border-radius:999px;">RSVP here</a>
          <p style="font-size:13px;color:#9a93aa;line-height:1.6;margin-top:20px;">Let us know if you can make it, and how many adults &amp; children.<br/>Or scan the flyer above, or open: <a href="${url}" style="color:#8a6db1;">${url}</a></p>
        </td></tr>
      </table>
      <div style="font-family:Georgia,serif;font-style:italic;color:#9a93aa;font-size:14px;margin-top:20px;">With love, Julie &amp; Robert</div>
    </td></tr>
  </table>`;
}

/**
 * The wedding update: the day's details, the registry, and one line that depends
 * on where the guest stands.
 *
 * Guests who haven't replied get a gentle RSVP request at the bottom rather than
 * the top, since three of them had an automatic reminder only days earlier.
 * Guests who said yes are shown the headcount we have for them, so a wrong
 * number is caught now instead of at the door.
 *
 * Takes the wedding details as arguments so this file stays free of imports.
 */
export type WeddingUpdateDetails = {
  heading: string;
  dateLabel: string;
  timeLabel: string;
  scheduleLabel: string;
  venueName: string;
  venueAddress: string;
  directionsUrl: string;
  newGifts: boolean;
  fundLive: boolean;
};

export function weddingUpdateHtml({
  name,
  token,
  nudgeRsvp,
  partySize,
  details: d,
}: {
  name: string;
  token: string;
  nudgeRsvp: boolean;
  partySize: number | null;
  details: WeddingUpdateDetails;
}): string {
  const invite = `${baseUrl()}/invite/${token}`;
  const registry = `${invite}/registry`;

  const giftLine =
    "A few people have asked about gifts. Having you there really is the gift &mdash; but " +
    "if you&rsquo;d like to, we&rsquo;ve put together a registry" +
    (d.newGifts ? ", and we&rsquo;ve just added some new things to it" : "") +
    (d.fundLive ? ". There&rsquo;s a honeymoon fund there too, if you&rsquo;d rather." : ".");

  const standing = nudgeRsvp
    ? `
        <tr><td style="padding:0 40px;">
          <div style="height:1px;background:#e4dccd;margin:4px 0 26px;"></div>
        </td></tr>
        <tr><td style="padding:0 40px 40px;text-align:center;">
          <p style="font-size:15px;line-height:1.6;color:#6d6582;margin:0 0 18px;">
            We haven&rsquo;t heard from you yet &mdash; could you let us know if you can make it?
            It really does help us plan.
          </p>
          <a href="${invite}" style="display:inline-block;border:1px solid #d9cbe9;color:#6b4f96;text-decoration:none;font-size:15px;padding:12px 36px;border-radius:999px;">RSVP here</a>
        </td></tr>`
    : partySize
      ? `
        <tr><td style="padding:0 40px 38px;text-align:center;">
          <p style="font-size:14px;line-height:1.6;color:#9a93aa;margin:0;">
            We have you down for ${partySize} ${partySize === 1 ? "guest" : "guests"}.
            If anything changes, <a href="${invite}" style="color:#8a6db1;">update your RSVP here</a>.
          </p>
        </td></tr>`
      : `<tr><td style="padding:0 0 30px;"></td></tr>`;

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3eee7;padding:32px 0;font-family:Georgia,'Times New Roman',serif;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(107,79,150,0.15);">
        <tr><td style="padding:44px 40px 0;text-align:center;">
          <div style="font-family:Georgia,serif;font-style:italic;font-size:32px;color:#6b4f96;">${esc(d.heading)}</div>
        </td></tr>
        <tr><td style="padding:24px 40px 6px;text-align:center;">
          <div style="font-size:16px;color:#332c44;">Hi ${esc(name)},</div>
          <p style="font-size:16px;line-height:1.6;color:#6d6582;margin:12px 0 0;">
            We can&rsquo;t quite believe it&rsquo;s nearly here. A quick reminder of the day:
          </p>
        </td></tr>
        <tr><td style="padding:20px 40px 8px;">
          <div style="background:#faf8f4;border:1px solid #efe8dc;border-radius:16px;padding:22px 20px;text-align:center;">
            <div style="font-size:18px;color:#332c44;">${esc(d.dateLabel)}</div>
            <div style="font-size:14px;color:#6d6582;margin-top:6px;">${esc(d.timeLabel)} &middot; ${esc(d.scheduleLabel)}</div>
            <div style="font-size:17px;color:#332c44;margin-top:16px;">${esc(d.venueName)}</div>
            <div style="font-size:14px;color:#6d6582;margin-top:4px;">${esc(d.venueAddress)}</div>
            <a href="${d.directionsUrl}" style="display:inline-block;margin-top:12px;font-size:14px;color:#8a6db1;">Get directions &rarr;</a>
          </div>
        </td></tr>
        <tr><td style="padding:26px 40px 8px;text-align:center;">
          <p style="font-size:16px;line-height:1.6;color:#6d6582;margin:0;">${giftLine}</p>
        </td></tr>
        <tr><td style="padding:22px 40px 34px;text-align:center;">
          <a href="${registry}" style="display:inline-block;background:#6b4f96;color:#ffffff;text-decoration:none;font-size:16px;padding:14px 44px;border-radius:999px;">See the registry</a>
        </td></tr>${standing}
      </table>
      <div style="font-family:Georgia,serif;font-style:italic;color:#9a93aa;font-size:14px;margin-top:20px;">With love, Julie &amp; Robert</div>
    </td></tr>
  </table>`;
}

/** Plain-text version, for mail apps that don't show HTML. */
export function weddingUpdateText({
  name,
  token,
  nudgeRsvp,
  partySize,
  details: d,
}: {
  name: string;
  token: string;
  nudgeRsvp: boolean;
  partySize: number | null;
  details: WeddingUpdateDetails;
}): string {
  const invite = `${baseUrl()}/invite/${token}`;
  const lines = [
    `Hi ${name},`,
    "",
    `${d.heading}! A quick reminder of the day:`,
    `${d.dateLabel}, ${d.timeLabel} (${d.scheduleLabel})`,
    `${d.venueName}, ${d.venueAddress}`,
    `Directions: ${d.directionsUrl}`,
    "",
    "A few people have asked about gifts. Having you there really is the gift, but if you'd like to, " +
      `we've put together a registry${d.newGifts ? " and just added some new things to it" : ""}` +
      `${d.fundLive ? ", with a honeymoon fund too" : ""}: ${invite}/registry`,
  ];
  if (nudgeRsvp) {
    lines.push("", `We haven't heard from you yet. Could you let us know if you can make it? ${invite}`);
  } else if (partySize) {
    lines.push(
      "",
      `We have you down for ${partySize} ${partySize === 1 ? "guest" : "guests"}. If anything changes: ${invite}`
    );
  }
  lines.push("", "With love, Julie & Robert");
  return lines.join("\n");
}
