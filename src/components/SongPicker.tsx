"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { submitSongs } from "@/app/actions/songs";
import {
  byLine,
  manualTrack,
  MAX_NOTE,
  MAX_SONGS,
  MAX_TITLE,
  type Track,
} from "@/lib/songs";

export type PickedSong = Track & { note: string };

const SEARCH_DELAY_MS = 350;

const signature = (list: PickedSong[]) =>
  list.map((s) => `${s.trackId}:${s.note.trim()}`).join("|");

/**
 * Search Apple Music, preview a song, add up to five, and send them to the
 * couple.
 *
 * Search goes through this site to Apple (see api/songs/search for why it
 * can't go direct), and only the chosen ids are sent back on submit. A guest with an invite link
 * sees the list they sent before and can change it; anyone else types a name.
 *
 * Anything Apple doesn't have — a cousin's band, a hymn, a particular recording
 * — can be typed in by hand instead.
 */
export default function SongPicker({
  token,
  initial = [],
}: {
  token: string | null;
  initial?: PickedSong[];
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [picks, setPicks] = useState<PickedSong[]>(initial);
  const [saved, setSaved] = useState(signature(initial));
  const [name, setName] = useState("");
  const [playing, setPlaying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [typing, setTyping] = useState(false);
  const [typedTitle, setTypedTitle] = useState("");
  const [typedArtist, setTypedArtist] = useState("");
  const [typedError, setTypedError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const request = useRef<AbortController | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  // Stop any preview when the guest leaves the page.
  useEffect(() => () => audio.current?.pause(), []);

  function onQuery(value: string) {
    setQuery(value);
    setSearchError(null);
    if (timer.current) clearTimeout(timer.current);
    request.current?.abort();
    if (value.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(async () => {
      const controller = new AbortController();
      request.current = controller;
      try {
        const res = await fetch(`/api/songs/search?q=${encodeURIComponent(value.trim())}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const body: { tracks?: Track[] } = await res.json();
        setResults(body.tracks ?? []);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setResults([]);
        setSearchError("Search isn't answering right now — give it a moment and try again.");
      }
      setSearching(false);
    }, SEARCH_DELAY_MS);
  }

  function togglePreview(track: Track) {
    if (!track.previewUrl) return;
    if (playing === track.trackId) {
      audio.current?.pause();
      setPlaying(null);
      return;
    }
    audio.current?.pause();
    const el = new Audio(track.previewUrl);
    el.volume = 0.8;
    el.onended = () => setPlaying(null);
    audio.current = el;
    el.play().catch(() => setPlaying(null));
    setPlaying(track.trackId);
  }

  const isPicked = (id: string) => picks.some((p) => p.trackId === id);
  const full = picks.length >= MAX_SONGS;

  function add(track: Track) {
    setError(null);
    setSent(false);
    if (isPicked(track.trackId) || full) return;
    setPicks((list) => [...list, { ...track, note: "" }]);
  }

  function openTyping() {
    setTypedError(null);
    // Start from whatever they searched for, since that's usually the title.
    if (!typedTitle && query.trim()) setTypedTitle(query.trim());
    setTyping(true);
  }

  function addTyped() {
    const track = manualTrack(typedTitle, typedArtist);
    if (!track) return setTypedError("Add the song's title.");
    if (isPicked(track.trackId)) return setTypedError("That one's already on your list.");
    add(track);
    setTyping(false);
    setTypedTitle("");
    setTypedArtist("");
    setTypedError(null);
    onQuery("");
  }

  function remove(id: string) {
    setSent(false);
    setPicks((list) => list.filter((p) => p.trackId !== id));
  }

  function setNote(id: string, note: string) {
    setSent(false);
    setPicks((list) => list.map((p) => (p.trackId === id ? { ...p, note } : p)));
  }

  const unchanged = token !== null && signature(picks) === saved;

  function submit() {
    setError(null);
    if (picks.length === 0) return setError("Add at least one song first.");
    if (!token && name.trim().length < 2) {
      return setError("Please add your name so we know who asked.");
    }
    startTransition(async () => {
      const res = await submitSongs({
        token,
        name,
        picks: picks.map((p) =>
          p.manual
            ? { trackId: p.trackId, note: p.note, manual: { title: p.title, artist: p.artist } }
            : { trackId: p.trackId, note: p.note }
        ),
      });
      if (!res.ok) return setError(res.error ?? "Something went wrong — please try again.");
      setSent(true);
      setSaved(signature(picks));
      setQuery("");
      setResults([]);
      if (!token) setPicks([]);
    });
  }

  const inputCls =
    "w-full rounded-xl border border-line bg-white px-4 py-3 text-ink outline-none transition-colors focus:border-[#8a6db1]";

  return (
    <div className="rounded-[28px] border border-white/70 bg-gradient-to-b from-white/90 to-white/70 p-5 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_28px_60px_-30px_rgba(107,79,150,0.5)] backdrop-blur-md sm:p-8">
      {/* Search */}
      <label className="relative block">
        <span className="sr-only">Search for a song or artist</span>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-[#8a6db1]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={full ? `That's ${MAX_SONGS} — remove one to add another` : "Search a song or artist"}
          disabled={full}
          enterKeyHint="search"
          autoComplete="off"
          className={`${inputCls} pl-12 disabled:bg-[#faf8f4] disabled:text-ink-dim`}
        />
      </label>

      {!full && !typing && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1 text-xs text-ink-dim">
          <span>Classical? Try the composer&rsquo;s full name and the piece.</span>
          <button
            type="button"
            onClick={openTyping}
            className="cursor-pointer py-1 text-[#6b4f96] underline-offset-4 hover:underline"
          >
            Can&rsquo;t find it? Type it in
          </button>
        </div>
      )}

      {/* A song Apple doesn't have, typed in by hand */}
      <AnimatePresence initial={false}>
        {typing && !full && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3 rounded-2xl border border-[#d8cce8] bg-[#faf7fd] p-4">
              <p className="text-sm text-ink-dim">
                Not on Apple Music? Tell us what it is and we&rsquo;ll track it down.
              </p>
              <input
                value={typedTitle}
                onChange={(e) => setTypedTitle(e.target.value)}
                maxLength={MAX_TITLE}
                placeholder="Song or piece"
                aria-label="Song or piece"
                className={inputCls}
              />
              <input
                value={typedArtist}
                onChange={(e) => setTypedArtist(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTyped()}
                maxLength={MAX_TITLE}
                placeholder="Artist or composer (optional)"
                aria-label="Artist or composer"
                className={inputCls}
              />
              {typedError && <p className="text-sm text-[#a24a56]">{typedError}</p>}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={addTyped}
                  className="min-h-11 flex-1 cursor-pointer touch-manipulation rounded-full bg-[#6b4f96] px-5 text-sm text-white transition-[filter] hover:brightness-110 active:scale-[0.98]"
                >
                  Add to my songs
                </button>
                <button
                  type="button"
                  onClick={() => setTyping(false)}
                  className="min-h-11 cursor-pointer touch-manipulation rounded-full border border-line px-5 text-sm text-ink-dim transition-colors hover:bg-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      {query.trim().length >= 2 && !full && !typing && (
        <div className="mt-3">
          {searching && results.length === 0 && (
            <p className="px-1 py-3 text-sm text-ink-dim">Searching&hellip;</p>
          )}
          {searchError && <p className="px-1 py-3 text-sm text-[#a24a56]">{searchError}</p>}
          {!searching && !searchError && results.length === 0 && (
            <p className="px-1 py-3 text-sm text-ink-dim">
              Nothing found &mdash; try the artist&rsquo;s name as well, or{" "}
              <button
                type="button"
                onClick={openTyping}
                className="cursor-pointer text-[#6b4f96] underline underline-offset-4"
              >
                type it in
              </button>
              .
            </p>
          )}
          {results.length > 0 && (
            <ul aria-busy={searching}
              className={`max-h-[22rem] divide-y divide-line/60 overflow-y-auto overscroll-contain rounded-2xl border border-line bg-white transition-opacity ${
                // Results for the previous words stay up while new ones load,
                // but can't be tapped — that would add a song nobody searched for.
                searching ? "pointer-events-none opacity-50" : ""
              }`}>
              {results.map((t) => (
                <li key={t.trackId}>
                <TrackRow
                  track={t}
                  playing={playing === t.trackId}
                  onPreview={() => togglePreview(t)}
                  action={
                    isPicked(t.trackId) ? (
                      <span className="shrink-0 px-2 text-xs tracking-wider text-[#5f7554] uppercase">
                        Added ✓
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => add(t)}
                        className="min-h-10 shrink-0 cursor-pointer touch-manipulation rounded-full border border-[#c9b8e0] px-4 text-sm text-[#6b4f96] transition-colors hover:bg-[#f0eaf7] active:scale-[0.97]"
                      >
                        Add
                      </button>
                    )
                  }
                />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Picks */}
      <div className="mt-7">
        <div className="flex items-baseline justify-between px-1">
          <h3 className="text-[11px] tracking-[0.22em] text-ink-dim uppercase">Your songs</h3>
          <span className="text-xs text-ink-dim">
            {picks.length} / {MAX_SONGS}
          </span>
        </div>

        {picks.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-[#d8cce8] px-4 py-6 text-center text-sm text-ink-dim">
            Nothing yet &mdash; search above and tap <span className="text-[#6b4f96]">Add</span>.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            <AnimatePresence initial={false}>
              {picks.map((p) => (
                <motion.li
                  key={p.trackId}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden rounded-2xl border border-line bg-white"
                >
                  <TrackRow
                    track={p}
                    playing={playing === p.trackId}
                    onPreview={() => togglePreview(p)}
                    action={
                      <button
                        type="button"
                        onClick={() => remove(p.trackId)}
                        aria-label={`Remove ${p.title}`}
                        className="flex h-10 w-10 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-full text-xl text-ink-dim transition-colors hover:bg-[#f7edee] hover:text-[#a24a56]"
                      >
                        &times;
                      </button>
                    }
                  />
                  <div className="px-3 pb-3">
                    <input
                      value={p.note}
                      onChange={(e) => setNote(p.trackId, e.target.value)}
                      maxLength={MAX_NOTE}
                      placeholder="Why this one? (optional)"
                      className="w-full rounded-lg border border-line/70 bg-[#faf8f4] px-3 py-2 text-sm outline-none transition-colors focus:border-[#8a6db1] focus:bg-white"
                    />
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {!token && picks.length > 0 && (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          autoComplete="name"
          className={`${inputCls} mt-5`}
        />
      )}

      {error && <p className="mt-4 text-center text-sm text-[#a24a56]">{error}</p>}

      <AnimatePresence>
        {sent && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-5 rounded-xl border border-[#bcd0ac] bg-[#eef4e7] px-4 py-3 text-center text-sm text-[#5f7554]"
          >
            {token
              ? "Sent to Julie & Robert ♫ You can change your songs here any time."
              : "Sent to Julie & Robert ♫ Thank you! Add more any time."}
          </motion.p>
        )}
      </AnimatePresence>

      {(picks.length > 0 || !sent) && (
        <button
          type="button"
          onClick={submit}
          disabled={pending || picks.length === 0 || unchanged}
          className="mt-6 w-full cursor-pointer rounded-full bg-gradient-to-r from-[#6b4f96] to-[#8a6db1] px-8 py-3.5 text-sm font-medium tracking-wide text-white shadow-sm transition-[filter,transform,opacity] hover:brightness-110 active:scale-[0.98] disabled:cursor-default disabled:opacity-45 disabled:hover:brightness-100"
        >
          {pending
            ? "Sending…"
            : unchanged && picks.length > 0
              ? "Sent ✓"
              : token && saved
                ? "Update my songs"
                : "Send my songs"}
        </button>
      )}
    </div>
  );
}

function TrackRow({
  track,
  playing,
  onPreview,
  action,
}: {
  track: Track;
  playing: boolean;
  onPreview: () => void;
  action: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 p-3">
      <button
        type="button"
        onClick={onPreview}
        disabled={!track.previewUrl}
        aria-label={playing ? `Pause ${track.title}` : `Play a preview of ${track.title}`}
        className="group relative h-14 w-14 shrink-0 cursor-pointer touch-manipulation overflow-hidden rounded-xl bg-[#f0eaf7] disabled:cursor-default"
      >
        {track.artwork ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={track.artwork} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <span aria-hidden className="flex h-full w-full items-center justify-center text-2xl text-[#b9a9d2]">
            &#9835;
          </span>
        )}
        {track.previewUrl && (
          <span
            className={`absolute inset-0 flex items-center justify-center bg-[#332c44]/35 text-white transition-opacity ${
              playing ? "opacity-100" : "opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 [@media(hover:none)]:bg-[#332c44]/20"
            }`}
          >
            {playing ? (
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
                <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
              </svg>
            )}
          </span>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="line-clamp-3 font-medium leading-snug text-ink">{track.title}</span>
          {track.explicit && (
            <span
              title="Explicit"
              className="shrink-0 rounded border border-line px-1 text-[10px] leading-4 text-ink-dim"
            >
              E
            </span>
          )}
        </div>
        <div className="truncate text-sm text-ink-dim">
          {track.manual ? [track.artist, "typed in"].filter(Boolean).join(" · ") : byLine(track)}
        </div>
      </div>

      {action}
    </div>
  );
}
