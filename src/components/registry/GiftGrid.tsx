"use client";

import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import GiftCard from "./GiftCard";
import { claimGift, unclaimGift } from "@/app/actions/registry";
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
}: {
  gifts: GiftView[];
  /** Null on the public /registry — browsing works, claiming does not. */
  guestId: string | null;
  token: string | null;
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

  const view = useMemo(
    () =>
      gifts.map((g) => {
        const override = optimistic[g.id];
        if (override === undefined) return g;
        return {
          ...g,
          claim: override ? { guestId, claimedName: null } : null,
        } satisfies GiftView;
      }),
    [gifts, optimistic, guestId]
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
              mine={isClaimedByMe(gift, guestId)}
              canClaim={Boolean(token)}
              pending={pendingId === gift.id}
              error={errors[gift.id] || null}
              onClaim={() => run(gift.id, true)}
              onUnclaim={() => run(gift.id, false)}
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
