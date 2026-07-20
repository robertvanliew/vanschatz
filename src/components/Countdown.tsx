"use client";

import { useEffect, useState } from "react";
import { WEDDING } from "@/lib/wedding";

type Parts = { days: number; hours: number; minutes: number; seconds: number };

function partsUntil(target: Date): Parts {
  const ms = Math.max(0, target.getTime() - Date.now());
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor(ms / 3_600_000) % 24,
    minutes: Math.floor(ms / 60_000) % 60,
    seconds: Math.floor(ms / 1000) % 60,
  };
}

export default function Countdown() {
  const [parts, setParts] = useState<Parts | null>(null); // null until mounted (avoids hydration mismatch)
  useEffect(() => {
    // Client-only initial value computed post-mount to avoid a server/client hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setParts(partsUntil(WEDDING.date));
    const id = setInterval(() => setParts(partsUntil(WEDDING.date)), 1000);
    return () => clearInterval(id);
  }, []);

  const cells: [string, number][] = parts
    ? [
        ["Days", parts.days],
        ["Hours", parts.hours],
        ["Minutes", parts.minutes],
        ["Seconds", parts.seconds],
      ]
    : [];

  return (
    <div className="flex justify-center gap-4 sm:gap-8" aria-label="Countdown to the wedding">
      {cells.map(([label, value]) => (
        <div
          key={label}
          className="w-20 rounded-2xl border border-line bg-white/70 py-4 shadow-[0_12px_30px_-20px_rgba(107,79,150,0.4)] backdrop-blur-sm sm:w-24"
        >
          <div className="font-display text-3xl sm:text-4xl">{value}</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.25em] text-ink-dim">{label}</div>
        </div>
      ))}
    </div>
  );
}
