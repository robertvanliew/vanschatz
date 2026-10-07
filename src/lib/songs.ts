/**
 * Guest song requests, searched from Apple's free iTunes Search API.
 *
 * Search runs in each guest's own browser (Apple allows it from any origin), so
 * Apple's limit of roughly 20 searches a minute applies per guest rather than to
 * this site as a whole. Submitting is different: the server looks every chosen
 * song up again by its id and stores Apple's details, never the browser's, so
 * the list the couple receives can't be filled with made-up titles.
 *
 * Everything here is pure and safe to import from client components.
 */

export const MAX_SONGS = 5;
export const MAX_NOTE = 140;

export type Track = {
  trackId: string;
  title: string;
  artist: string;
  album: string | null;
  artwork: string | null;
  /** A 30-second clip from Apple. Not every song has one. */
  previewUrl: string | null;
  appleUrl: string;
  explicit: boolean;
};

export type Pick = { trackId: string; note: string };

const ITUNES = "https://itunes.apple.com";

export function searchUrl(term: string): string {
  const params = new URLSearchParams({
    term: term.trim(),
    media: "music",
    entity: "song",
    limit: "12",
    country: "US",
  });
  return `${ITUNES}/search?${params}`;
}

export function lookupUrl(trackIds: string[]): string {
  const params = new URLSearchParams({ id: trackIds.join(","), entity: "song", country: "US" });
  return `${ITUNES}/lookup?${params}`;
}

/** Apple serves artwork at any size by rewriting the dimensions in the URL. */
export function largerArtwork(url: string | null | undefined, size = 300): string | null {
  if (!url) return null;
  return url.replace(/\/\d+x\d+(bb)?\.(jpg|png|webp)$/i, `/${size}x${size}bb.$2`);
}

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : null;

/** One result from Apple, or null for anything that isn't a playable song. */
export function toTrack(raw: unknown): Track | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (r.wrapperType !== "track" || r.kind !== "song") return null;
  const id = typeof r.trackId === "number" ? String(r.trackId) : str(r.trackId);
  const title = str(r.trackName);
  const artist = str(r.artistName);
  const appleUrl = str(r.trackViewUrl);
  if (!id || !/^\d+$/.test(id) || !title || !artist || !appleUrl) return null;
  return {
    trackId: id,
    title,
    artist,
    album: str(r.collectionName),
    artwork: largerArtwork(str(r.artworkUrl100)),
    previewUrl: str(r.previewUrl),
    // Drop Apple's affiliate tag; it means nothing to a DJ.
    appleUrl: appleUrl.replace(/[?&]uo=\d+$/, ""),
    explicit: r.trackExplicitness === "explicit",
  };
}

/**
 * Songs from a search or lookup response, without duplicates.
 *
 * Apple lists a song once per album it appears on — "September" by Earth, Wind
 * & Fire comes back three times from three compilations. Guests are choosing a
 * song, not a pressing, so only the first of each title and artist is kept.
 * Live versions and remixes have different titles and stay.
 */
export function tracksFrom(body: unknown): Track[] {
  const results =
    typeof body === "object" && body !== null && Array.isArray((body as { results?: unknown }).results)
      ? (body as { results: unknown[] }).results
      : [];
  const seen = new Set<string>();
  const out: Track[] = [];
  for (const raw of results) {
    const t = toTrack(raw);
    if (!t) continue;
    const key = `${t.title}|${t.artist}`.toLowerCase();
    if (seen.has(t.trackId) || seen.has(key)) continue;
    seen.add(t.trackId);
    seen.add(key);
    out.push(t);
  }
  return out;
}

/**
 * The picks a guest submitted, checked. Duplicates are dropped rather than
 * refused — tapping "add" twice isn't a mistake worth an error message.
 */
export function cleanPicks(
  raw: unknown
): { ok: true; picks: Pick[] } | { ok: false; error: string } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, error: "Add at least one song first." };
  }
  const picks: Pick[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const r = (typeof item === "object" && item !== null ? item : {}) as Record<string, unknown>;
    const id = typeof r.trackId === "string" ? r.trackId.trim() : "";
    if (!/^\d{1,15}$/.test(id)) return { ok: false, error: "One of those songs isn't valid." };
    if (seen.has(id)) continue;
    seen.add(id);
    const note = typeof r.note === "string" ? r.note.trim().slice(0, MAX_NOTE) : "";
    picks.push({ trackId: id, note });
  }
  if (picks.length > MAX_SONGS) {
    return { ok: false, error: `Up to ${MAX_SONGS} songs each, please.` };
  }
  return { ok: true, picks };
}

/* ------------------------------------------------------------------ ranking */

export type SongRow = {
  trackId: string;
  title: string;
  artist: string;
  artwork: string | null;
  appleUrl: string;
  explicit: boolean;
  note: string | null;
  requester: string;
  createdAt: Date;
};

