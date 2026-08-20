export const runtime = "nodejs";

/**
 * GET /invite/<token>/flyer — the wedding flyer as a JPEG, with a QR that points
 * at this guest's personal RSVP page. Embedded in invite/reminder emails.
 *
 * The flyer renderer is imported *inside* the handler, not at module scope.
 * It depends on sharp, a native module, and when sharp fails to load on the
 * hosting platform a top-level import takes the whole route module down before
 * any handler code runs — which is exactly what happened here: the route
 * returned 500 with no error of ours anywhere, because our try/catch had never
 * executed. Importing lazily turns that into a catchable error.
 *
 * On any failure this falls back to the static poster. A guest seeing a flyer
 * whose QR points at the site root is vastly better than a broken image in
 * their wedding invitation, and the invite email carries their personal link as
 * a button regardless.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
): Promise<Response> {
  const { token } = await params;
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://thevanschatz.com";

  try {
    const { renderFlyer } = await import("@/lib/flyer");
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
