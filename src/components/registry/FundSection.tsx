"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { recordContribution } from "@/app/actions/fund";
import { fundTotals, money, payLink, progress, type TileView } from "@/lib/fund";
import type { FundView } from "@/lib/fund-data";

function Bar({ percent, tall = false }: { percent: number; tall?: boolean }) {
  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-[#eee7f5] ${tall ? "h-2.5" : "h-1.5"}`}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="h-full rounded-full bg-gradient-to-r from-[#6b4f96] to-[#8a6db1]"
      />
    </div>
  );
}

function TileCard({
  tile,
  link,
  token,
  onGiven,
}: {
  tile: TileView;
  link: string | null;
  token: string | null;
  onGiven: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const p = progress(tile.raisedCents, tile.targetCents);
  const chosenCents = Math.round(Number((amount || "").replace(/[$,\s]/g, "")) * 100) || 0;
  const href = payLink(link, chosenCents);

  function confirm() {
    setError(null);
    startTransition(async () => {
      const res = await recordContribution({
        tileId: tile.id,
        amount,
        token,
        name,
        message,
      });
      if (res.ok) {
        setSent(true);
        onGiven();
      } else {
        setError(res.error ?? "That didn't work.");
      }
    });
  }

  return (
    <li className="flex h-full flex-col rounded-[24px] border border-white/70 bg-gradient-to-b from-white/92 to-white/70 p-5 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_18px_44px_-26px_rgba(107,79,150,0.5)] backdrop-blur-md">
      <h3 className="font-display text-xl leading-snug">{tile.title}</h3>
      {tile.note && <p className="mt-1 text-sm text-ink-dim">{tile.note}</p>}

      <div className="mt-4">
        <Bar percent={p.percent} />
        <p className="mt-2 text-xs text-ink-dim">
          {p.fullyFunded ? (
            <span className="text-[#5f7554]">Fully funded — thank you</span>
          ) : (
            <>
              {money(p.raisedCents)} of {money(p.targetCents)}
            </>
          )}
        </p>
      </div>

      <div className="mt-auto pt-4">
        {sent ? (
          <p className="rounded-full bg-[#eef4e7] px-4 py-2.5 text-center text-sm text-[#5f7554]">
            Thank you — noted
          </p>
        ) : !open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="w-full rounded-full bg-gradient-to-r from-[#6b4f96] to-[#8a6db1] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-[filter,transform] hover:brightness-110 active:scale-[0.98]"
          >
            Give this
          </button>
        ) : (
          <div className="rounded-2xl bg-[#faf8f4] p-3">
            <div className="flex flex-wrap gap-2">
              {tile.suggested.map((cents) => (
                <button
                  key={cents}
                  type="button"
                  onClick={() => setAmount(String(cents / 100))}
                  className={`flex-1 rounded-full px-3 py-2 text-xs font-medium transition-colors ${
                    chosenCents === cents
                      ? "bg-gradient-to-r from-[#6b4f96] to-[#8a6db1] text-white"
                      : "border border-[#e0d4f0] bg-white text-[#6b4f96] hover:bg-[#f4eefb]"
                  }`}
                >
                  {money(cents)}
                </button>
              ))}
            </div>

            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="Or another amount"
              className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-[#8a6db1]"
            />

            {!token && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-[#8a6db1]"
              />
            )}

            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="A note (optional)"
              className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-[#8a6db1]"
            />

            {href && chosenCents > 0 && (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block rounded-full bg-[#0070ba] px-4 py-2.5 text-center text-sm font-medium text-white transition-[filter] hover:brightness-110"
              >
                Donate {money(chosenCents)} with PayPal
              </a>
            )}

            <button
              type="button"
              onClick={confirm}
              disabled={pending || chosenCents <= 0}
              className="mt-2 w-full rounded-full border border-[#e0d4f0] bg-white px-4 py-2.5 text-sm font-medium text-[#6b4f96] transition-colors hover:bg-[#f4eefb] disabled:opacity-50"
            >
              {pending ? "One moment…" : "I've sent this"}
            </button>

            {error && <p className="mt-2 text-center text-xs text-[#a8425f]">{error}</p>}
            <p className="mt-2 text-center text-[11px] leading-relaxed text-ink-dim">
              PayPal opens with the amount filled in and will show{" "}
              <span className="text-ink">Robert Vanliew</span> &mdash; that&rsquo;s us, it&rsquo;s
              the right place. Send it there first, then tap &ldquo;I&rsquo;ve sent this&rdquo; so
              the bar knows.
            </p>
          </div>
        )}
      </div>
    </li>
  );
}

export default function FundSection({
  fund,
  token,
}: {
  fund: FundView;
  token: string | null;
}) {
  // Bump to re-mount bars after a contribution so they animate to the new total.
  const [, setGiven] = useState(0);
  const totals = fundTotals(fund.tiles);

  return (
    <section className="mt-24">
      <h2 className="font-display text-center text-3xl font-light italic sm:text-4xl">
        {fund.heading}
      </h2>
      {fund.blurb && (
        <p className="mx-auto mt-4 max-w-xl text-center text-ink-dim">{fund.blurb}</p>
      )}

      <div className="mx-auto mt-8 max-w-xl">
        <Bar percent={totals.percent} tall />
        <p className="mt-2 text-center text-sm text-ink-dim">
          {money(totals.raisedCents)} of {money(totals.targetCents)}
        </p>
      </div>

      <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {fund.tiles.map((tile) => (
          <TileCard
            key={tile.id}
            tile={tile}
            link={fund.payLink}
            token={token}
            onGiven={() => setGiven((n) => n + 1)}
          />
        ))}
      </ul>

      <p className="mx-auto mt-10 max-w-xl text-center text-xs text-ink-dim">
        Donations go straight to Julie &amp; Robert through PayPal &mdash; nothing is taken by this
        page.
      </p>
    </section>
  );
}
