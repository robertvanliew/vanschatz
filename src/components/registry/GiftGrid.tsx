"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import GiftCard from "./GiftCard";
import {
  claimGift,
  claimGiftByName,
  revealShippingForClaim,
  setDelivery,
  setDeliveryByClaimId,
  unclaimGift,
  type ClaimResult,
  unclaimGiftByClaimId,
} from "@/app/actions/registry";
import type { Delivery, Shipping } from "@/lib/shipping";
import {
  myClaimsServerSnapshot,
  myClaimsSnapshot,
  parseMyClaims,
  rememberClaim,
  subscribeMyClaims,
} from "@/lib/my-claims";
import {
  claimSummary,
  filterGifts,
  isClaimed,
  isClaimedByMe,
  type GiftFilter,
  type GiftView,
} from "@/lib/registry";

const FILTERS: { key: GiftFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "available", label: "Still available" },
  { key: "taken", label: "Already taken" },
];

export default function GiftGrid({
  gifts,
  guestId,
  token,
  shipping,
}: {
  gifts: GiftView[];
  /** Null on the public /registry — browsing works, claiming does not. */
  guestId: string | null;
  token: string | null;
  /** Null on the public registry, where the address is never sent. */
  shipping: Shipping | null;
}) {
  const [filter, setFilter] = useState<GiftFilter>("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [, startTransition] = useTransition();

  /**
   * Claims applied locally the moment they're tapped, so the card responds
   * immediately. The server is the authority — a rejection rolls this back and
   * says why, rather than leaving a guest believing they claimed something.
   */
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});

  /** Delivery choices made this visit, shown before the server round-trip lands. */
  const [chosen, setChosen] = useState<Record<string, Delivery>>({});

  /**
   * The address, for someone who claimed without an invite link. It is not part
   * of the public page; the server hands it over only against a real claim.
   */
  const [revealed, setRevealed] = useState<Shipping | null>(null);

  // Claims made from this browser without an invite link. Read through an
  // external store so it renders correctly on the first paint.
  const myClaims = parseMyClaims(
    useSyncExternalStore(subscribeMyClaims, myClaimsSnapshot, myClaimsServerSnapshot)
  );

  function claimNamed(giftId: string, name: string) {
    setPendingId(giftId);
    setErrors((e) => ({ ...e, [giftId]: "" }));
    startTransition(async () => {
      const result = await claimGiftByName(giftId, name);
      if (result.ok && result.claimId) {
        rememberClaim(giftId, result.claimId);
        setOptimistic((o) => ({ ...o, [giftId]: true }));
      } else {
        setErrors((e) => ({ ...e, [giftId]: result.error ?? "That didn't work." }));
      }
      setPendingId(null);
    });
  }

  function releaseNamed(giftId: string) {
    const claimId = myClaims[giftId];
    if (!claimId) return;
    setPendingId(giftId);
    startTransition(async () => {
      const result = await unclaimGiftByClaimId(giftId, claimId);
      if (result.ok) {
        rememberClaim(giftId, null);
        setOptimistic((o) => {
          const next = { ...o };
          delete next[giftId];
          return next;
        });
      } else {
        setErrors((e) => ({ ...e, [giftId]: result.error ?? "That didn't work." }));
      }
      setPendingId(null);
    });
  }

  const view = useMemo(
    () =>
      gifts.map((g) => {
        const override = optimistic[g.id];
        let claim = g.claim;
        if (override !== undefined) {
          claim = override
            ? { guestId, claimedName: null, delivery: g.claim?.delivery ?? null }
            : null;
        }
        if (claim && chosen[g.id]) claim = { ...claim, delivery: chosen[g.id] };
        return { ...g, claim } satisfies GiftView;
      }),
    [gifts, optimistic, guestId, chosen]
  );

  const shown = filterGifts(view, filter);
  const summary = claimSummary(view);

  function run(giftId: string, claiming: boolean) {
    if (!token) return;
    setPendingId(giftId);
    setErrors((e) => ({ ...e, [giftId]: "" }));
    setOptimistic((o) => ({ ...o, [giftId]: claiming }));

    startTransition(async () => {
      const result = claiming
        ? await claimGift(token, giftId)
        : await unclaimGift(token, giftId);

      if (!result.ok) {
        // Roll back to the server's version of reality.
        setOptimistic((o) => {
          const next = { ...o };
          delete next[giftId];
          return next;
        });
        setErrors((e) => ({ ...e, [giftId]: result.error ?? "That didn't work." }));
      }
      setPendingId(null);
    });
  }

  function chooseDelivery(giftId: string, choice: Delivery) {
    // Without an invite link the claim is identified by the id this browser
    // kept when it claimed. An early `if (!token) return` here once made both
    // buttons silently do nothing for everyone on the public registry.
    const claimId = myClaims[giftId];
    if (!token && !claimId) return;

    const previous = chosen[giftId];
    setChosen((c) => ({ ...c, [giftId]: choice }));
    setPendingId(giftId);
    setErrors((e) => ({ ...e, [giftId]: "" }));
    startTransition(async () => {
      const result: ClaimResult & { shipping?: Shipping | null } = token
        ? await setDelivery(token, giftId, choice)
        : await setDeliveryByClaimId(giftId, claimId, choice);
      if (result.ok) {
        if (result.shipping) setRevealed(result.shipping);
      } else {
        setChosen((c) => {
          const next = { ...c };
          if (previous) next[giftId] = previous;
          else delete next[giftId];
          return next;
        });
        setErrors((e) => ({ ...e, [giftId]: result.error ?? "That didn't work." }));
      }
      setPendingId(null);
    });
  }

  function reveal(giftId: string) {
    const claimId = myClaims[giftId];
    if (!claimId) return;
    setPendingId(giftId);
    startTransition(async () => {
      const result = await revealShippingForClaim(giftId, claimId);
      if (result.ok && result.shipping) {
        setRevealed(result.shipping);
      } else {
        const message = result.ok
          ? "The address hasn't been added yet. Please get in touch with us."
          : result.error ?? "That didn't work.";
        setErrors((e) => ({ ...e, [giftId]: message }));
      }
      setPendingId(null);
    });
  }

  return (
    <div>
      <div className="mb-8 flex flex-col items-center gap-4">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                aria-pressed={active}
                className={`relative rounded-full px-4 py-2 text-sm transition-colors ${
                  active ? "text-white" : "text-ink-dim hover:text-ink"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="registry-filter-pill"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-[#6b4f96] to-[#8a6db1]"
                  />
                )}
                <span className="relative">{f.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-sm text-ink-dim">
          {summary.total} {summary.total === 1 ? "gift" : "gifts"} &middot;{" "}
          {summary.claimed} claimed
        </p>
      </div>

      <motion.ul layout className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {shown.map((gift) => (
            <GiftCard
              key={gift.id}
              gift={gift}
              claimed={isClaimed(gift)}
              mine={isClaimedByMe(gift, guestId) || Boolean(myClaims[gift.id])}
              canClaim={Boolean(token)}
              pending={pendingId === gift.id}
              error={errors[gift.id] || null}
              shipping={shipping ?? revealed}
              onReveal={!token && myClaims[gift.id] ? () => reveal(gift.id) : undefined}
              onClaim={() => run(gift.id, true)}
              onUnclaim={() =>
                token ? run(gift.id, false) : releaseNamed(gift.id)
              }
              onClaimNamed={(name) => claimNamed(gift.id, name)}
              onDelivery={(choice) => chooseDelivery(gift.id, choice)}
            />
          ))}
        </AnimatePresence>
      </motion.ul>

      {shown.length === 0 && (
        <p className="py-16 text-center text-ink-dim">
          {filter === "taken"
            ? "Nothing has been claimed yet."
            : "Every gift has been claimed — thank you, all of you."}
        </p>
      )}
    </div>
  );
}
