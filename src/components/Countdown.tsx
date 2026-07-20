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
    <div
      className="mx-auto flex max-w-2xl items-stretch justify-center gap-3 sm:gap-5"
      aria-label="Countdown to the wedding"
    >
      {cells.map(([label, value], i) => (
        <div key={label} className="flex items-center">
          <div className="flex w-[4.5rem] flex-col items-center rounded-2xl border border-line bg-white/70 px-2 py-4 text-center shadow-[0_12px_30px_-20px_rgba(107,79,150,0.4)] backdrop-blur-sm sm:w-24 sm:py-5">
            <div className="font-display text-4xl leading-none tabular-nums sm:text-5xl">
              {String(value).padStart(2, "0")}
            </div>
            <div className="mt-2 text-[10px] tracking-[0.28em] text-ink-dim uppercase sm:text-[11px]">
              {label}
            </div>
          </div>
          {/* hairline separator between tiles, hidden after the last */}
          {i < cells.length - 1 && (
            <span aria-hidden className="mx-1 hidden font-display text-2xl text-line sm:inline sm:px-1">
              ·
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
