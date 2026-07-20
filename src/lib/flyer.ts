import sharp from "sharp";
import QRCode from "qrcode";
import { FLYER_BASE_B64 } from "@/lib/flyer-base";

/**
 * The wedding flyer. The card — wisteria, names, "are getting married", date,
 * address — is pre-rendered where fonts exist (see _genbase.mjs) and embedded as
 * FLYER_BASE_B64, because Vercel's servers have no fonts to draw SVG text with.
 * At request time we only composite each guest's QR (which needs no font) onto
 * the empty card slot, so the flyer always renders fully, everywhere.
 *
 * Regenerate the base with `node _genbase.mjs` after any flyer design change.
 */

const baseBuffer = Buffer.from(FLYER_BASE_B64, "base64");

/** Render the flyer as a JPEG with a QR that points at `qrTarget`. */
export async function renderFlyer(qrTarget: string): Promise<Buffer> {
  const qr = await QRCode.toBuffer(qrTarget, {
    type: "png",
    width: 190,
    margin: 2,
    color: { dark: "#332c44ff", light: "#ffffffff" },
    errorCorrectionLevel: "M",
  });
  return sharp(baseBuffer)
    .composite([{ input: qr, left: 445, top: 1115 }])
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}
