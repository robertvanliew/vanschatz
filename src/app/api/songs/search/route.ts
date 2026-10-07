import { NextRequest, NextResponse } from "next/server";
import { searchUrl, tracksFrom } from "@/lib/songs";

const DAY = 86_400;

/**
 * Song search, passed through to Apple's iTunes Search API.
 *
 * This can't run in the guest's browser. When the request comes from an
 * iPhone, Apple answers with a redirect to its Music app (musics://...) instead
 * of results, which Safari refuses, so every iPhone search failed. From the
 * server Apple answers normally.
 *
 * Every guest's search now comes from this site, so it is cached for a day per
 * search term, here and at Vercel's edge, to stay well under Apple's limit of
 * roughly 20 searches a minute.
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  if (q.length < 2 || q.length > 100) {
    return NextResponse.json({ error: "Search for 2 to 100 characters." }, { status: 400 });
  }

  try {
    const res = await fetch(searchUrl(q), { next: { revalidate: DAY } });
    if (!res.ok) throw new Error(`iTunes search ${res.status}`);
    const tracks = tracksFrom(await res.json());
    return NextResponse.json(
      { tracks },
      { headers: { "Cache-Control": `public, s-maxage=${DAY}, stale-while-revalidate=${DAY}` } }
    );
  } catch (e) {
    console.error("song search failed:", e);
    return NextResponse.json({ error: "Search isn't answering." }, { status: 502 });
  }
}
