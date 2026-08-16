/**
 * The registry, as Julie & Robert sent it. Single source of truth for both the
 * image fetcher and the database seed.
 *
 * `title` is a clean, human name rather than the retailer's keyword-stuffed one
 * ("McCook Knife Set Kitchen Steel Knife Block Set w Built-in Sharpener |
 * German Forged Stainless Steel,15 PC,Razor Sharp..."), which reads badly on a
 * wedding registry. `url` is the canonical product page with tracking params
 * stripped.
 *
 * `priceCents` is only set where a price was actually verified from the
 * retailer. Prices are not guessed — a wrong price shown to a guest is worse
 * than no price — so the rest are filled in from the admin page.
 *
 * `source` tells the image fetcher how to reach the product shot; omitting it
 * means the retailer blocks automation and the image is supplied by hand.
 */
export const GIFTS = [
  {
    slug: "ninja-possiblecooker-pro",
    title: "Ninja PossibleCooker PRO",
    note: "14-in-1, 8.5 qt, sea salt grey",
    retailer: "Amazon",
    url: "https://www.amazon.com/dp/B0B4PPHG8G",
    source: { kind: "amazon", asin: "B0B4PPHG8G" },
  },
  {
    slug: "crockpot-cook-and-carry",
    title: "Crock-Pot Cook & Carry Slow Cooker",
    note: "6 qt, programmable, stainless steel",
    retailer: "Amazon",
    url: "https://www.amazon.com/dp/B004P2NG0K",
    source: { kind: "amazon", asin: "B004P2NG0K" },
  },
  {
    slug: "stoneware-dinnerware-set",
    title: "Straight-Sided Stoneware Dinnerware",
    note: "20-piece set, service for four",
    retailer: "West Elm",
    url: "https://www.westelm.com/products/straight-sided-stoneware-dinnerware-set-of-20-e3510/?sku=3181290",
  },
  {
    // Originally a The Knot registry-store link. Moved to the equivalent Amazon
    // listing so guests reach an ordinary shop rather than another registry —
    // and so the product photo can be fetched.
    slug: "white-wine-glasses",
    title: "Mikasa Cheers White Wine Glasses",
    note: "Set of four, 16 oz",
    retailer: "Amazon",
    url: "https://www.amazon.com/dp/B0009P5Z24",
    source: { kind: "amazon", asin: "B0009P5Z24" },
  },
  {
    slug: "mccook-knife-block-set",
    title: "McCook 15-Piece Knife Block Set",
    note: "German stainless steel, built-in sharpener",
    retailer: "Amazon",
    url: "https://www.amazon.com/dp/B09G6QX21B",
    source: { kind: "amazon", asin: "B09G6QX21B" },
  },
  {
    slug: "le-creuset-roaster",
    title: "Le Creuset Signature Rectangular Roaster",
    note: "5¼ qt",
    retailer: "Le Creuset",
    url: "https://www.lecreuset.com/signature-roaster/20184US.html",
  },
  {
    slug: "vegetable-chopper",
    title: "Vegetable Chopper & Dicer",
    note: "Stainless steel, with container",
    retailer: "Amazon",
    url: "https://www.amazon.com/dp/B0DCW9RNK1",
    source: { kind: "amazon", asin: "B0DCW9RNK1" },
  },
  {
    slug: "bissell-powerfresh-steam-mop",
    title: "Bissell PowerFresh Steam Mop",
    note: "Scrubbing and sanitising",
    retailer: "Bissell",
    url: "https://www.bissell.com/en-us/product/powerfresh-scrubbing-sanitizing-steam-mop-19405.html",
    source: { kind: "cdnScan", pattern: "https://www\\.bissell\\.com/dw/image[^\"' ]*19405_01Hero[^\"' ]*" },
  },
  {
    slug: "mulberry-silk-pillowcase",
    title: "Mulberry Silk Pillowcase",
    note: "22 momme, taupe",
    retailer: "Mulberry Park Silks",
    url: "https://mulberryparksilks.com/collections/silk-pillowcases/products/22-momme-silk-pillowcase-taupe",
    priceCents: 6699, // verified from the product page
    source: { kind: "ogImage" },
  },
  {
    slug: "shark-cordless-stick-vacuum",
    title: "Shark Pet Cordless Stick Vacuum",
    note: "XL dust cup, LED headlights, blue iris",
    retailer: "Best Buy",
    url: "https://www.bestbuy.com/product/shark-pet-cordless-stick-vacuum-with-xl-dust-cup-led-headlights-up-to-40-min-runtime-blue-iris/JXJVXGKZ5P",
    source: { kind: "bestbuy", sku: "6359269" },
  },
  {
    // Also moved off The Knot. This one carries a strainer insert, which suits
    // the "for pasta" note better than the original did.
    slug: "classic-stockpot",
    title: "Made In 8 qt Stock Pot with Pasta Insert",
    note: "5-ply stainless clad, with lid",
    retailer: "Amazon",
    url: "https://www.amazon.com/dp/B0CF2NBX28",
    source: { kind: "amazon", asin: "B0CF2NBX28" },
  },
  {
    slug: "folding-patio-dining-set",
    title: "Folding Patio Dining Set with Umbrella",
    note: "Glass table, four chairs, all weather",
    retailer: "Amazon",
    url: "https://www.amazon.com/dp/B0FNQGKH7Z",
    source: { kind: "amazon", asin: "B0FNQGKH7Z" },
  },
];
