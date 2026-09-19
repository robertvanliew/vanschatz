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

/**
 * How long to wait before retrying a refused send, or null to give up.
 *
 * Resend allows 10 requests a second. A bulk send once went out at about 12 a
 * second, and in each second the 11th, 12th and 13th emails were refused with
 * 429 and silently counted as failures: 6 of 26 guests missed the wedding
 * update. So "too many requests" and brief server errors are retried, waiting
 * as long as the provider asks; anything else (a bad address, a bad key) is a
 * real failure and fails straight away.
 */
export function retryDelayMs(
  status: number,
  retryAfter: string | null,
  attempt: number,
  maxAttempts = 4
): number | null {
  if (attempt >= maxAttempts) return null;
  if (status !== 429 && status < 500) return null;
  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds > 0) return Math.min(seconds * 1000, 10_000);
  return 1000 * 2 ** (attempt - 1); // 1s, 2s, 4s
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function sendMessage(
  channel: Channel,
  to: string,
  body: string,
  subject = "A note from Julie & Robert",
  html?: string
): Promise<{ simulated: boolean }> {
  if (isPracticeMode(channel)) {
    console.log(`[practice ${channel}] to=${to}: ${body}`);
    return { simulated: true };
  }
  if (channel === "email") {
    const payload = JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Julie & Robert <rsvp@thevanschatz.com>",
      to: [to],
      subject,
      text: body, // plain-text fallback
      html: html ?? `<p>${body}</p>`,
    });
    for (let attempt = 1; ; attempt++) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: payload,
      });
      if (res.ok) return { simulated: false };
      const wait = retryDelayMs(res.status, res.headers.get("retry-after"), attempt);
      if (wait === null) throw new Error(`Resend failed: ${res.status}`);
      await sleep(wait);
    }
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
