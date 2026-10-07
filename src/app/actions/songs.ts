"use server";

import { db } from "@/lib/db";
import { sendMessage } from "@/lib/messaging";
import {
  cleanPicks,
  lookupUrl,
  manualTrack,
  songRequestEmail,
  toTrack,
  type Pick,
  type Track,
} from "@/lib/songs";
import { revalidatePath } from "next/cache";

const COUPLE_EMAIL = process.env.COUPLE_EMAIL ?? "robvanliew@gmail.com";

export type SongResult = { ok: boolean; error?: string };

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? "https://thevanschatz.com";
}

/**
 * Save a guest's song picks and email them to the couple.
 *
 * With an invite token the guest has a single list, and sending again replaces
 * it — they can change their minds right up to the day. Without one, a typed
 * name is required and each submission adds to the list.
 *
 * Songs are looked up again at Apple by id rather than trusting the titles the
 * browser sent. Songs typed in by hand are the exception: they aren't on Apple
 * Music, so the guest's words are all there is.
 */
export async function submitSongs(input: {
  token: string | null;
  name: string;
  picks: Pick[];
}): Promise<SongResult> {
  const cleaned = cleanPicks(input.picks);
  if (!cleaned.ok) return { ok: false, error: cleaned.error };
  const { picks } = cleaned;

  let guest: { id: string; name: string } | null = null;
  let givenName: string | null = null;
  if (input.token) {
    guest = await db.guest.findUnique({
      where: { token: input.token },
      select: { id: true, name: true },
    });
    if (!guest) return { ok: false, error: "We couldn't find your invitation." };
  } else {
    const name = (input.name ?? "").trim().slice(0, 80);
    if (name.length < 2) return { ok: false, error: "Please add your name so we know who asked." };
    givenName = name;
  }

  // Typed-in songs have nothing to look up; Apple is only asked about the rest.
  const appleIds = picks.filter((p) => !p.manual).map((p) => p.trackId);
  let tracks: Track[] = [];
  if (appleIds.length > 0) {
    try {
      const res = await fetch(lookupUrl(appleIds), { cache: "no-store" });
      if (!res.ok) throw new Error(`iTunes lookup ${res.status}`);
      const body: unknown = await res.json();
      // Not tracksFrom: its title-and-artist de-duplication is for search
      // results, and must not drop a song the guest actually chose.
      const results = (body as { results?: unknown[] })?.results ?? [];
      tracks = results.flatMap((raw) => toTrack(raw) ?? []);
    } catch (e) {
      console.error("song lookup failed:", e);
      return { ok: false, error: "We couldn't reach Apple Music just now — please try again." };
    }
  }
  const byId = new Map(tracks.map((t) => [t.trackId, t]));
  const songs = picks.flatMap((p) => {
    const t = p.manual ? manualTrack(p.manual.title, p.manual.artist) : byId.get(p.trackId);
    return t ? [{ ...t, note: p.note }] : [];
  });
  if (songs.length !== picks.length) {
    return { ok: false, error: "One of those songs couldn't be found — remove it and try again." };
  }

  const data = songs.map((s) => ({
    guestId: guest?.id ?? null,
    givenName,
    trackId: s.trackId,
    title: s.title,
    artist: s.artist,
    composer: s.composer,
    artwork: s.artwork,
    previewUrl: s.previewUrl,
    appleUrl: s.appleUrl,
    explicit: s.explicit,
    manual: s.manual,
    note: s.note || null,
  }));

  let updated = false;
  if (guest) {
    const guestId = guest.id;
    const [removed] = await db.$transaction([
      db.songRequest.deleteMany({ where: { guestId } }),
      db.songRequest.createMany({ data }),
    ]);
    updated = removed.count > 0;
  } else {
    await db.songRequest.createMany({ data });
  }

  const email = songRequestEmail({
    requester: guest?.name ?? givenName!,
    songs,
    updated,
    adminUrl: `${baseUrl()}/admin#songs`,
  });
  try {
    await sendMessage("email", COUPLE_EMAIL, email.text, email.subject, email.html);
  } catch (e) {
    // The picks are saved and on the admin page; a lost notification isn't
    // something the guest should be asked to fix.
    console.error("song request email failed:", e);
  }

  revalidatePath("/admin");
  if (input.token) revalidatePath(`/invite/${input.token}`);
  return { ok: true };
}
