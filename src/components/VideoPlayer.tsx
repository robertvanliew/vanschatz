"use client";

import { useState } from "react";
import { embedUrl } from "@/lib/video";

/**
 * The film's cover frame with a play button; YouTube's player only loads once
 * it's pressed. The page opens instantly instead of waiting on YouTube's
 * scripts, and the first thing guests see is the two of you, not YouTube's
 * chrome.
 */
export default function VideoPlayer({
  youtubeId,
  title,
  poster,
}: {
  youtubeId: string;
  title: string;
  poster: string;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-[22px] bg-[#1f1a2b] shadow-[0_40px_90px_-40px_rgba(59,45,85,0.75)] ring-1 ring-black/5">
      {playing ? (
        <iframe
          src={embedUrl(youtubeId)}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
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
              <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5 text-white sm:h-6 sm:w-6" fill="currentColor" aria-hidden>
                <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
              </svg>
            </span>
            <span className="text-sm font-medium tracking-[0.12em] text-[#3b2d55] uppercase sm:text-base">
              Play the film
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