export type RankedSong = {
  trackId: string;
  title: string;
  artist: string;
  artwork: string | null;
  appleUrl: string;
  explicit: boolean;
  requests: { requester: string; note: string | null }[];
};

/**
 * Every requested song once, most-requested first. Ties go to whichever was
 * asked for first, so the order doesn't shuffle each time the page loads.
 */
export function rankSongs(rows: SongRow[]): RankedSong[] {
  const byId = new Map<string, RankedSong & { first: number }>();
  for (const row of [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    let song = byId.get(row.trackId);
    if (!song) {
      song = {
        trackId: row.trackId,
        title: row.title,
        artist: row.artist,
        artwork: row.artwork,
        appleUrl: row.appleUrl,
        explicit: row.explicit,
        requests: [],
        first: row.createdAt.getTime(),
      };
      byId.set(row.trackId, song);
    }
    song.requests.push({ requester: row.requester, note: row.note });
  }
  return [...byId.values()]
    .sort((a, b) => b.requests.length - a.requests.length || a.first - b.first)
    .map((song) => ({
      trackId: song.trackId,
      title: song.title,
      artist: song.artist,
      artwork: song.artwork,
      appleUrl: song.appleUrl,
      explicit: song.explicit,
      requests: song.requests,
    }));
}

/** Plain text to paste into a message to the DJ. */
export function djList(songs: RankedSong[]): string {
  return songs
    .map((s, i) => {
      const extras = [
        s.requests.length > 1 ? `${s.requests.length} requests` : null,
        s.explicit ? "explicit — clean version please" : null,
      ].filter(Boolean);
      return `${i + 1}. ${s.title} — ${s.artist}${extras.length ? ` (${extras.join(", ")})` : ""}`;
    })
    .join("\n");
}

/* -------------------------------------------------------------------- email */

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** The email the couple gets each time someone sends their songs. */
export function songRequestEmail({
  requester,
  songs,
  updated,
  adminUrl,
}: {
  requester: string;
  songs: (Track & { note: string })[];
  /** True when this replaces a list the same guest sent before. */
  updated: boolean;
  adminUrl: string;
}): { subject: string; text: string; html: string } {
  const subject = `${updated ? "Updated song picks" : "Song picks"} from ${requester} (${songs.length})`;
  const intro = updated
    ? `${requester} changed their song picks. This is their list now:`
    : `${requester} would love to hear:`;

  const text = [
    intro,
    "",
    ...songs.map(
      (s, i) =>
        `${i + 1}. ${s.title} — ${s.artist}${s.explicit ? " [explicit]" : ""}` +
        `${s.note ? `\n   "${s.note}"` : ""}\n   ${s.appleUrl}`
    ),
    "",
    `Every request, ranked: ${adminUrl}`,
  ].join("\n");

  const rows = songs
    .map(
      (s) => `
        <tr><td style="padding:10px 0;border-top:1px solid #eee6f3;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td width="64" valign="top">${
              s.artwork
                ? `<img src="${esc(s.artwork)}" width="56" height="56" alt="" style="display:block;border-radius:10px;border:0;"/>`
                : ""
            }</td>
            <td valign="top" style="padding-left:12px;">
              <a href="${esc(s.appleUrl)}" style="font-size:16px;color:#332c44;text-decoration:none;font-weight:bold;">${esc(s.title)}</a>${
                s.explicit
                  ? ` <span style="font-size:10px;color:#9a93aa;border:1px solid #d8d0e4;border-radius:4px;padding:0 4px;">E</span>`
                  : ""
              }
              <div style="font-size:14px;color:#6d6582;">${esc(s.artist)}</div>
              ${s.note ? `<div style="font-size:14px;color:#8a6db1;font-style:italic;margin-top:4px;">&ldquo;${esc(s.note)}&rdquo;</div>` : ""}
            </td>
          </tr></table>
        </td></tr>`
    )
    .join("");

  const html = `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3eee7;padding:32px 0;font-family:Georgia,'Times New Roman',serif;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:20px;padding:32px 36px;">
        <tr><td style="font-size:22px;font-style:italic;color:#332c44;padding-bottom:6px;">&#9835; ${updated ? "Updated song picks" : "New song picks"}</td></tr>
        <tr><td style="font-size:15px;color:#6d6582;padding-bottom:14px;">${esc(intro)}</td></tr>
        ${rows}
        <tr><td style="padding-top:22px;text-align:center;">
          <a href="${esc(adminUrl)}" style="display:inline-block;background:#6b4f96;color:#ffffff;text-decoration:none;font-size:14px;padding:12px 30px;border-radius:999px;">See every request, ranked</a>
        </td></tr>
      </table>
    </td></tr>
  </table>`;

  return { subject, text, html };
}
