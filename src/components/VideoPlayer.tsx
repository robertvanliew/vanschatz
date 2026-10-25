"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The wedding film through YouTube's player, dressed as the site's own.
 *
 * WIZTV's export has black bars baked into the picture (a 1.89:1 film in a
 * 16:9 frame), so the frame is cropped to the picture: the player is drawn a
 * little taller than its box and the bars fall outside it. YouTube's own
 * controls would sit in that cut-off strip, so they're turned off and the
 * site draws its own: play/pause, timeline, sound and full screen.
 *
 * YouTube's logo and title can't be removed while the film plays through
 * YouTube, and covering them breaks its embedding terms; they're simply not
 * invited to appear (no YouTube controls, no hover bar).
 *
 * iPhones only start a video from a tap on the player itself. If the film
 * hasn't started a moment after "Play", the player is left uncovered so that
 * tap reaches it; once it's playing, the site's controls take over.
 */

/** Picture size inside WIZTV's 1280×720 frame (22px of black above and below). */
const PICTURE = { width: 1280, height: 676, frameHeight: 720 };
const OVERSIZE = PICTURE.frameHeight / PICTURE.height; // 1.065: how much taller the player is drawn
const HIDE_AFTER_MS = 2600;

type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  destroy(): void;
};
type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      host?: string;
      videoId: string;
      width?: string;
      height?: string;
      playerVars?: Record<string, number | string>;
      events?: { onReady?: () => void; onStateChange?: (e: { data: number }) => void };
    }
  ) => YTPlayer;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
};
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;
function loadYouTubeApi(): Promise<YTNamespace> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    if (window.YT?.Player) return resolve(window.YT);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT!);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.head.appendChild(script);
  });
  return apiPromise;
}

const PLAYING = 1;
const PAUSED = 2;
const ENDED = 0;

function clock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

