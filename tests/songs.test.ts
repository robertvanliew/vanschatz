import { describe, expect, test } from "vitest";
import {
  byLine,
  cleanPicks,
  composerFrom,
  manualTrack,
  djList,
  largerArtwork,
  lookupUrl,
  MAX_NOTE,
  MAX_SONGS,
  rankSongs,
  searchUrl,
  songRequestEmail,
  toTrack,
  tracksFrom,
  type SongRow,
} from "@/lib/songs";

// Trimmed from a real iTunes Search API response.
const september = {
  wrapperType: "track",
  kind: "song",
  trackId: 1456623340,
  artistName: "Earth, Wind & Fire",
  collectionName: "The Best Of Earth, Wind & Fire Vol. 1",
  trackName: "September",
  trackViewUrl: "https://music.apple.com/us/album/september/1456623332?i=1456623340&uo=4",
  previewUrl: "https://audio-ssl.itunes.apple.com/preview.m4a",
  artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/Music/v4/ab/cd/source/100x100bb.jpg",
  trackExplicitness: "notExplicit",
  primaryGenreName: "R&B/Soul",
};

describe("toTrack", () => {
  test("reads a song", () => {
    expect(toTrack(september)).toEqual({
      trackId: "1456623340",
      title: "September",
      artist: "Earth, Wind & Fire",
      composer: null,
      album: "The Best Of Earth, Wind & Fire Vol. 1",
      artwork: "https://is1-ssl.mzstatic.com/image/thumb/Music/v4/ab/cd/source/300x300bb.jpg",
      previewUrl: "https://audio-ssl.itunes.apple.com/preview.m4a",
      appleUrl: "https://music.apple.com/us/album/september/1456623332?i=1456623340",
      explicit: false,
      manual: false,
    });
  });

  test("a classical recording names its composer", () => {
    const berlioz = toTrack({
      ...september,
      trackName: "Symphonie fantastique, Op. 14, H 48: II. Un Bal",
      artistName: "London Symphony Orchestra & Sir Colin Davis",
      collectionName: "Berlioz: Symphonie fantastique",
      primaryGenreName: "Classical",
    });
    expect(berlioz?.composer).toBe("Berlioz");
    expect(byLine(berlioz!)).toBe("Berlioz · London Symphony Orchestra & Sir Colin Davis");
  });

  test("flags explicit songs", () => {
    expect(toTrack({ ...september, trackExplicitness: "explicit" })?.explicit).toBe(true);
  });

  test("a song without a preview is still a song", () => {
    expect(toTrack({ ...september, previewUrl: undefined })?.previewUrl).toBeNull();
  });

  test("ignores music videos, albums and junk", () => {
    expect(toTrack({ ...september, kind: "music-video" })).toBeNull();
    expect(toTrack({ ...september, wrapperType: "collection" })).toBeNull();
    expect(toTrack({ ...september, trackName: "" })).toBeNull();
    expect(toTrack(null)).toBeNull();
    expect(toTrack("September")).toBeNull();
  });
});

// Album titles as Apple returns them, from real searches.
describe("composerFrom", () => {
  test("reads the composer before the colon on classical albums", () => {
    expect(composerFrom("Berlioz: Symphonie fantastique", "Classical", "LSO")).toBe("Berlioz");
    expect(composerFrom("Bach, J.S.: Orchestral Suites", "Classical", "Academy")).toBe("Bach, J.S.");
  });
  test("ignores series and compilations", () => {
    expect(
      composerFrom("Classical Music Library: The Essential Classics", "Classical", "NSO")
    ).toBeNull();
    expect(composerFrom("Sommernachtskonzert 2025 / Summer Night Concert", "Classical", "VPO")).toBeNull();
  });
  test("no guess when the album names two composers", () => {
    expect(
      composerFrom("Debussy: Three Nocturnes – Berlioz: Symphonie Fantastique (Live)", "Classical", "VPO")
    ).toBeNull();
  });
  test("only classical — a musical's album title is not a composer", () => {
    expect(composerFrom("Hamilton: An American Musical", "Soundtrack", "Cast")).toBeNull();
  });
  test("not when the artist already names them", () => {
    expect(composerFrom("Pachelbel: Canon", "Classical", "Johann Pachelbel & Orchestra")).toBeNull();
  });
});

