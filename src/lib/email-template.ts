/**
 * Shared HTML for wedding emails. Embeds this guest's personal flyer (whose QR
 * points at their own RSVP page) followed by a short greeting and a big RSVP
 * button. Used by both invites and reminders.
 */

import { WEDDING } from "@/lib/wedding";

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
        <tr><td style="padding:24px 40px 20px;text-align:center;">
          <a href="${url}" style="display:inline-block;background:#6b4f96;color:#ffffff;text-decoration:none;font-size:16px;padding:14px 44px;border-radius:999px;">RSVP here</a>
          <p style="font-size:13px;color:#9a93aa;line-height:1.6;margin-top:20px;">Let us know if you can make it, and how many adults &amp; children.<br/>Or scan the flyer above, or open: <a href="${url}" style="color:#8a6db1;">${url}</a></p>
        </td></tr>
        <tr><td style="padding:0 40px 44px;text-align:center;">
          <div style="height:1px;width:100px;background:#e4dccd;margin:0 auto 18px;"></div>
          <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#8f6f3a;">After the Reception</div>
          <p style="font-size:14px;line-height:1.6;color:#6d6582;margin:10px 0 0;">You&rsquo;re warmly welcome to keep the celebration going at ${esc(WEDDING.afterParty.host)} &mdash; ${esc(WEDDING.afterParty.address)} &middot; ${esc(WEDDING.afterParty.phone)}.</p>
        </td></tr>
      </table>
      <div style="font-family:Georgia,serif;font-style:italic;color:#9a93aa;font-size:14px;margin-top:20px;">With love, Julie &amp; Robert</div>
    </td></tr>
  </table>`;
}
