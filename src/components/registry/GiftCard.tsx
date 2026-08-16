"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { formatPrice, placeholderInitials, type GiftView } from "@/lib/registry";

/**
 * One product card, in the shape people now expect from a shopping result:
 * product shot on white, title, retailer, price, and a buy action.
 *
 * Images are plain <img> rather than next/image on purpose. Seeded gifts are
 * local files, but gifts added later hold an absolute URL typed into the admin
 * form, and pointing Next's optimiser at arbitrary hosts would mean either
 * whitelisting the whole internet in remotePatterns or breaking every gift
 * added after launch.
 */

function ExternalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M14 4h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 4 10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M18 14.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="m5 13 4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function GiftCard({
  gift,
  claimed,
  mine,
  canClaim,
  pending,
  error,
  onClaim,
  onUnclaim,
}: {
  gift: GiftView;
  claimed: boolean;
  mine: boolean;
  /** False on the public registry, where there is no guest to attribute to. */
  canClaim: boolean;
  pending: boolean;
  error: string | null;
  onClaim: () => void;
  onUnclaim: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [broken, setBroken] = useState(false);
  const price = formatPrice(gift.priceCents);
  const showImage = gift.image && !broken;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="group relative flex h-full flex-col overflow-hidden rounded-[24px] border border-white/70 bg-gradient-to-b from-white/92 to-white/70 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_18px_44px_-26px_rgba(107,79,150,0.5)] backdrop-blur-md transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_28px_60px_-28px_rgba(107,79,150,0.62)]"
    >
      {/* Product shot on white, the way a retailer would show it */}
      <div className="relative aspect-square w-full overflow-hidden bg-white">
        {showImage ? (
          <>
            {!loaded && <div className="absolute inset-0 animate-pulse bg-[#f3eee7]" />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={gift.image as string}
              alt={gift.title}
              loading="lazy"
              onLoad={() => setLoaded(true)}
              onError={() => setBroken(true)}
              className={`h-full w-full object-contain p-6 transition-[opacity,transform] duration-500 group-hover:scale-[1.03] ${
                loaded ? "opacity-100" : "opacity-0"
              } ${claimed && !mine ? "opacity-45 saturate-50" : ""}`}
            />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#f6f1fb] to-[#f3eee7]">
            <span className="font-display text-4xl font-light italic text-[#b9a9d2]">
              {placeholderInitials(gift.title)}
            </span>
          </div>
        )}

        {claimed && (
          <div className="absolute left-3 top-3 rounded-full bg-white/92 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[#6b4f96] shadow-sm ring-1 ring-[#e0d4f0]">
            {mine ? "Yours" : "Taken"}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-[11px] uppercase tracking-[0.16em] text-ink-dim/80">{gift.retailer}</p>
        <h3 className="font-display mt-1 text-xl leading-snug">{gift.title}</h3>
        {gift.note && <p className="mt-1 text-sm text-ink-dim">{gift.note}</p>}

        <p className="mt-3 text-sm text-ink-dim">
          {price ? (
            <>
              <span className="text-base font-medium text-ink">{price}</span>
              <span className="ml-1.5 text-xs">approx.</span>
            </>
          ) : (
            <span className="text-xs">See price at {gift.retailer}</span>
          )}
        </p>

        <div className="mt-4 flex flex-col gap-2 pt-1">
          <a
            href={gift.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#e0d4f0] bg-white/80 px-4 py-2.5 text-sm font-medium text-[#6b4f96] transition-colors hover:bg-[#f4eefb]"
          >
            View at {gift.retailer} <ExternalIcon />
          </a>

          {mine ? (
            <button
              type="button"
              onClick={onUnclaim}
              disabled={pending}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#f0eaf7] px-4 py-2.5 text-sm font-medium text-[#6b4f96] transition-colors hover:bg-[#e7dcf5] disabled:opacity-60"
            >
              <CheckIcon /> You&rsquo;re getting this &middot; undo
            </button>
          ) : claimed ? (
            <span className="inline-flex items-center justify-center rounded-full bg-[#f3eee7] px-4 py-2.5 text-sm text-ink-dim">
              Already claimed
            </span>
          ) : canClaim ? (
            <button
              type="button"
              onClick={onClaim}
              disabled={pending}
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#6b4f96] to-[#8a6db1] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-[filter,transform] hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
            >
              {pending ? "Just a moment…" : "I'm getting this"}
            </button>
          ) : (
            <span className="inline-flex items-center justify-center rounded-full bg-[#f3eee7] px-4 py-2.5 text-center text-xs text-ink-dim">
              Open your invitation link to claim
            </span>
          )}
        </div>

        {error && (
          <p role="status" className="mt-2 text-center text-xs text-[#a8425f]">
            {error}
          </p>
        )}
      </div>
    </motion.li>
  );
}
