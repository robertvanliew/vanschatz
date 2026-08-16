# Gift registry — design

**Status:** approved 2026-08-11

Julie & Robert have a list of twelve gifts spread across seven retailers. They
want them on the site, presented like the product cards a modern AI assistant
returns for a shopping question — clean product shot, title, price, retailer,
a buy action — while the site's own cream-and-wisteria styling stays untouched.
Guests must be able to say "I'm getting this" so nobody buys a duplicate.

## Decisions

**No money changes hands on the site.** Every gift links out to its retailer.
Building checkout would mean handling payments, fees, refunds and tax for goods
the couple would then have to buy themselves. Rejected group-gifting via Stripe
and a Venmo-style cash link; both can be added later without disturbing this.

**Gift data is stored, not scraped.** Every retailer was probed:

| Retailer | Title | Image | Price |
|---|---|---|---|
| Amazon (5 items) | from `og:` meta | yes — CDN path derived from the ASIN | no |
| Bissell | yes | yes | no |
| Mulberry Park (Shopify) | yes | yes — `og:image` | no |
| Best Buy | no | yes — CDN path derived from the SKU | no |
| West Elm | no — blocks automation | no | no |
| The Knot (2 items) | no — HTTP 403 | no | no |
| Le Creuset | no — 212-byte bot block | no | no |

No retailer exposes a price reliably, and prices drift constantly, so prices are
entered once and displayed as approximate. Live scraping at request time would
be slow and would break; the database is the source of truth.

Ten images are fetched and committed by a script. Two — West Elm and Le Creuset
— are supplied by hand. A gift with no image renders a typographic placeholder,
so a missing image never looks broken.

**Amendment, 2026-08-16.** The two The Knot items were moved to equivalent
Amazon listings (Mikasa Cheers wine glasses; Made In 8 qt stock pot, which has
the pasta insert the note asked for). The Knot is itself a registry service, so
"View at The Knot" sent guests into another registry rather than a shop, and its
images could not be fetched. Amazon exposes two image sources with opposite
failure modes: the legacy catalogue path is always the right product but is
sometimes only 500px, while the mobile gallery is full resolution but can lead
with a marketing infographic. The fetcher prefers legacy when it is at least
700px wide and falls back to mobile — and downloaded images must still be looked
at before committing.

**Claiming is identified by the invite token.** Guests arriving from their
personal link are already known, so claiming is one tap with nothing to type.
Other guests see only "Taken", never by whom; the couple sees who, for
thank-you notes.

**No duplicate purchases is a database guarantee.** One claim row per gift,
enforced by a unique constraint — not by hiding a button. Simultaneous taps
resolve to one winner; the loser is told the gift was just claimed.

## Routes

```
/                            home            ]  both render InvitePage; both
/invite/<token>              personal invite ]  show the Gifts teaser section

/registry                    full grid — browse and buy, claiming disabled
/invite/<token>/registry     full grid — browse, buy and claim
```

`page.tsx` already renders `InvitePage` with no guest, so the home page and a
personal invite are the same component. The Gifts section therefore appears in
both, and a token-less path has to exist regardless — hence the public
`/registry`, which doubles as an address that can be said out loud. Both routes
render one `GiftGrid`; the token route passes a guest, the public one does not.

## Data

```
Gift       slug, title, retailer, url, imagePath?, priceCents?, note?,
           sortOrder, active, createdAt
GiftClaim  giftId (unique), guestId?, claimedName?, claimedAt
```

`active` hides a gift without deleting it and losing its claim history.
`imagePath` is a repo-relative path for seeded gifts; gifts added later via
admin store an absolute image URL in the same field, distinguished by a leading
`/`. Vercel's filesystem is read-only at runtime, so the admin form cannot
accept an uploaded file — it takes an image link.

Deliberately omitted: quantity (each gift is claimed once) and gift categories
(twelve items do not need grouping). Both are additive later.

## Behaviour

The grid filters by All / Still available / Already taken, with a count. Cards
lift on hover and images fade in as they load. Claiming updates the card
immediately and confirms with the server behind it; a failure rolls the card
back and explains why. A guest's own claim offers Undo. Only the claim holder
may undo, which is checked on the server, not just hidden in the interface.

## Testing

`src/lib/registry.ts` holds the rules as pure functions — who may claim, what a
double-claim does, who may undo, price formatting, filtering — tested with the
existing vitest setup. Server actions are thin wrappers over them. The existing
26 tests must stay green.

## Build order

1. Fetch product data and images; commit `public/registry/`
2. Schema + migration
3. `lib/registry.ts` + tests
4. Server actions
5. `GiftCard` / `GiftGrid` / `ClaimButton`
6. The two routes, and the Gifts teaser in `Sections.tsx`
7. Admin gift management
8. Verify locally, then deploy
