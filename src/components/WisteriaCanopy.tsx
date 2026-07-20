/**
 * Animated wisteria canopy draping from the top edge, plus drifting petals.
 * Pure SVG + CSS animations (see globals.css: .sway, .petal) so it renders on
 * the server and honors prefers-reduced-motion with zero JS.
 *
 * All "randomness" is a deterministic seeded sequence — identical on server
 * and client, so there is no hydration mismatch.
 */

// Small deterministic PRNG (mulberry32) so the arrangement is organic but stable.
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

const PALETTES = [
  ["#c3a8e0", "#8a6db1", "#6b4f96"], // lilac → deep wisteria
  ["#d8c2ec", "#a988cf", "#8a6db1"], // pale lavender
  ["#e5bfd2", "#c799b6", "#a97a9c"], // blush pink
];

/** One hanging flower cluster (raceme): a tapering cone of petal blobs. */
function Raceme({ seed, height = 150 }: { seed: number; height?: number }) {
  const rnd = seeded(seed);
  const palette = PALETTES[Math.floor(rnd() * PALETTES.length)];
  const rows = 8 + Math.floor(rnd() * 4);
  const blobs: { cx: number; cy: number; r: number; fill: string; o: number }[] = [];

  for (let row = 0; row < rows; row++) {
    const t = row / (rows - 1); // 0 top → 1 tip
    const rowWidth = 22 * (1 - t * 0.8); // cone taper
    const perRow = row < rows - 2 ? 3 : 2;
    for (let j = 0; j < perRow; j++) {
      const cx = 30 + (rnd() - 0.5) * rowWidth * 2;
      const cy = 8 + t * (height - 24) + (rnd() - 0.5) * 6;
      blobs.push({
        cx,
        cy,
        r: 4.6 - t * 2.2 + rnd() * 1.4,
        fill: palette[Math.min(2, Math.floor(t * 2 + rnd() * 0.8))],
        o: 0.75 + rnd() * 0.25,
      });
    }
  }

  return (
    <svg
      viewBox={`0 0 60 ${height + 10}`}
      width={60}
      height={height + 10}
      aria-hidden
      className="block"
    >
      {/* stem */}
      <path
        d={`M30 0 Q ${28 + rnd() * 6} ${height * 0.5} 30 ${height * 0.9}`}
        stroke="#7d9370"
        strokeWidth="1.4"
        fill="none"
        opacity="0.7"
      />
      {blobs.map((b, i) => (
        <circle key={i} cx={b.cx} cy={b.cy} r={b.r} fill={b.fill} opacity={b.o} />
      ))}
    </svg>
  );
}

/** A sage leaf with a curved midrib, side veins and a soft two-tone fold. */
function Leaf({
  angle,
  size = 26,
  tone = "#7d9370",
  uid = "lf",
}: {
  angle: number;
  size?: number;
  tone?: string;
  uid?: string;
}) {
  return (
    <svg
      viewBox="0 0 30 16"
      width={size}
      height={size * 0.53}
      aria-hidden
      style={{ transform: `rotate(${angle}deg)` }}
      className="block"
    >
      <defs>
        <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a7bd93" />
          <stop offset="55%" stopColor={tone} />
          <stop offset="100%" stopColor="#5f7554" />
        </linearGradient>
      </defs>
      {/* short stem */}
      <path d="M0 8 L4 8" stroke="#6f8763" strokeWidth="0.9" opacity="0.75" />
      {/* blade — pointed tip, gentle asymmetry */}
      <path d="M3 8 C 10 0 22 0 29 8 C 22 16 10 16 3 8 Z" fill={`url(#${uid}-g)`} opacity="0.92" />
      {/* darker lower fold for depth */}
      <path d="M3 8 C 12 15 22 15 29 8 C 22 12 12 12 3 8 Z" fill="#5f7554" opacity="0.22" />
      {/* midrib + side veins */}
      <path d="M4 8 Q 16 7 28 8" stroke="#54683f" strokeWidth="0.5" fill="none" opacity="0.55" />
      <g stroke="#54683f" strokeWidth="0.35" opacity="0.4">
        <path d="M10 8 L7 4.5" fill="none" />
        <path d="M10 8 L7 11.5" fill="none" />
        <path d="M16 8 L13 4.2" fill="none" />
        <path d="M16 8 L13 11.8" fill="none" />
        <path d="M22 8 L19 5" fill="none" />
        <path d="M22 8 L19 11" fill="none" />
      </g>
    </svg>
  );
}

