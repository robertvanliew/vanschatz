/**
 * Fetch product images for the registry into public/registry/.
 *
 * Retailers differ in how reachable they are (see the design doc). Amazon and
 * Best Buy expose an image path derivable from the product id; Bissell and
 * Mulberry Park can be read straight off the page. West Elm, The Knot and
 * Le Creuset all block automated requests, so their images are supplied by hand
 * and simply skipped here.
 *
 * Safe to re-run: an image already on disk is left alone unless --force.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
import { GIFTS } from "./gifts-data.mjs";

const OUT_DIR = path.join("public", "registry");
const FORCE = process.argv.includes("--force");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

/**
 * Fetch a page as HTML. Several retailers reject Node's fetch outright (Bissell
 * answers it with a 403 while serving curl the real page), so pages go through
 * curl, which is present on every machine this runs on.
 */
function getHtml(url) {
  try {
    return execFileSync("curl", ["-sL", "--max-time", "30", "-A", UA, url], {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch {
    return "";
  }
}

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

/** Is this URL a real product shot rather than a video thumbnail or an asset? */
const usableAmazonImage = (u) =>
  !u.includes("play-button") && !u.includes("overlay") && !/\.(css|js)/.test(u);

/**
 * The main product shot from Amazon's mobile page, used when the legacy
 * catalogue path has no image (newer listings). The desktop page is a robot
 * check and the markdown-converting fetchers drop images, but the mobile page
 * carries the gallery inline.
 */
async function amazonMobileImage(asin) {
  const res = await fetch(`https://www.amazon.com/gp/aw/d/${asin}`, {
    headers: { "user-agent": IPHONE_UA },
  });
  if (!res.ok) return null;
  const html = await res.text();

  const found = new Set();
  for (const m of html.matchAll(
    /"(?:hiRes|large)"\s*:\s*"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+?)"/g
  )) found.add(m[1]);
  for (const m of html.matchAll(
    /https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9]{8,}\._AC_[A-Za-z0-9_]*\.jpg/g
  )) found.add(m[0]);

  return [...found].filter(usableAmazonImage)[0] ?? null;
}

/** Where each retailer's product image lives, or null if it must come by hand. */
async function imageUrlFor(gift) {
  switch (gift.source?.kind) {
    case "amazon": {
      // Legacy catalogue path built from the ASIN — cheap, but only exists for
      // older listings. Newer ones answer with a 43-byte placeholder pixel, so
      // fall through to the mobile product page.
      const legacy = `https://images-na.ssl-images-amazon.com/images/P/${gift.source.asin}.01._SCLZZZZZZZ_.jpg`;
      const probe = execFileSync("curl", ["-sL", "--max-time", "20", "-o", "-", "-w", "%{size_download}", legacy], {
        encoding: "latin1",
        maxBuffer: 64 * 1024 * 1024,
      });
      const size = Number(probe.slice(probe.lastIndexOf("\n") + 1)) || Number(probe.match(/(\d+)$/)?.[1] ?? 0);
      if (size > 3000) return legacy;
      return await amazonMobileImage(gift.source.asin);
    }
    case "bestbuy":
      return `https://pisces.bbystatic.com/image2/BestBuy_US/images/products/${gift.source.sku.slice(0, 4)}/${gift.source.sku}_sd.jpg`;
    case "ogImage": {
      const html = getHtml(gift.url);
      const m = html.match(/og:image(?::secure_url)?"\s+content="([^"]+)"/i)
        || html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
      return m ? m[1].replace(/^http:/, "https:") : null;
    }
    case "cdnScan": {
      const html = getHtml(gift.url);
      const m = html.match(new RegExp(gift.source.pattern, "i"));
      return m ? m[0] : null;
    }
    default:
      return null; // supplied by hand
  }
}

fs.mkdirSync(OUT_DIR, { recursive: true });

let fetched = 0, kept = 0, manual = 0, failed = 0;
for (const gift of GIFTS) {
  const dest = path.join(OUT_DIR, `${gift.slug}.jpg`);
  if (fs.existsSync(dest) && !FORCE) { kept++; console.log(`kept     ${gift.slug}`); continue; }
  if (!gift.source) { manual++; console.log(`by hand  ${gift.slug}  (${gift.retailer} blocks automation)`); continue; }

  try {
    const url = await imageUrlFor(gift);
    if (!url) { failed++; console.log(`MISS     ${gift.slug}  (no image found)`); continue; }
    const buf = execFileSync("curl", ["-sL", "--max-time", "30", "-A", UA, url], { maxBuffer: 64 * 1024 * 1024 });
    if (buf.length < 3000) { failed++; console.log(`MISS     ${gift.slug}  (${buf.length} bytes — looks like a placeholder)`); continue; }

    // Retailer originals run to 1500px and a quarter-megabyte; the cards render
    // them around 400px wide. Downscale on the way in so twelve product shots
    // don't cost the page several megabytes.
    const out = await sharp(buf)
      .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();

    fs.writeFileSync(dest, out);
    fetched++;
    console.log(`fetched  ${gift.slug}  ${(buf.length / 1024).toFixed(0)}kb -> ${(out.length / 1024).toFixed(0)}kb`);
  } catch (err) {
    failed++;
    console.log(`ERROR    ${gift.slug}  ${err.message}`);
  }
}

console.log(`\n${fetched} fetched, ${kept} already present, ${manual} known-blocked, ${failed} failed`);

// Report by what is actually on disk, not by what we expected to work —
// retailers change their minds about bot traffic, and this list is what the
// couple works from.
const missing = GIFTS.filter((g) => !fs.existsSync(path.join(OUT_DIR, `${g.slug}.jpg`)));
if (missing.length) {
  console.log(`\n${missing.length} still need a picture. Open the link, save the main product`);
  console.log(`image, and drop it in ${OUT_DIR}/ under exactly this name:\n`);
  for (const g of missing) console.log(`  ${g.slug}.jpg\n      ${g.title} — ${g.url}\n`);
} else {
  console.log("\nEvery gift has an image.");
}
