/**
 * Rebuild src/lib/flyer-base.ts — the pre-rendered flyer card that the server
 * composites each guest's QR onto (Vercel has no fonts, so text can't be drawn
 * at request time).
 *
 * The original design generator was never committed and is not in git history,
 * so this script works from the last published base image plus the source photo:
 *
 *   1. The couple-photo layer is recovered analytically. It is photos/03.jpeg
 *      resized to 1080 wide with the top 324 rows dropped — found by scanning
 *      scale/offset for peak cross-correlation against the card, and confirmed
 *      to sub-pixel accuracy.
 *   2. The card is re-laid out at 5:7 (1080x1512, a standard 5x7 invitation that
 *      fits an A7 envelope). Everything below the photo moves down by GAIN px;
 *      the vacated strip is refilled with a clean cream row so the frame rules
 *      stay continuous.
 *   3. The photo's soft bottom edge is re-cut to clear Julie's chin, applied as
 *          out = base + (a2 - a1) * (photo - cream)
 *      which is exact: pixels whose alpha is unchanged stay bit-identical, so
 *      the border, wisteria, petals and text are never resampled.
 *
 * Usage:  node scripts/regen-flyer-base.mjs <previous-base.jpg>
 *
 * NOT idempotent — it must be fed the 1080x1440 base it was written against
 * (git show <rev>:src/lib/flyer-base.ts, base64-decoded). Re-running it on its
 * own output would shift the layout a second time.
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const SRC_W = 1080, SRC_H = 1440;
const GAIN = 72;                    // rows added below the photo -> 1080x1512
const OUT_H = SRC_H + GAIN;
const CREAM = [251, 250, 246];
const PHOTO = "public/photos/03.jpeg";
const PHOTO_W = 1080, PHOTO_TOP = 324;   // recovered geometry of the photo layer
const MASK_H = 700;                 // everything photo-related is above this
const DONOR_ROW = 1100;             // clean cream row (frame rules, nothing else)
const SPLIT = 573;                  // first row below the photo in the old card

// New bottom edge for the photo: opaque through her chin, gone before the text.
const HOLD = 592, GONE = 616, RAMP_IN = 470;

const prevBase = process.argv[2];
if (!prevBase) { console.error("usage: node scripts/regen-flyer-base.mjs <previous-base.jpg>"); process.exit(1); }

const src = await sharp(prevBase).raw().toBuffer({ resolveWithObject: true });
if (src.info.width !== SRC_W || src.info.height !== SRC_H) {
  console.error(`expected a ${SRC_W}x${SRC_H} base, got ${src.info.width}x${src.info.height}`);
  process.exit(1);
}
const B = src.data, C = src.info.channels;
const bAt = (x, y, c) => B[(y * SRC_W + x) * C + c];

const ph = await sharp(PHOTO).resize({ width: PHOTO_W }).raw().toBuffer({ resolveWithObject: true });
const P = ph.data, PW = ph.info.width, PH = ph.info.height, PC = ph.info.channels;
const pAt = (x, y) => {
  const py = y + PHOTO_TOP;
  if (x < 0 || py < 0 || x >= PW || py >= PH) return null;
  const i = (py * PW + x) * PC;
  return [P[i], P[i + 1], P[i + 2]];
};

// ---- recover the existing soft mask ----------------------------------------
const alpha = new Float32Array(SRC_W * MASK_H).fill(NaN);
for (let y = 0; y < MASK_H; y++) for (let x = 0; x < SRC_W; x++) {
  const p = pAt(x, y); if (!p) continue;
  let num = 0, den = 0;
  for (let c = 0; c < 3; c++) { const d = p[c] - CREAM[c]; num += (bAt(x, y, c) - CREAM[c]) * d; den += d * d; }
  if (den < 900) continue;                       // photo ~= cream here: unusable
  alpha[y * SRC_W + x] = Math.min(1.2, Math.max(-0.2, num / den));
}
const median = (a) => { const v = a.filter(Number.isFinite).sort((p, q) => p - q); return v.length ? v[v.length >> 1] : NaN; };
const carry = (arr) => { let last = 0; return arr.map((v) => (Number.isFinite(v) ? (last = v) : last)); };
const smooth = (arr, r) => arr.map((_, i) => {
  let s = 0, n = 0;
  for (let k = -r; k <= r; k++) { const v = arr[i + k]; if (Number.isFinite(v)) { s += v; n++; } }
  return n ? s / n : 0;
});
const clamp01 = (v) => Math.min(1, Math.max(0, v));

const fx = smooth(carry(Array.from({ length: SRC_W }, (_, x) => {
  const col = []; for (let y = 150; y <= 430; y += 2) col.push(alpha[y * SRC_W + x]);
  return median(col);
})), 6).map(clamp01);

const fy = smooth(carry(Array.from({ length: MASK_H }, (_, y) => {
  const row = [];
  for (let x = 250; x <= 830; x += 2) { const a = alpha[y * SRC_W + x]; if (Number.isFinite(a) && fx[x] > 0.9) row.push(a / fx[x]); }
  return median(row);
})), 3).map(clamp01);

const smoothstep = (t) => { const c = clamp01(t); return c * c * (3 - 2 * c); };
const fyNew = (y) => {
  if (y <= RAMP_IN) return fy[y];
  if (y <= HOLD) { const t = smoothstep((y - RAMP_IN) / (HOLD - RAMP_IN)); return fy[y] * (1 - t) + t; }
  if (y >= GONE) return 0;
  return 1 - smoothstep((y - HOLD) / (GONE - HOLD));
};

// ---- cream fill for the vacated strip, matched to the cream below the photo --
const meanRow = (y, x0, x1) => {
  const m = [0, 0, 0];
  for (let x = x0; x <= x1; x++) for (let c = 0; c < 3; c++) m[c] += bAt(x, y, c);
  return m.map((v) => v / (x1 - x0 + 1));
};
const donorLevel = meanRow(DONOR_ROW, 200, 880);
const targetLevel = meanRow(610, 200, 880);          // clean cream just under the old photo
const fillShift = targetLevel.map((v, c) => v - donorLevel[c]);

// ---- assemble the taller card ------------------------------------------------
const out = Buffer.alloc(SRC_W * OUT_H * 3);
for (let y = 0; y < OUT_H; y++) {
  for (let x = 0; x < SRC_W; x++) {
    const oi = (y * SRC_W + x) * 3;
    if (y < SPLIT) {
      for (let c = 0; c < 3; c++) out[oi + c] = bAt(x, y, c);
    } else if (y < SPLIT + GAIN) {
      for (let c = 0; c < 3; c++) out[oi + c] = Math.round(Math.max(0, Math.min(255, bAt(x, DONOR_ROW, c) + fillShift[c])));
    } else {
      const sy = y - GAIN;
      // strip the faint tail of the old photo off the rows we are moving down
      const a = sy < MASK_H ? clamp01(fx[x] * fy[sy]) : 0;
      const p = a > 0 ? pAt(x, sy) : null;
      for (let c = 0; c < 3; c++) {
        const v = bAt(x, sy, c) - (p ? a * (p[c] - CREAM[c]) : 0);
        out[oi + c] = Math.round(Math.max(0, Math.min(255, v)));
      }
    }
  }
}

// ---- re-cut the photo's bottom edge -----------------------------------------
let touchedFrom = Infinity, touchedTo = -Infinity;
for (let y = 0; y < MASK_H; y++) {
  for (let x = 0; x < SRC_W; x++) {
    const aOld = y < SPLIT ? clamp01(fx[x] * fy[y]) : 0;   // the assembled card
    const aNew = clamp01(fx[x] * fyNew(y));
    const d = aNew - aOld;
    if (Math.abs(d) < 1e-4) continue;
    const p = pAt(x, y); if (!p) continue;
    const oi = (y * SRC_W + x) * 3;
    for (let c = 0; c < 3; c++) {
      out[oi + c] = Math.round(Math.max(0, Math.min(255, out[oi + c] + d * (p[c] - CREAM[c]))));
    }
    if (y < touchedFrom) touchedFrom = y;
    if (y > touchedTo) touchedTo = y;
  }
}
console.log(`photo edge re-cut over rows ${touchedFrom}..${touchedTo} (hold ${HOLD}, clear by ${GONE})`);

const jpeg = await sharp(out, { raw: { width: SRC_W, height: OUT_H, channels: 3 } })
  .jpeg({ quality: 92, mozjpeg: true })
  .toBuffer();

const dest = path.join("src", "lib", "flyer-base.ts");
fs.writeFileSync(dest,
  "// AUTO-GENERATED by scripts/regen-flyer-base.mjs — the flyer card rendered\n" +
  "// where fonts exist; the server only overlays each guest's QR.\n" +
  "export const FLYER_BASE_B64 =\n  \"" + jpeg.toString("base64") + "\";\n");
console.log(`wrote ${dest} — ${SRC_W}x${OUT_H}, ${jpeg.length} bytes`);
