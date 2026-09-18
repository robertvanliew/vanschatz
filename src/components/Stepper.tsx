"use client";

/**
 * The − 3 + control for party size, shared by both RSVP forms.
 *
 * It has to fit a phone. The previous copies used a wide letter-spaced label and
 * fixed-width controls inside cards with generous padding, which on a 375px
 * screen came to roughly 258px of row in about 221px of space. The row sits in
 * an `overflow-hidden` wrapper (for the open/close animation), so the + button
 * was clipped off and guests could not raise the count above 1.
 *
 * So: the controls never shrink, the label gives way instead, and the letter
 * spacing tightens on small screens. `touch-manipulation` stops iOS treating a
 * quick second tap on + as a double-tap-to-zoom and swallowing it.
 */
export default function Stepper({
  label,
  value,
  onDec,
  onInc,
  decDisabled = false,
  incDisabled = false,
}: {
  label: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
  decDisabled?: boolean;
  incDisabled?: boolean;
}) {
  const btn =
    "flex h-11 w-11 shrink-0 cursor-pointer touch-manipulation select-none items-center justify-center rounded-full border border-[#c9b8e0] text-2xl leading-none transition-colors duration-200 hover:bg-[#f0eaf7] active:bg-[#e7dcf5] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent";

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="min-w-0 text-xs tracking-[0.12em] text-ink-dim uppercase sm:text-sm sm:tracking-[0.2em]">
        {label}
      </span>
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <button
          type="button"
          aria-label={`Fewer ${label.toLowerCase()}`}
          onClick={onDec}
          disabled={decDisabled}
          className={btn}
        >
          −
        </button>
        <span
          className="font-display w-8 text-center text-3xl tabular-nums"
          aria-live="polite"
          aria-label={`${value} ${label.toLowerCase()}`}
        >
          {value}
        </span>
        <button
          type="button"
          aria-label={`More ${label.toLowerCase()}`}
          onClick={onInc}
          disabled={incDisabled}
          className={btn}
        >
          +
        </button>
      </div>
    </div>
  );
}