type Hang = { left: number; scale: number; sway: number; dur: number; delay: number; seed: number };

function buildHangs(seedBase: number, count: number): Hang[] {
  const rnd = seeded(seedBase);
  return Array.from({ length: count }, (_, i) => ({
    left: (i / count) * 100 + rnd() * (100 / count) * 0.6,
    scale: 0.65 + rnd() * 0.55,
    sway: 1.2 + rnd() * 1.6,
    dur: 5 + rnd() * 4,
    delay: -rnd() * 8,
    seed: seedBase * 1000 + i * 37,
  }));
}

const BACK_HANGS = buildHangs(7, 9);
const FRONT_HANGS = buildHangs(13, 7);

/** Extra lush clusters near the corners, echoing the reference's dense edges. */
const CORNER_HANGS: Hang[] = (() => {
  const rnd = seeded(41);
  const spots = [1, 5, 9, 13, 87, 91, 95, 99];
  return spots.map((left, i) => ({
    left,
    scale: 0.95 + rnd() * 0.5,
    sway: 1 + rnd() * 1.4,
    dur: 6 + rnd() * 4,
    delay: -rnd() * 9,
    seed: 4100 + i * 53,
  }));
})();
const LEAF_ROW = (() => {
  const rnd = seeded(29);
  return Array.from({ length: 14 }, (_, i) => ({
    left: (i / 14) * 100 + rnd() * 4,
    angle: -40 + rnd() * 80,
    size: 18 + rnd() * 14,
    tone: rnd() > 0.5 ? "#7d9370" : "#93a884",
    flip: rnd() > 0.5,
  }));
})();

export default function WisteriaCanopy() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 h-64 select-none">
      {/* Back layer — hazy, slower, like depth of field */}
      <div className="absolute inset-x-0 top-0 opacity-70 blur-[2px]">
        {BACK_HANGS.map((h, i) => (
          <div
            key={`b${i}`}
            className="sway absolute top-0"
            style={
              {
                left: `${h.left}%`,
                "--sway": `${h.sway * 0.7}deg`,
                "--dur": `${h.dur + 2}s`,
                "--delay": `${h.delay}s`,
                transform: `scale(${h.scale * 0.85})`,
              } as React.CSSProperties
            }
          >
            <Raceme seed={h.seed} height={120 + (i % 3) * 25} />
          </div>
        ))}
      </div>

      {/* Vine + leaves along the very top */}
      <div className="absolute inset-x-0 -top-1 flex justify-between px-2">
        {LEAF_ROW.map((l, i) => (
          <div key={`l${i}`} style={{ transform: l.flip ? "scaleX(-1)" : undefined }}>
            <Leaf angle={l.angle} size={l.size} tone={l.tone} uid={`lf${i}`} />
          </div>
        ))}
      </div>

      {/* Corner clusters — lush edges like a real trellis */}
      <div className="absolute inset-x-0 top-0">
        {CORNER_HANGS.map((h, i) => (
          <div
            key={`c${i}`}
            className="sway absolute top-0"
            style={
              {
                left: `${h.left}%`,
                "--sway": `${h.sway}deg`,
                "--dur": `${h.dur}s`,
                "--delay": `${h.delay}s`,
                transform: `scale(${h.scale})`,
              } as React.CSSProperties
            }
          >
            <Raceme seed={h.seed} height={130 + (i % 4) * 22} />
          </div>
        ))}
      </div>

      {/* Front layer — crisp, breeze-swayed */}
      <div className="absolute inset-x-0 top-0">
        {FRONT_HANGS.map((h, i) => (
          <div
            key={`f${i}`}
            className="sway absolute top-0"
            style={
              {
                left: `${(h.left + 5) % 100}%`,
                "--sway": `${h.sway}deg`,
                "--dur": `${h.dur}s`,
                "--delay": `${h.delay}s`,
                transform: `scale(${h.scale})`,
              } as React.CSSProperties
            }
          >
            <Raceme seed={h.seed} height={140 + (i % 3) * 30} />
          </div>
        ))}
      </div>
    </div>
  );
}
