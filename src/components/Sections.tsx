"use client";

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
          <div className={`${cardClass} p-6 transition duration-300 hover:-translate-y-1`}>
            <h3 className="text-sm tracking-[0.25em] text-gold uppercase">After the Reception</h3>
            <p className="mt-3 text-ink-dim">
              You&apos;re warmly welcome to keep the celebration going at Barb &amp; John&apos;s.
            </p>
            {/* Decorative blurred placeholder only — the real address/phone are
                intentionally not in the page. They're shared on the invitation. */}
            <p className="mt-3 select-none blur-[5px] text-ink-dim" aria-hidden="true">
              000 Riverbend Road, Newburgh, NY 12550 · (000) 000-0000
            </p>
            <p className="mt-2 text-sm tracking-wide text-gold">
              The address will be provided on your invitation.
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function Registry() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24 text-center">
      <Reveal>
        <SectionHeading>Gifts</SectionHeading>
        <p className="mx-auto max-w-xl text-ink-dim">
          Your presence is the greatest gift. Our registry is coming soon — check back here closer to the day.
        </p>
      </Reveal>
    </section>
  );
}