describe("manualTrack", () => {
  test("a typed-in song has no Apple link", () => {
    const t = manualTrack("  Our   Song ", " Cousin Dave's Band ");
    expect(t).toMatchObject({
      title: "Our Song",
      artist: "Cousin Dave's Band",
      appleUrl: null,
      manual: true,
    });
    expect(byLine(t!)).toBe("Cousin Dave's Band");
  });
  test("the same words from two guests count as one song", () => {
    expect(manualTrack("Our Song", "Dave")?.trackId).toBe(manualTrack("our song!", " dave")?.trackId);
  });
  test("needs a title; the artist is optional", () => {
    expect(manualTrack("", "Dave")).toBeNull();
    expect(manualTrack("Hallelujah", "")?.artist).toBe("");
  });
});

describe("tracksFrom", () => {
  test("drops duplicates and non-songs", () => {
    const body = { results: [september, september, { wrapperType: "artist" }] };
    expect(tracksFrom(body)).toHaveLength(1);
  });
  test("the same song on another album is listed once", () => {
    const compilation = { ...september, trackId: 999, collectionName: "Disco Hits" };
    const live = { ...september, trackId: 998, trackName: "September (Live)" };
    expect(tracksFrom({ results: [september, compilation, live] }).map((t) => t.trackId)).toEqual([
      "1456623340",
      "998",
    ]);
  });
  test("survives a malformed body", () => {
    expect(tracksFrom(undefined)).toEqual([]);
    expect(tracksFrom({ results: "nope" })).toEqual([]);
  });
});

describe("urls", () => {
  test("search asks for US songs only", () => {
    const url = new URL(searchUrl("  september  "));
    expect(url.origin).toBe("https://itunes.apple.com");
    expect(url.searchParams.get("term")).toBe("september");
    expect(url.searchParams.get("entity")).toBe("song");
    expect(url.searchParams.get("country")).toBe("US");
  });
  test("lookup takes several ids in one call", () => {
    expect(new URL(lookupUrl(["1", "2"])).searchParams.get("id")).toBe("1,2");
  });
  test("artwork can be resized", () => {
    expect(largerArtwork("https://x/a/60x60bb.jpg", 600)).toBe("https://x/a/600x600bb.jpg");
    expect(largerArtwork(null)).toBeNull();
  });
});

describe("cleanPicks", () => {
  test("keeps ids and trims notes", () => {
    expect(cleanPicks([{ trackId: "123", note: "  our song " }])).toEqual({
      ok: true,
      picks: [{ trackId: "123", note: "our song" }],
    });
  });
  test("drops a song added twice", () => {
    const res = cleanPicks([{ trackId: "1" }, { trackId: "1" }]);
    expect(res.ok && res.picks).toEqual([{ trackId: "1", note: "" }]);
  });
  test("caps long notes", () => {
    const res = cleanPicks([{ trackId: "1", note: "x".repeat(500) }]);
    expect(res.ok && res.picks[0].note.length).toBe(MAX_NOTE);
  });
  test("accepts a typed-in song and rebuilds its id from the words", () => {
    const res = cleanPicks([
      { trackId: "manual:anything", note: "", manual: { title: "Our Song", artist: "Dave" } },
    ]);
    expect(res.ok && res.picks).toEqual([
      {
        trackId: manualTrack("Our Song", "Dave")!.trackId,
        note: "",
        manual: { title: "Our Song", artist: "Dave" },
      },
    ]);
  });
  test("a typed-in song needs a title", () => {
    expect(cleanPicks([{ trackId: "x", manual: { title: " ", artist: "Dave" } }]).ok).toBe(false);
  });
  test("refuses nothing, too many, or a bad id", () => {
    expect(cleanPicks([]).ok).toBe(false);
    expect(cleanPicks("1,2").ok).toBe(false);
    const many = Array.from({ length: MAX_SONGS + 1 }, (_, i) => ({ trackId: String(i + 1) }));
    expect(cleanPicks(many).ok).toBe(false);
    expect(cleanPicks([{ trackId: "abc" }]).ok).toBe(false);
    expect(cleanPicks([{ trackId: "<script>" }]).ok).toBe(false);
  });
});

