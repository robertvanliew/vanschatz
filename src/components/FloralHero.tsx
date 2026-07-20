import { WEDDING } from "@/lib/wedding";
import WisteriaCanopy, { PetalRain } from "@/components/WisteriaCanopy";

/**
 * Light watercolor hero: paper wash background, animated wisteria canopy
 * draping from the top, petals drifting down, and the couple's names in
 * elegant serif. Server component — all motion is CSS (reduced-motion aware).
 */
export default function FloralHero({ guestName }: { guestName?: string }) {
  return (
    <section className="watercolor-wash paper-grain relative h-[100svh] w-full overflow-hidden">
      <WisteriaCanopy />
      <PetalRain />

      <div className="relative z-20 flex h-full flex-col items-center justify-center px-6 text-center">
        <p
          className="rise-in mb-6 text-sm tracking-[0.35em] text-ink-dim uppercase"
          style={{ "--delay": "0.2s" } as React.CSSProperties}
        >
          {guestName ? `Welcome, ${guestName}` : "Together with their families"}
        </p>

        <h1
          className="rise-in font-display text-6xl leading-tight font-light tracking-wide sm:text-8xl"
          style={{ "--delay": "0.5s" } as React.CSSProperties}
        >
          Julie <span className="aurora-text italic">&amp;</span> Robert
        </h1>

        {/* gold thread divider */}
        <div
          className="rise-in mt-8 h-px w-40 bg-gradient-to-r from-transparent via-[#b8965a] to-transparent"
          style={{ "--delay": "0.9s" } as React.CSSProperties}
        />

        <p
          className="rise-in mt-6 text-base tracking-[0.25em] text-ink-dim sm:text-lg"
          style={{ "--delay": "1.1s" } as React.CSSProperties}
        >
          {WEDDING.dateLabel.toUpperCase()}
        </p>
        <p
          className="rise-in mt-2 text-sm tracking-[0.25em] text-gold"
          style={{ "--delay": "1.3s" } as React.CSSProperties}
        >
          {`${WEDDING.venueName.toUpperCase()} · NEWBURGH, NY`}
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
