"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { recordContribution } from "@/app/actions/fund";
import { money, parseAmount, payLink, type PublicNote } from "@/lib/fund";
import type { FundView } from "@/lib/fund-data";

/**
 * One ask, no goals, no progress bar.
 *
 * An earlier version split the trip into five pieces with targets and bars.
 * Both were wrong: a target caps how much feels appropriate to give, and five
 * bars reading $0 said "nobody has given" rather than "help us get there". The
 * notes underneath carry the social proof now, and they only improve with time.
 */
export default function FundSection({
  fund,
  token,
}: {
  fund: FundView;
  token: string | null;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState<PublicNote[]>(fund.notes);

  // A typed amount always wins over a tapped chip — it's the more recent intent.
  const typed = parseAmount(custom);
  const cents = custom.trim() ? (typed.ok ? typed.cents : 0) : (selected ?? 0);
  const href = payLink(fund.payLink, cents);

  function confirm() {
    setError(null);
    startTransition(async () => {
      const res = await recordContribution({
        amount: custom.trim() || String((selected ?? 0) / 100),
        token,
        name,
        message,
      });
      if (res.ok) {
        setDone(true);
        if (message.trim()) {
          setNotes((n) => [
            { id: "just-now", name: name.trim() || "You", message: message.trim() },
            ...n,
          ]);
        }
      } else {
        setError(res.error ?? "That didn't work.");
      }
    });
  }

  const chip =
    "rounded-full px-5 py-2.5 text-sm font-medium transition-colors border";

  return (
    <section className="mt-24">
      <h2 className="font-display text-center text-3xl font-light italic sm:text-4xl">
        {fund.heading}
      </h2>
      {fund.blurb && (
        <p className="mx-auto mt-4 max-w-xl text-center text-ink-dim">{fund.blurb}</p>
      )}

      <div className="mx-auto mt-10 max-w-lg rounded-[28px] border border-white/70 bg-gradient-to-b from-white/92 to-white/70 p-7 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_28px_60px_-30px_rgba(107,79,150,0.5)] backdrop-blur-md sm:p-8">
        {done ? (
          <div className="py-6 text-center">
            <p className="font-display text-2xl italic text-[#6b4f96]">Thank you</p>
            <p className="mt-3 text-sm text-ink-dim">
              That means a great deal to us both.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap justify-center gap-2.5">
              {fund.amounts.map((amount) => {
                const active = !custom.trim() && selected === amount;
                return (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => {
                      setSelected(amount);
                      setCustom("");
                    }}
                    className={`${chip} ${
                      active
                        ? "border-transparent bg-gradient-to-r from-[#6b4f96] to-[#8a6db1] text-white shadow-sm"
                        : "border-[#e0d4f0] bg-white text-[#6b4f96] hover:bg-[#f4eefb]"
                    }`}
                  >
                    {money(amount)}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 focus-within:border-[#8a6db1]">
              <span className="text-lg text-ink-dim">$</span>
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                inputMode="decimal"
                placeholder="Any amount you like"
                aria-label="Any amount you like"
                className="w-full bg-transparent text-base outline-none"
              />
            </div>

            {!token && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="mt-3 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-[#8a6db1]"
              />
            )}

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={400}
              placeholder="Leave us a note — we'd love this bit"
              className="mt-3 w-full resize-none rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-[#8a6db1]"
            />

            <a
              href={href ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={cents <= 0}
              onClick={(e) => {
                if (cents <= 0) e.preventDefault();
              }}
              className={`mt-5 block rounded-full px-6 py-4 text-center text-base font-medium text-white transition-[filter,transform] ${
                cents > 0
                  ? "bg-gradient-to-r from-[#6b4f96] to-[#8a6db1] shadow-sm hover:brightness-110 active:scale-[0.99]"
                  : "pointer-events-none bg-[#c9bcdd]"
              }`}
            >
              {cents > 0 ? `Donate ${money(cents)} with PayPal` : "Choose an amount"}
            </a>

            <button
              type="button"
              onClick={confirm}
              disabled={pending || cents <= 0}
              className="mt-2.5 w-full rounded-full border border-[#e0d4f0] bg-white px-6 py-3 text-sm font-medium text-[#6b4f96] transition-colors hover:bg-[#f4eefb] disabled:opacity-50"
            >
              {pending ? "One moment…" : "I've sent it"}
            </button>

            {error && (
              <p role="status" className="mt-3 text-center text-xs text-[#a8425f]">
                {error}
              </p>
            )}

            <p className="mt-4 text-center text-[11px] leading-relaxed text-ink-dim">
              PayPal opens with the amount filled in and will show{" "}
              <span className="text-ink">Robert Vanliew</span> — that&rsquo;s us, it&rsquo;s the
              right place. Send it there first, then tap &ldquo;I&rsquo;ve sent it&rdquo;.
            </p>
          </>
        )}
      </div>

      {notes.length > 0 && (
        <div className="mx-auto mt-14 max-w-2xl">
          <div className="mx-auto mb-8 h-px w-40 bg-gradient-to-r from-transparent via-line to-transparent" />
          <ul className="space-y-6">
            <AnimatePresence initial={false}>
              {notes.map((note) => (
                <motion.li
                  key={note.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="text-center"
                >
                  <p className="font-display text-lg italic leading-relaxed text-ink">
                    &ldquo;{note.message}&rdquo;
                  </p>
                  <p className="mt-1.5 text-xs tracking-[0.14em] text-ink-dim uppercase">
                    {note.name}
                  </p>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      )}

      <p className="mx-auto mt-12 max-w-xl text-center text-xs text-ink-dim">
        Donations go straight to Julie &amp; Robert through PayPal &mdash; nothing is taken by this
        page.
      </p>
    </section>
  );
}
