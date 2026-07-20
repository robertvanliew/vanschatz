"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { submitRsvp } from "@/app/actions/rsvp";
import { MAX_PARTY_SIZE } from "@/lib/rsvp";
import type { InviteGuest } from "@/components/InvitePage";

export default function RsvpCard({ guest }: { guest: InviteGuest }) {
  const [attending, setAttending] = useState<boolean | null>(
    guest.rsvpStatus === "YES" ? true : guest.rsvpStatus === "NO" ? false : null
  );
  const [partySize, setPartySize] = useState(Math.max(1, guest.partySize));
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(nextAttending: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await submitRsvp(guest.token, {
        attending: nextAttending,
        partySize: nextAttending ? partySize : 0,
      });
      if (res.ok) setDone(true);
      else setError(res.error ?? "Something went wrong — please try again.");
    });
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.15 }}
              className="font-display aurora-text mx-auto text-6xl"
            >
              ✦
            </motion.div>
            <p className="font-display mt-4 text-2xl italic">
              {attending ? "We can't wait to celebrate with you!" : "You'll be missed — thank you for letting us know."}
            </p>
            <button
              onClick={() => setDone(false)}
              className="mt-6 text-sm uppercase tracking-[0.2em] text-ink-dim underline-offset-4 hover:underline"
            >
              Change response
            </button>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="text-center text-ink-dim">
              {guest.rsvpStatus === "PENDING"
                ? `${guest.name}, will you join us?`
                : `${guest.name}, you can update your response anytime.`}
            </p>
            <div className="mt-6 grid gap-4">
              <button
                onClick={() => setAttending(true)}
                className={`min-h-14 rounded-2xl border px-6 py-4 text-lg transition ${
                  attending === true
                    ? "border-transparent bg-gradient-to-r from-[#7c6cf0] to-[#47c3ff] text-white"
                    : "border-white/20 hover:bg-white/10"
                }`}
              >
                Yes, I&apos;ll be there ✨
              </button>
              <button
                onClick={() => setAttending(false)}
                className={`min-h-14 rounded-2xl border px-6 py-4 text-lg transition ${
                  attending === false
                    ? "border-transparent bg-white/20 text-white"
                    : "border-white/20 hover:bg-white/10"
                }`}
              >
                Sorry, can&apos;t make it
              </button>
            </div>
            <AnimatePresence>
              {attending === true && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-6 flex items-center justify-center gap-6">
                    <button
                      aria-label="Fewer people"
                      onClick={() => setPartySize((n) => Math.max(1, n - 1))}
                      className="h-12 w-12 rounded-full border border-white/20 text-2xl hover:bg-white/10"
                    >
                      −
                    </button>
                    <div className="text-center">
                      <div className="font-display text-4xl">{partySize}</div>
                      <div className="text-[10px] uppercase tracking-[0.25em] text-ink-dim">
                        {partySize === 1 ? "guest" : "guests"} total
                      </div>
                    </div>
                    <button
                      aria-label="More people"
                      onClick={() => setPartySize((n) => Math.min(MAX_PARTY_SIZE, n + 1))}
                      className="h-12 w-12 rounded-full border border-white/20 text-2xl hover:bg-white/10"
                    >
                      +
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {attending !== null && (
              <button
                onClick={() => submit(attending)}
                disabled={pending}
                className="mt-8 min-h-14 w-full rounded-2xl bg-gradient-to-r from-[#7c6cf0] via-[#47c3ff] to-[#ff7ad9] px-6 py-4 text-lg font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {pending ? "Sending…" : "Send RSVP"}
              </button>
            )}
            {error && <p className="mt-4 text-center text-sm text-red-300">{error}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