const row = (
  trackId: string,
  requester: string,
  minute: number,
  extra: Partial<SongRow> = {}
): SongRow => ({
  trackId,
  title: `Song ${trackId}`,
  artist: "Artist",
  composer: null,
  manual: false,
  artwork: null,
  appleUrl: `https://music.apple.com/${trackId}`,
  explicit: false,
  note: null,
  requester,
  createdAt: new Date(2026, 9, 7, 12, minute),
  ...extra,
});

describe("rankSongs", () => {
  test("most requested first, ties by who asked first", () => {
    const ranked = rankSongs([
      row("a", "Ann", 1),
      row("b", "Ben", 2),
      row("c", "Cat", 3),
      row("b", "Dan", 4, { note: "classic" }),
    ]);
    expect(ranked.map((s) => s.trackId)).toEqual(["b", "a", "c"]);
    expect(ranked[0].requests).toEqual([
      { requester: "Ben", note: null },
      { requester: "Dan", note: "classic" },
    ]);
  });
});

describe("djList", () => {
  test("numbers songs and flags explicit ones", () => {
    const text = djList(
      rankSongs([row("a", "Ann", 1), row("a", "Ben", 2), row("b", "Cat", 3, { explicit: true })])
    );
    expect(text).toBe(
      "1. Song a — Artist [2 requests]\n2. Song b — Artist [explicit — clean version please]"
    );
  });
  test("names the composer, and flags songs typed in by hand", () => {
    const text = djList(
      rankSongs([
        row("a", "Ann", 1, { title: "Un Bal", composer: "Berlioz", artist: "LSO" }),
        row("manual:b", "Ben", 2, { title: "Our Song", artist: "", manual: true, appleUrl: null }),
      ])
    );
    expect(text).toBe("1. Un Bal — Berlioz (LSO)\n2. Our Song [typed in by a guest]");
  });
});

describe("songRequestEmail", () => {
  const track = toTrack(september)!;

  test("names the guest and the songs", () => {
    const email = songRequestEmail({
      requester: "Aunt May",
      songs: [{ ...track, note: "dance with me" }],
      updated: false,
      adminUrl: "https://thevanschatz.com/admin",
    });
    expect(email.subject).toBe("Song picks from Aunt May (1)");
    expect(email.text).toContain("1. September — Earth, Wind & Fire");
    expect(email.text).toContain('"dance with me"');
    expect(email.html).toContain("Earth, Wind &amp; Fire");
  });

  test("says when it replaces an earlier list", () => {
    const email = songRequestEmail({
      requester: "May",
      songs: [{ ...track, note: "" }],
      updated: true,
      adminUrl: "x",
    });
    expect(email.subject.startsWith("Updated song picks")).toBe(true);
  });

  test("a typed-in song has no link and says so", () => {
    const email = songRequestEmail({
      requester: "May",
      songs: [{ ...manualTrack("Our Song", "Dave")!, note: "" }],
      updated: false,
      adminUrl: "x",
    });
    expect(email.text).toContain("(typed in — not on Apple Music)");
    expect(email.html).not.toContain('href="null"');
    expect(email.html).toContain("typed in");
  });

  test("a guest's name and note can't inject markup", () => {
    const email = songRequestEmail({
      requester: "<b>May</b>",
      songs: [{ ...track, note: '<img src=x onerror="alert(1)">' }],
      updated: false,
      adminUrl: "x",
    });
    expect(email.html).not.toContain("<b>May");
    expect(email.html).not.toContain("<img src=x");
  });
});
