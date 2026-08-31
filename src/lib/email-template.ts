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
 * The registry announcement.
 *
 * Leads with the news rather than the chase: the 17 people who haven't replied
 * simply haven't got round to it, and opening with a nudge reads as nagging.
 * The RSVP paragraph is appended only for those guests, so anyone who already
 * said yes is never asked twice.
 *
 * No flyer image at the top — this is an update, not the invitation, and a
 * second copy of the invitation would muddle the message.
 */
export function registryEmailHtml({
  name,
  token,
  nudgeRsvp,
}: {
  name: string;
  token: string;
  nudgeRsvp: boolean;
}): string {
  const invite = `${baseUrl()}/invite/${token}`;
  const registry = `${invite}/registry`;

  const nudge = nudgeRsvp
    ? `
        <tr><td style="padding:0 40px;">
          <div style="height:1px;background:#e4dccd;margin:8px 0 28px;"></div>
        </td></tr>
        <tr><td style="padding:0 40px 40px;text-align:center;">
          <p style="font-size:15px;line-height:1.6;color:#6d6582;margin:0 0 20px;">
            One more thing &mdash; we haven&rsquo;t heard from you yet. Could you let us know if
            you can make it? It really does help us plan.
          </p>
          <a href="${invite}" style="display:inline-block;border:1px solid #d9cbe9;color:#6b4f96;text-decoration:none;font-size:15px;padding:12px 36px;border-radius:999px;">RSVP here</a>
        </td></tr>`
    : "";

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3eee7;padding:32px 0;font-family:Georgia,'Times New Roman',serif;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(107,79,150,0.15);">
        <tr><td style="padding:44px 40px 0;text-align:center;">
          <div style="font-family:Georgia,serif;font-style:italic;font-size:30px;color:#6b4f96;">Our registry is up</div>
        </td></tr>
        <tr><td style="padding:26px 40px 8px;text-align:center;">
          <div style="font-size:16px;color:#332c44;">Hi ${esc(name)},</div>
          <p style="font-size:16px;line-height:1.6;color:#6d6582;margin:12px 0 0;">
            Your presence really is the greatest gift &mdash; but a few people asked, so
            we&rsquo;ve put together a small list of things we&rsquo;ve had our eye on. There&rsquo;s
            also a honeymoon fund, if you&rsquo;d rather help with the trip than post a parcel.
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px 36px;text-align:center;">
          <a href="${registry}" style="display:inline-block;background:#6b4f96;color:#ffffff;text-decoration:none;font-size:16px;padding:14px 44px;border-radius:999px;">See the registry</a>
          <p style="font-size:13px;color:#9a93aa;line-height:1.6;margin-top:20px;">
            Or open: <a href="${registry}" style="color:#8a6db1;">${registry}</a>
          </p>
        </td></tr>${nudge}
      </table>
      <div style="font-family:Georgia,serif;font-style:italic;color:#9a93aa;font-size:14px;margin-top:20px;">With love, Julie &amp; Robert</div>
    </td></tr>
  </table>`;
}
