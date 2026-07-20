"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { submitRsvp } from "@/app/actions/rsvp";
import { MAX_PARTY_SIZE } from "@/lib/rsvp";
import type { InviteGuest } from "@/components/InvitePage";

function Stepper({
  label,
  value,
  onDec,
  onInc,
}: {
  label: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm tracking-[0.2em] text-ink-dim uppercase">{label}</span>
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label={`Fewer ${label.toLowerCase()}`}
          onClick={onDec}
          className="h-11 w-11 cursor-pointer rounded-full border border-[#c9b8e0] text-2xl transition-colors duration-200 hover:bg-[#f0eaf7]"
        >
          −
        </button>
        <span className="font-display w-8 text-center text-3xl tabular-nums">{value}</span>
        <button
          type="button"
          aria-label={`More ${label.toLowerCase()}`}
          onClick={onInc}
          className="h-11 w-11 cursor-pointer rounded-full border border-[#c9b8e0] text-2xl transition-colors duration-200 hover:bg-[#f0eaf7]"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function RsvpCard({ guest }: { guest: InviteGuest }) {
  const [attending, setAttending] = useState<boolean | null>(
    guest.rsvpStatus === "YES" ? true : guest.rsvpStatus === "NO" ? false : null
  );
  const [adults, setAdults] = useState(Math.max(1, guest.adults));
  const [children, setChildren] = useState(Math.max(0, guest.children));
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const total = adults + children;

  function submit(nextAttending: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await submitRsvp(guest.token, {
        attending: nextAttending,
        adults: nextAttending ? adults : 0,
        children: nextAttending ? children : 0,
      });
      if (res.ok) setDone(true);
      else setError(res.error ?? "Something went wrong — please try again.");
    });
  }

  return (
    <div className="rounded-3xl border border-line bg-white/70 p-8 shadow-[0_16px_40px_-24px_rgba(107,79,150,0.35)] backdrop-blur-sm">
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
              ❀
            </motion.div>
            <p className="font-display mt-4 text-2xl italic">
              {attending ? "We can't wait to celebrate with you!" : "You'll be missed — thank you for letting us know."}
            </p>
            <button
              onClick={() => setDone(false)}
              className="mt-6 cursor-pointer text-sm tracking-[0.2em] text-ink-dim uppercase underline-offset-4 hover:underline"
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
                className={`min-h-14 cursor-pointer rounded-2xl border px-6 py-4 text-lg transition-colors duration-200 ${
                  attending === true
                    ? "border-transparent bg-gradient-to-r from-[#6b4f96] to-[#8a6db1] text-white"
                    : "border-[#c9b8e0] hover:bg-[#f0eaf7]"
                }`}
              >
                Yes, I&apos;ll be there ❀
              </button>
              <button
                onClick={() => setAttending(false)}
                className={`min-h-14 cursor-pointer rounded-2xl border px-6 py-4 text-lg transition-colors duration-200 ${
                  attending === false
                    ? "border-transparent bg-[#6d6582] text-white"
                    : "border-[#c9b8e0] hover:bg-[#f0eaf7]"
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
                  <div className="mt-6 space-y-4 rounded-2xl border border-line/70 p-5">
                    <p className="text-center text-sm text-ink-dim">How many will be in your party?</p>
                    <Stepper
                      label="Adults"
                      value={adults}
                      onDec={() => setAdults((n) => Math.max(1, n - 1))}
                      onInc={() => total < MAX_PARTY_SIZE && setAdults((n) => n + 1)}
                    />
                    <Stepper
                      label="Children"
                      value={children}
                      onDec={() => setChildren((n) => Math.max(0, n - 1))}
                      onInc={() => total < MAX_PARTY_SIZE && setChildren((n) => n + 1)}
                    />
                    <p className="text-center text-[10px] tracking-[0.25em] text-ink-dim uppercase">
                      {total} {total === 1 ? "guest" : "guests"} total
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {attending !== null && (
              <button
                onClick={() => submit(attending)}
                disabled={pending}
                className="mt-8 min-h-14 w-full cursor-pointer rounded-2xl bg-gradient-to-r from-[#6b4f96] via-[#8a6db1] to-[#b98cc0] px-6 py-4 text-lg font-medium text-white transition-opacity duration-200 hover:opacity-90 disabled:opacity-50"
              >
                {pending ? "Sending…" : "Send RSVP"}
              </button>
            )}
            {error && <p className="mt-4 text-center text-sm text-red-700">{error}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
