import { renderFlyer } from "@/lib/flyer";

export const runtime = "nodejs";

/**
 * GET /invite/<token>/flyer — the wedding flyer as a JPEG, with a QR that points
 * at this guest's personal RSVP page. Embedded in invite/reminder emails.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
): Promise<Response> {
  const { token } = await params;
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://thevanschatz.com";
  const jpeg = await renderFlyer(`${base}/invite/${encodeURIComponent(token)}`);
  return new Response(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
