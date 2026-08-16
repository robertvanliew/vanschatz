"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { WEDDING, mapsUrl, mapsEmbedUrl, mapsDirUrl } from "@/lib/wedding";

function PinIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s6.5-6 6.5-10.5a6.5 6.5 0 1 0-13 0C5.5 15 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10.3" r="2.3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display mb-8 text-center text-4xl font-light italic sm:text-5xl">
      {children}
    </h2>
  );
}

/** Shared premium card surface — inset top highlight + soft deep shadow. */
export const cardClass =
  "rounded-[28px] border border-white/70 bg-gradient-to-b from-white/90 to-white/68 backdrop-blur-md shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_28px_60px_-30px_rgba(107,79,150,0.5)]";

export function WhenWhere() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <Reveal>
        <SectionHeading>When &amp; Where</SectionHeading>
        <div className={`${cardClass} overflow-hidden`}>
          <div className="p-8 text-center sm:p-10">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#f0eaf7] text-[#6b4f96] ring-1 ring-[#e0d4f0]">
              <PinIcon />
            </div>
            <p className="font-display text-3xl">{WEDDING.venueName}</p>
            <p className="mt-2 text-ink-dim">{WEDDING.venueAddress}</p>

            <div className="mx-auto my-7 h-px w-40 bg-gradient-to-r from-transparent via-line to-transparent" />

            <p className="text-lg tracking-wide">{WEDDING.dateLabel}</p>
            <p className="mt-2 font-display text-2xl text-gold">{WEDDING.timeLabel}</p>
            <p className="mt-1 text-ink-dim">{WEDDING.scheduleLabel}</p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href={mapsDirUrl()}
                target="_blank"
                rel="noreferrer"
                className="cursor-pointer rounded-full bg-gradient-to-r from-[#6b4f96] to-[#8a6db1] px-6 py-3 text-sm tracking-[0.15em] text-white uppercase shadow-[0_10px_24px_-12px_rgba(107,79,150,0.7)] transition-opacity duration-200 hover:opacity-90"
              >
                Get Directions
              </a>
              <a
                href={mapsUrl()}
                target="_blank"
                rel="noreferrer"
                className="cursor-pointer rounded-full border border-[#c9b8e0] px-6 py-3 text-sm tracking-[0.15em] uppercase transition-colors duration-200 hover:bg-[#f0eaf7]"
              >
                Open in Maps
              </a>
            </div>
          </div>

          {/* Interactive map — pan, zoom, tap the pin for directions on mobile */}
          <div className="border-t border-line/70">
            <iframe
              src={mapsEmbedUrl()}
              className="block h-72 w-full sm:h-[420px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Map to ${WEDDING.venueName}`}
            />
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function Details() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <Reveal>
        <SectionHeading>Details</SectionHeading>
        <div className="grid gap-6 sm:grid-cols-2">
          {[
            ["Celebration", "Ceremony at noon, with the reception to follow — 11:30 AM to 5:00 PM."],
            ["RSVP", "Kindly respond using your personal link below."],
          ].map(([title, body]) => (
            <div key={title} className={`${cardClass} p-6 transition duration-300 hover:-translate-y-1`}>
              <h3 className="text-sm tracking-[0.25em] text-gold uppercase">{title}</h3>
              <p className="mt-3 text-ink-dim">{body}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

export type RegistryPreviewGift = {
  id: string;
  title: string;
  image: string | null;
  initials: string;
};

/**
 * The Gifts teaser, shown on both the home page and every personal invitation
 * (they render the same component). Three product shots and a way through to
 * the full registry — the grid itself lives on its own page so the invitation
 * doesn't turn into a catalogue.
 *
 * `href` carries the guest's token when there is one, so claiming works on the
 * other side without them having to find their invite again.
 */
export function Registry({
  preview = [],
  total = 0,
  href = "/registry",
}: {
  preview?: RegistryPreviewGift[];
  total?: number;
  href?: string;
}) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24 text-center">
      <Reveal>
        <SectionHeading>Gifts</SectionHeading>

        {total === 0 ? (
          <p className="mx-auto max-w-xl text-ink-dim">
            Your presence is the greatest gift. Our registry is coming soon — check back here
            closer to the day.
          </p>
        ) : (
          <>
            <p className="mx-auto max-w-xl text-ink-dim">
              Your presence is the greatest gift — but a few people asked, so we&rsquo;ve put
              together a small list of things we&rsquo;ve had our eye on.
            </p>

            <div className="mx-auto mt-10 grid max-w-lg grid-cols-3 gap-4">
              {preview.map((gift) => (
                <div
                  key={gift.id}
                  className="aspect-square overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_14px_34px_-22px_rgba(107,79,150,0.55)]"
                >
                  {gift.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={gift.image}
                      alt={gift.title}
                      loading="lazy"
                      className="h-full w-full object-contain p-3"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#f6f1fb] to-[#f3eee7]">
                      <span className="font-display text-2xl font-light italic text-[#b9a9d2]">
                        {gift.initials}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Link
              href={href}
              className="mt-10 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#6b4f96] to-[#8a6db1] px-7 py-3 text-sm font-medium text-white shadow-sm transition-[filter,transform] hover:brightness-110 active:scale-[0.98]"
            >
              See all {total} gifts
              <span aria-hidden>&rarr;</span>
            </Link>
          </>
        )}
      </Reveal>
    </section>
  );
}