export default function VideoPlayer({
  youtubeId,
  title,
  poster,
}: {
  youtubeId: string;
  title: string;
  poster: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [started, setStarted] = useState(false); // poster pressed
  const [everPlayed, setEverPlayed] = useState(false); // film has actually begun
  const [needsDirectTap, setNeedsDirectTap] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === boxRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Keep the timeline moving while the film plays.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const p = playerRef.current;
      if (p) setTime(p.getCurrentTime());
    }, 250);
    return () => clearInterval(id);
  }, [playing]);

  useEffect(() => () => playerRef.current?.destroy(), []);

  const nudgeControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsVisible(false), HIDE_AFTER_MS);
  }, []);

  async function start() {
    setStarted(true);
    setCanFullscreen(Boolean(document.fullscreenEnabled));
    const YT = await loadYouTubeApi();
    if (!mountRef.current || playerRef.current) return;
    playerRef.current = new YT.Player(mountRef.current, {
      host: "https://www.youtube-nocookie.com",
      videoId: youtubeId,
      width: "100%",
      height: "100%",
      playerVars: {
        autoplay: 1,
        controls: 0,
        rel: 0,
        playsinline: 1,
        modestbranding: 1,
        iv_load_policy: 3,
        fs: 0,
        disablekb: 1,
      },
      events: {
        onReady: () => {
          const p = playerRef.current!;
          setDuration(p.getDuration());
          p.playVideo();
          // Blocked autoplay (iPhones): let the next tap land on the player itself.
          setTimeout(() => {
            if (playerRef.current && playerRef.current.getPlayerState() !== PLAYING) setNeedsDirectTap(true);
          }, 1500);
        },
        onStateChange: (e) => {
          const p = playerRef.current;
          if (e.data === PLAYING) {
            setPlaying(true);
            setEverPlayed(true);
            setNeedsDirectTap(false);
            if (p) setDuration(p.getDuration());
            nudgeControls();
          } else if (e.data === PAUSED || e.data === ENDED) {
            setPlaying(false);
            setControlsVisible(true);
            if (e.data === ENDED && p) setTime(p.getDuration());
          }
        },
      },
    });
  }

  function togglePlay() {
    const p = playerRef.current;
    if (!p) return;
    if (playing) p.pauseVideo();
    else {
      if (duration && time >= duration - 0.5) p.seekTo(0, true);
      p.playVideo();
    }
    nudgeControls();
  }

  function seek(seconds: number) {
    playerRef.current?.seekTo(seconds, true);
    setTime(seconds);
    nudgeControls();
  }

  function toggleMute() {
    const p = playerRef.current;
    if (!p) return;
    if (p.isMuted()) p.unMute();
    else p.mute();
    setMuted(!p.isMuted());
    nudgeControls();
  }

  function toggleFullscreen() {
    const box = boxRef.current;
    if (!box) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else box.requestFullscreen().catch(() => {});
  }

  const showControls = everPlayed && (controlsVisible || !playing);
  const progress = duration ? Math.min(100, (time / duration) * 100) : 0;

  return (
    <div
      ref={boxRef}
      onMouseMove={everPlayed ? nudgeControls : undefined}
      className={`relative w-full overflow-hidden bg-[#1f1a2b] ${
        fullscreen
          ? "flex h-full items-center"
          : "rounded-[22px] shadow-[0_40px_90px_-40px_rgba(59,45,85,0.75)] ring-1 ring-black/5"
      }`}
      style={fullscreen ? undefined : { aspectRatio: `${PICTURE.width} / ${PICTURE.height}` }}
    >
      {/* The picture's box; the player inside is drawn taller so the black
          bars WIZTV baked into the film fall outside it. */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: `${PICTURE.width} / ${PICTURE.height}` }}>
        {started && (
          <div
            className="absolute left-0 w-full"
            style={{ height: `${OVERSIZE * 100 + 1}%`, top: `${-((OVERSIZE - 1) / 2) * 100 - 0.5}%` }}
          >
            <div ref={mountRef} className="h-full w-full" title={title} />
          </div>
        )}

        {/* Takes taps once the film is playing, so YouTube's own hover bar and
            logo aren't summoned; left off while an iPhone needs a direct tap. */}
        {everPlayed && !needsDirectTap && (
          <button
            type="button"
            aria-label={playing ? "Pause" : "Play"}
            onClick={() => {
              if (controlsVisible || !playing) togglePlay();
              else nudgeControls();
            }}
            className="absolute inset-0 h-full w-full cursor-pointer"
          />
        )}

        {!started && (
          <button
            type="button"
            onClick={start}
            aria-label={`Play ${title}`}
            className="group absolute inset-0 h-full w-full cursor-pointer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={poster} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
            <span className="absolute inset-0 bg-gradient-to-t from-[#1f1a2b]/50 via-transparent to-transparent" />
            {/* In the corner, not the middle: the couple stand at the centre of
                the photo, and a big button there would cover their faces. */}
            <span className="absolute bottom-4 left-4 flex items-center gap-3 rounded-full bg-white/95 py-2 pr-5 pl-2 shadow-[0_12px_36px_rgba(0,0,0,0.3)] backdrop-blur-sm transition-transform duration-300 group-hover:scale-105 group-active:scale-95 sm:bottom-6 sm:left-6 sm:py-2.5 sm:pl-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6b4f96] sm:h-12 sm:w-12">
                <PlayIcon className="ml-0.5 h-5 w-5 text-white sm:h-6 sm:w-6" />
              </span>
              <span className="text-sm font-medium tracking-[0.12em] text-[#3b2d55] uppercase sm:text-base">
                Play the film
              </span>
            </span>
          </button>
        )}

        {started && !everPlayed && !needsDirectTap && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#1f1a2b]">
            <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/25 border-t-white" aria-label="Loading" />
          </div>
        )}

        {/* The site's controls, in place of YouTube's. */}
        <div
          className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-3 pt-10 pb-2.5 transition-opacity duration-300 sm:px-5 sm:pb-4 ${
            showControls ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(time, duration || 0)}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Seek"
            className="film-seek h-1.5 w-full cursor-pointer appearance-none rounded-full"
            style={{
              background: `linear-gradient(to right, #ffffff ${progress}%, rgba(255,255,255,0.3) ${progress}%)`,
            }}
          />
          <div className="mt-2 flex items-center gap-2 text-white sm:gap-3">
            <ControlButton label={playing ? "Pause" : "Play"} onClick={togglePlay}>
              {playing ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}
            </ControlButton>
            <ControlButton label={muted ? "Unmute" : "Mute"} onClick={toggleMute}>
              {muted ? <MutedIcon className="h-6 w-6" /> : <SoundIcon className="h-6 w-6" />}
            </ControlButton>
            <span className="text-xs tabular-nums text-white/90 sm:text-sm">
              {clock(time)} <span className="text-white/50">/ {clock(duration)}</span>
            </span>
            <span className="flex-1" />
            {canFullscreen && (
              <ControlButton label={fullscreen ? "Exit full screen" : "Full screen"} onClick={toggleFullscreen}>
                <FullscreenIcon className="h-6 w-6" exit={fullscreen} />
              </ControlButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="relative z-10 flex h-10 w-10 cursor-pointer touch-manipulation items-center justify-center rounded-full transition-colors hover:bg-white/15"
    >
      {children}
    </button>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
    </svg>
  );
}
function PauseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}
function SoundIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}
function MutedIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" />
      <path d="m16 9 6 6M22 9l-6 6" />
    </svg>
  );
}
function FullscreenIcon({ className, exit }: { className?: string; exit?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      {exit ? (
        <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
      ) : (
        <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
      )}
    </svg>
  );
}
