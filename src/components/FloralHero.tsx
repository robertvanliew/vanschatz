import { WEDDING } from "@/lib/wedding";
import WisteriaCanopy from "@/components/WisteriaCanopy";
import PetalField from "@/components/PetalField";

/**
 * Light watercolor hero: a paper wash that fades into the shader background at
 * its base (so there's no hard seam), an animated wisteria canopy draping from
 * the top, and the couple's names in sage green. Server component — all motion
 * is CSS (reduced-motion aware). Falling petals live in a page-wide fixed layer
 * (PetalField) so they keep drifting as you scroll.
 */
export default function FloralHero({ guestName }: { guestName?: string }) {
  // "Saturday, October 17, 2026" → day + the rest, so mobile can stack them.
  const [dayPart, ...dateRest] = WEDDING.dateLabel.split(", ");
  const restOfDate = dateRest.join(", ");

  return (
    <section className="relative h-[100svh] w-full overflow-hidden">
      {/* Background wash, masked to dissolve into the shader toward the bottom */}
      <div className="hero-wash watercolor-wash paper-grain absolute inset-0" aria-hidden />

      <WisteriaCanopy />
      <PetalField />

      <div className="relative z-20 flex h-full flex-col items-center justify-center px-6 text-center">
        <p
          className="rise-in mb-6 text-sm tracking-[0.35em] text-ink-dim uppercase"
          style={{ "--delay": "0.2s" } as React.CSSProperties}
        >
          {guestName ? `Welcome, ${guestName}` : "Together with their families"}
        </p>

        <h1
          className="rise-in aurora-green font-display text-6xl leading-tight font-light tracking-wide sm:text-8xl"
          style={{ "--delay": "0.5s" } as React.CSSProperties}
        >
          Julie <span className="italic">&amp;</span> Robert
        </h1>

        <p
          className="rise-in mt-5 font-display text-xl italic tracking-wide text-ink-dim sm:text-2xl"
          style={{ "--delay": "0.7s" } as React.CSSProperties}
        >
          are getting married — and you are invited
        </p>

        {/* gold thread divider */}
        <div
          className="rise-in mt-8 h-px w-40 bg-gradient-to-r from-transparent via-[#b8965a] to-transparent"
          style={{ "--delay": "0.9s" } as React.CSSProperties}
        />

        <p
          className="rise-in mt-6 text-base leading-relaxed tracking-[0.25em] text-ink-dim sm:text-lg"
          style={{ "--delay": "1.1s" } as React.CSSProperties}
        >
          {dayPart.toUpperCase()}
          <br />
          {restOfDate.toUpperCase()}
        </p>
        <p
          className="rise-in mt-2 text-sm leading-relaxed tracking-[0.25em] text-gold"
          style={{ "--delay": "1.3s" } as React.CSSProperties}
        >
          {WEDDING.venueName.toUpperCase()}
          <br />
          {WEDDING.venueStreet.toUpperCase()}
          <br />
          NEWBURGH, NY
        </p>

        <div
          className="rise-in absolute bottom-10 text-xs tracking-[0.3em] text-ink-dim uppercase"
          style={{ "--delay": "1.8s" } as React.CSSProperties}
        >
          Scroll ↓
        </div>
      </div>
    </section>
  );
}
