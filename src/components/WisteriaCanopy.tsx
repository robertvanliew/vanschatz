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

/** A simple sage leaf used along the vine. */
function Leaf({ angle, size = 26, tone = "#7d9370" }: { angle: number; size?: number; tone?: string }) {
  return (
    <svg
      viewBox="0 0 20 12"
      width={size}
      height={size * 0.6}
      aria-hidden
      style={{ transform: `rotate(${angle}deg)` }}
      className="block"
    >
      <path d="M1 6 Q 7 -2 19 6 Q 7 14 1 6 Z" fill={tone} opacity="0.85" />
      <path d="M2 6 L18 6" stroke="#5f7554" strokeWidth="0.6" opacity="0.6" />
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
            <Leaf angle={l.angle} size={l.size} tone={l.tone} />
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

/** Petals released from the canopy, drifting down through the hero. */
export function PetalRain({ count = 12 }: { count?: number }) {
  const rnd = seeded(53);
  const petals = Array.from({ length: count }, (_, i) => ({
    left: rnd() * 100,
    dur: 9 + rnd() * 8,
    delay: -rnd() * 16,
    drift: (rnd() - 0.35) * 12,
    spin: 180 + rnd() * 360,
    size: 8 + rnd() * 7,
    color: ["#c3a8e0", "#a988cf", "#e5bfd2"][i % 3],
    o: 0.5 + rnd() * 0.4,
  }));

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
          <svg viewBox="0 0 12 14" width={p.size} height={p.size * 1.15} className="block">
            <path d="M6 0 C 10 3 11 8 6 13.5 C 1 8 2 3 6 0 Z" fill={p.color} />
          </svg>
        </div>
      ))}
    </div>
  );
}
