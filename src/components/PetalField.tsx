/**
 * Falling petals within the hero. The layer is `absolute inset-0`, so petals
 * drift down through the hero and settle there (they don't follow the scroll).
 * Pure SVG + CSS (globals.css: .petal) so it renders on the server and honors
 * prefers-reduced-motion.
 *
 * "Randomness" is a deterministic seeded sequence — identical on server and
 * client, so there is no hydration mismatch.
 */

function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// light → deep tints per bloom colour, for a soft gradient across each petal
const TINTS: [string, string][] = [
  ["#e0cef2", "#b295d6"], // lilac
  ["#cbb4e8", "#9a78c4"], // lavender
  ["#cfe3bd", "#8aa17c"], // sage green
  ["#f3d8e5", "#d3a3bd"], // blush
  ["#d7c4ee", "#8a6db1"], // deep wisteria
  ["#bcd6a6", "#6f8763"], // deep leaf green
];

// three petal silhouettes so the fall doesn't read as one repeated shape
const SHAPES = [
  "M11 22 C 3 18 0.5 9 4 4 C 6.4 0.8 9 3.4 11 6 C 13 3.4 15.6 0.8 18 4 C 21.5 9 19 18 11 22 Z", // notched blossom
  "M11 1 C 18.5 5 20 13.5 11 23 C 2 13.5 3.5 5 11 1 Z", // curled teardrop
  "M11 23 C 4 20 1.8 11 6 5 C 8.2 1.8 13.8 1.8 16 5 C 20.2 11 18 20 11 23 Z", // rounded fan
];

function Petal({ i, size }: { i: number; size: number }) {
  const [from, to] = TINTS[i % TINTS.length];
  const d = SHAPES[i % SHAPES.length];
  const gid = `pf-${i}`;
  return (
    <svg viewBox="0 0 22 24" width={size} height={size * 1.09} aria-hidden className="block">
      <defs>
        <linearGradient id={gid} gradientUnits="objectBoundingBox" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <path d={d} fill={`url(#${gid})`} />
      {/* soft central highlight for a translucent, veined look */}
      <path d="M11 5 Q 10 13 11 21" stroke="#ffffff" strokeWidth="0.6" fill="none" opacity="0.35" />
    </svg>
  );
}

// TINTS indices that are green — kept to the side gutters so they never fall
// across the couple's names in the centre (other colours may drift anywhere).
const GREEN_TINTS = new Set([2, 5]);

export default function PetalField({ count = 16 }: { count?: number }) {
  const rnd = seeded(97);
  const petals = Array.from({ length: count }, (_, i) => {
    const green = GREEN_TINTS.has(i % TINTS.length);
    // Green petals: left gutter (0–20%) or right gutter (80–100%) only.
    const left = green ? (rnd() < 0.5 ? rnd() * 20 : 80 + rnd() * 20) : rnd() * 100;
    return {
      left,
      // greens drift outward-ish and gently so they stay clear of the centre
      dur: 12 + rnd() * 12, // slow, unhurried
      delay: -rnd() * 24,
      drift: green ? (rnd() - 0.5) * 6 : (rnd() - 0.4) * 14,
      spin: 160 + rnd() * 340,
      size: 9 + rnd() * 8,
      o: 0.32 + rnd() * 0.28, // subtle — never fights the text
    };
  });

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden select-none">
      {petals.map((p, i) => (
        <div
          key={i}
          className="petal absolute top-0"
          style={
            {
              left: `${p.left}%`,
              "--dur": `${p.dur}s`,
              "--delay": `${p.delay}s`,
              "--drift": `${p.drift}vw`,
              "--spin": `${p.spin}deg`,
              "--petal-o": p.o,
            } as React.CSSProperties
          }
        >
          <Petal i={i} size={p.size} />
        </div>
      ))}
    </div>
  );
}
