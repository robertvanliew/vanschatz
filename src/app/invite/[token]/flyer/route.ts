import { renderFlyer } from "@/lib/flyer";

export const runtime = "nodejs";

/**
 * GET /invite/<token>/flyer — the wedding flyer as a JPEG, with a QR that points
 * at this guest's personal RSVP page. Embedded in invite/reminder emails.
 *
 * If rendering fails, this falls back to the static poster rather than erroring.
 * A 500 here shows every recipient a broken image in their invitation, which is
 * far worse than a flyer whose QR points at the site root instead of at their
 * personal page. The reason is put in a response header so the failure can be
 * diagnosed from outside without reading the hosting platform's logs.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
): Promise<Response> {
  const { token } = await params;
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://thevanschatz.com";

  try {
    const jpeg = await renderFlyer(`${base}/invite/${encodeURIComponent(token)}`);
    return new Response(new Uint8Array(jpeg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    const reason = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    console.error("[flyer] render failed:", reason, err);

    return new Response(null, {
      status: 302,
      headers: {
        Location: `${base}/invite-poster.jpg`,
        // Short cache: a transient failure should not be remembered for a day.
        "Cache-Control": "public, max-age=300",
        "X-Flyer-Fallback": reason.slice(0, 300).replace(/[\r\n]+/g, " "),
      },
    });
  }
}
