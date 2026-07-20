import sharp from "sharp";
import QRCode from "qrcode";
import { WEDDING } from "@/lib/wedding";

/**
 * The wedding flyer, rendered server-side. The whole card (wisteria, names,
 * date, address) is identical for everyone, so it's rasterised once and cached;
 * only the QR — which encodes each guest's personal RSVP link — is composited
 * per request. Used by /invite/[token]/flyer and embedded in invite/reminder
 * emails so every guest's flyer scans straight to their own RSVP.
 */

const W = 1080;
const H = 1440;
const CX = W / 2;

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
  ["#c3a8e0", "#8a6db1", "#6b4f96"],
  ["#d8c2ec", "#a988cf", "#8a6db1"],
  ["#e5bfd2", "#c799b6", "#a97a9c"],
];

function raceme(rnd: () => number, x: number, y: number, height: number, scale: number): string {
  const p = PALETTES[Math.floor(rnd() * PALETTES.length)];
  const rows = 9 + Math.floor(rnd() * 4);
  let s = `<g transform="translate(${x} ${y}) scale(${scale})">`;
  s += `<path d="M0 0 Q ${(rnd() - 0.5) * 20} ${height * 0.5} 0 ${height * 0.9}" stroke="#7d9370" stroke-width="2.5" fill="none" opacity="0.65"/>`;
  for (let row = 0; row < rows; row++) {
    const t = row / (rows - 1);
    const rowW = 46 * (1 - t * 0.8);
    const per = row < rows - 2 ? 3 : 2;
    for (let j = 0; j < per; j++) {
      const cx = (rnd() - 0.5) * rowW * 2;
      const cy = 12 + t * (height - 30) + (rnd() - 0.5) * 10;
      const r = 9 - t * 4.4 + rnd() * 2.8;
      const fill = p[Math.min(2, Math.floor(t * 2 + rnd() * 0.8))];
      s += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}" opacity="${(0.75 + rnd() * 0.25).toFixed(2)}"/>`;
    }
  }
  return s + "</g>";
}

const leaf = (x: number, y: number, a: number, s: number) =>
  `<g transform="translate(${x} ${y}) rotate(${a}) scale(${s})"><path d="M0 6 C 10 0 22 0 29 6 C 22 12 10 12 0 6 Z" fill="#7d9370" opacity="0.8"/><path d="M2 6 L27 6" stroke="#5f7554" stroke-width="0.7" opacity="0.5"/></g>`;
const petal = (x: number, y: number, a: number, s: number, c: string) =>
  `<g transform="translate(${x} ${y}) rotate(${a}) scale(${s})"><path d="M6 0 C 10 3 11 8 6 13.5 C 1 8 2 3 6 0 Z" fill="${c}" opacity="0.7"/></g>`;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildSvg(): string {
  const rnd = seeded(2026);
  let canopy = "";
  for (let i = 0; i < 9; i++) canopy += raceme(rnd, (i / 8) * W + (rnd() - 0.5) * 40, -10, 150 + rnd() * 130, 0.9 + rnd() * 0.6);
  let leaves = "";
  for (let i = 0; i < 16; i++) leaves += leaf((i / 15) * W, 6 + rnd() * 10, -40 + rnd() * 80, 1.6 + rnd() * 1.2);
  let petals = "";
  const pc = ["#c3a8e0", "#a988cf", "#e5bfd2"];
  for (let i = 0; i < 9; i++) petals += petal(rnd() * W, 500 + rnd() * 560, rnd() * 360, 2.2 + rnd() * 1.4, pc[i % 3]);

  const [first, second] = WEDDING.coupleFull.split(" & ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="wash" cx="50%" cy="30%" r="80%"><stop offset="0%" stop-color="#fdfbf8"/><stop offset="60%" stop-color="#faf8f4"/><stop offset="100%" stop-color="#f3eee7"/></radialGradient>
    <linearGradient id="names" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#5f7554"/><stop offset="55%" stop-color="#7d9370"/><stop offset="100%" stop-color="#9db38c"/></linearGradient>
    <radialGradient id="v1" cx="18%" cy="14%" r="40%"><stop offset="0%" stop-color="rgba(195,168,224,0.30)"/><stop offset="100%" stop-color="rgba(195,168,224,0)"/></radialGradient>
    <radialGradient id="v2" cx="85%" cy="12%" r="38%"><stop offset="0%" stop-color="rgba(229,191,210,0.30)"/><stop offset="100%" stop-color="rgba(229,191,210,0)"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#wash)"/>
  <rect width="${W}" height="${H}" fill="url(#v1)"/><rect width="${W}" height="${H}" fill="url(#v2)"/>
  <rect x="46" y="46" width="${W - 92}" height="${H - 92}" fill="none" stroke="#c9ad70" stroke-width="2" opacity="0.55"/>
  ${canopy}${leaves}${petals}
  <g font-family="Georgia, 'Times New Roman', serif" text-anchor="middle">
    <text x="${CX}" y="500" font-size="30" letter-spacing="14" fill="#8f6f3a">YOU'RE INVITED</text>
    <text x="${CX}" y="648" font-size="112" fill="url(#names)">${esc(first)} <tspan fill="#8f6f3a" font-style="italic">&amp;</tspan> ${esc(second)}</text>
    <text x="${CX}" y="712" font-size="34" font-style="italic" fill="#6d6582">are getting married</text>
    <line x1="${CX - 130}" y1="754" x2="${CX + 130}" y2="754" stroke="#c9ad70" stroke-width="1.5" opacity="0.7"/>
    <text x="${CX}" y="838" font-size="38" letter-spacing="6" fill="#332c44">${esc(WEDDING.dateLabel.toUpperCase())}</text>
    <text x="${CX}" y="894" font-size="32" letter-spacing="5" fill="#6d6582">${esc(WEDDING.timeLabel)}</text>
    <text x="${CX}" y="964" font-size="38" letter-spacing="5" fill="#332c44">${esc(WEDDING.venueName.toUpperCase())}</text>
    <text x="${CX}" y="1008" font-size="23" letter-spacing="2" fill="#6d6582">${esc(WEDDING.venueAddress)}</text>
    <text x="${CX}" y="1060" font-size="30" font-style="italic" fill="#6d6582">${esc(WEDDING.scheduleLabel)}</text>
    <rect x="430" y="1100" width="220" height="220" rx="16" fill="#ffffff" stroke="#e4dccd" stroke-width="1.5"/>
    <text x="${CX}" y="1372" font-size="25" letter-spacing="6" fill="#6b4f96">SCAN TO RSVP &#183; THEVANSCHATZ.COM</text>
  </g>
</svg>`;
}

// Rasterise the QR-less base once and reuse it across requests.
let basePng: Promise<Buffer> | null = null;
function getBasePng(): Promise<Buffer> {
  if (!basePng) basePng = sharp(Buffer.from(buildSvg())).png().toBuffer();
  return basePng;
}

/** Render the flyer as a JPEG with a QR that points at `qrTarget`. */
export async function renderFlyer(qrTarget: string): Promise<Buffer> {
  const [base, qr] = await Promise.all([
    getBasePng(),
    QRCode.toBuffer(qrTarget, {
      type: "png",
      width: 190,
      margin: 2,
      color: { dark: "#332c44ff", light: "#ffffffff" },
      errorCorrectionLevel: "M",
    }),
  ]);
  return sharp(base)
    .composite([{ input: qr, left: 445, top: 1115 }])
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}
