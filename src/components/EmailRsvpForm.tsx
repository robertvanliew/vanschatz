"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { submitEmailRsvp } from "@/app/actions/email-rsvp";

const MAX = 20;

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
          className="h-10 w-10 cursor-pointer rounded-full border border-[#c9b8e0] text-xl transition-colors duration-200 hover:bg-[#f0eaf7]"
        >
          −
        </button>
        <span className="font-display w-7 text-center text-2xl tabular-nums">{value}</span>
        <button
          type="button"
          aria-label={`More ${label.toLowerCase()}`}
          onClick={onInc}
          className="h-10 w-10 cursor-pointer rounded-full border border-[#c9b8e0] text-xl transition-colors duration-200 hover:bg-[#f0eaf7]"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function EmailRsvpForm() {
  const [open, setOpen] = useState(false);
  const [attending, setAttending] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const total = adults + children;

  function close() {
    setOpen(false);
    // reset after the exit animation
    setTimeout(() => {
      setDone(false);
      setError(null);
      setAttending(null);
      setName("");
      setEmail("");
      setAdults(1);
      setChildren(0);
      setMessage("");
    }, 250);
  }

  function submit() {
    setError(null);
    if (name.trim().length < 2) return setError("Please add your name.");
    if (attending === null) return setError("Please let us know yes or no.");
    startTransition(async () => {
      const res = await submitEmailRsvp({
        name,
        email,
        attending,
        adults: attending ? adults : 0,
        children: attending ? children : 0,
        message,
      });
      if (res.ok) setDone(true);
      else setError(res.error ?? "Something went wrong — please try again.");
    });
  }

  const inputCls =
    "w-full rounded-xl border border-line bg-white px-4 py-3 text-ink outline-none transition-colors focus:border-[#8a6db1]";

  return (
    <>
      <p className="mt-6 text-center text-sm text-ink-dim">
        Prefer to reply by email?{" "}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="cursor-pointer text-gold underline-offset-4 hover:underline"
        >
          Send us your RSVP here
        </button>
      </p>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#332c44]/40 p-4 backdrop-blur-sm"
            onClick={close}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.97 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="my-8 w-full max-w-md rounded-3xl border border-white/70 bg-gradient-to-b from-white to-[#faf7f2] p-8 shadow-[0_30px_70px_-24px_rgba(107,79,150,0.55)]"
            >
              {done ? (
                <div className="text-center">
                  <div className="font-display aurora-text text-6xl">❀</div>
                  <p className="font-display mt-4 text-2xl italic">Thank you!</p>
                  <p className="mt-2 text-ink-dim">
                    Your RSVP has been sent to Julie &amp; Robert. We can&apos;t wait to celebrate with you.
                  </p>
                  <button
                    type="button"
                    onClick={close}
                    className="mt-7 cursor-pointer rounded-full bg-gradient-to-r from-[#6b4f96] to-[#8a6db1] px-7 py-3 text-sm tracking-wider text-white uppercase"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="font-display text-center text-3xl italic">RSVP by email</h3>
                  <p className="mt-2 text-center text-sm text-ink-dim">
                    We&apos;ll send your response straight to Julie &amp; Robert.
                  </p>

                  <div className="mt-6 space-y-4">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className={inputCls}
                    />
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Your email (optional)"
                      type="email"
                      className={inputCls}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setAttending(true)}
                        className={`min-h-12 cursor-pointer rounded-2xl border px-4 py-3 transition-colors duration-200 ${
                          attending === true
                            ? "border-transparent bg-gradient-to-r from-[#6b4f96] to-[#8a6db1] text-white"
                            : "border-[#c9b8e0] hover:bg-[#f0eaf7]"
                        }`}
                      >
                        Joyfully yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setAttending(false)}
                        className={`min-h-12 cursor-pointer rounded-2xl border px-4 py-3 transition-colors duration-200 ${
                          attending === false
                            ? "border-transparent bg-[#6d6582] text-white"
                            : "border-[#c9b8e0] hover:bg-[#f0eaf7]"
                        }`}
                      >
                        Sadly no
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
                          <div className="space-y-3 rounded-2xl border border-line/70 p-4">
                            <Stepper
                              label="Adults"
                              value={adults}
                              onDec={() => setAdults((n) => Math.max(1, n - 1))}
                              onInc={() => total < MAX && setAdults((n) => n + 1)}
                            />
                            <Stepper
                              label="Children"
                              value={children}
                              onDec={() => setChildren((n) => Math.max(0, n - 1))}
                              onInc={() => total < MAX && setChildren((n) => n + 1)}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="A note for the couple (optional)"
                      rows={3}
                      className={`${inputCls} resize-none`}
                    />
                  </div>

                  {error && <p className="mt-4 text-center text-sm text-red-700">{error}</p>}

                  <div className="mt-6 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={close}
                      className="cursor-pointer rounded-full border border-line px-5 py-3 text-sm tracking-wider text-ink-dim uppercase transition-colors hover:bg-[#f3eee7]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={submit}
                      disabled={pending}
                      className="min-w-32 cursor-pointer rounded-full bg-gradient-to-r from-[#6b4f96] via-[#8a6db1] to-[#b98cc0] px-6 py-3 text-sm font-medium tracking-wider text-white uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {pending ? "Sending…" : "Send RSVP"}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
