"use client";

import { motion } from "framer-motion";
import { WEDDING, mapsUrl, mapsEmbedUrl } from "@/lib/wedding";

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
      <span className="aurora-text not-italic">✦</span> {children}
    </h2>
  );
}

export function WhenWhere() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <Reveal>
        <SectionHeading>When &amp; Where</SectionHeading>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm">
          <p className="font-display text-2xl">{WEDDING.venueName}</p>
          <p className="mt-2 text-ink-dim">{WEDDING.venueAddress}</p>
          <div className="my-6 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          <p className="text-lg">{WEDDING.dateLabel}</p>
          <p className="mt-2 text-gold">{WEDDING.arrivalLabel}</p>
          <p className="mt-1 text-ink-dim">Celebration {WEDDING.timeLabel}</p>
          <a
            href={mapsUrl()}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-block rounded-full border border-white/20 px-6 py-3 text-sm uppercase tracking-[0.2em] transition hover:bg-white/10"
          >
            Open in Maps
          </a>
        </div>
        <div className="mt-6 overflow-hidden rounded-3xl border border-white/10">
          <iframe
            src={mapsEmbedUrl()}
            className="h-64 w-full sm:h-80"
            style={{ filter: "invert(90%) hue-rotate(180deg)" }}
            loading="lazy"
            title="Map to Lakeview House"
          />
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
            ["Arrival", "Please arrive by 11:30 AM so we can begin promptly at noon."],
            ["Attire", "Dress code details coming soon."],
            ["Celebration", "Ceremony and reception details coming soon."],
            ["RSVP", "Kindly respond using your personal link below."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <h3 className="text-sm uppercase tracking-[0.25em] text-gold">{title}</h3>
              <p className="mt-3 text-ink-dim">{body}</p>
            </div>
          ))}
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
