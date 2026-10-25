"use client";

import { useState } from "react";

const URL = "https://thevanschatz.com/video";

/**
 * Share the film: the phone's own share sheet where there is one (texts,
 * WhatsApp, email), otherwise copy the link.
 */
export default function ShareFilmButton() {
  const [copied, setCopied] = useState(false);

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Julie & Robert's wedding film", url: URL });
        return;
      } catch {
        // Cancelled, or not allowed here: fall through to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked; nothing sensible left to do.
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="cursor-pointer rounded-full border border-[#c9b8e0] bg-white/70 px-5 py-2 text-[#6b4f96] transition-colors hover:bg-white"
    >
      {copied ? "Link copied ✓" : "Share the film"}
    </button>
  );
}
