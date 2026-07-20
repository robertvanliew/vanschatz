import Image from "next/image";
import FloralHero from "@/components/FloralHero";
import Countdown from "@/components/Countdown";
import ShaderBackground from "@/components/ShaderBackground";
import { WhenWhere, Details, Registry, Reveal, SectionHeading } from "@/components/Sections";
import RsvpCard from "@/components/RsvpCard";

export type InviteGuest = {
  name: string;
  token: string;
  rsvpStatus: string;
  partySize: number;
};

export default function InvitePage({
  guest,
  unknownToken = false,
}: {
  guest: InviteGuest | null;
  unknownToken?: boolean;
}) {
  return (
    <main>
      {/* Animated water-plane gradient behind everything; the hero wash fades
          into it so there's no seam. */}
      <ShaderBackground />

      <FloralHero guestName={guest?.name} />

      <section className="px-6 pt-24 pb-10">
        <Reveal>
          <SectionHeading>Counting down</SectionHeading>
          <Countdown />
        </Reveal>
      </section>

      {/* A single photo of Julie & Robert on the swing, beneath the countdown */}
      <section className="mx-auto max-w-2xl px-6 pb-24">
        <Reveal>
          <div className="overflow-hidden rounded-3xl border border-line bg-white/60 shadow-[0_30px_70px_-30px_rgba(107,79,150,0.55)]">
            <div className="relative aspect-[4/5] w-full">
              <Image
                src="/photos/01.jpeg"
                alt="Julie and Robert on the swing"
                fill
                sizes="(max-width: 768px) 92vw, 42rem"
                className="object-cover object-top"
                priority
              />
            </div>
          </div>
        </Reveal>
      </section>

      <WhenWhere />
      <Details />
      <section id="rsvp" className="mx-auto max-w-xl px-6 py-24">
        <Reveal>
          <SectionHeading>RSVP</SectionHeading>
          {guest ? (
            <RsvpCard guest={guest} />
          ) : (
            <p className="text-center text-ink-dim">
              {unknownToken
                ? "We couldn't find your invitation — please reach out to Julie & Rob and we'll fix it right up."
                : "Please use the personal link from your invitation text or email to RSVP."}
            </p>
          )}
        </Reveal>
      </section>
      <Registry />
      <footer className="pb-16 text-center text-sm text-ink-dim">
        <p className="font-display text-lg italic">With love, Julie &amp; Robert</p>
      </footer>
    </main>
  );
}
