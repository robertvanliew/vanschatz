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
  body: string,
  subject = "A note from Julie & Robert"
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
        from: process.env.EMAIL_FROM ?? "Julie & Robert <rsvp@thevanschatz.com>",
        to: [to],
        subject,
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
