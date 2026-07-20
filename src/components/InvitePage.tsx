import FloralHero from "@/components/FloralHero";
import Countdown from "@/components/Countdown";
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
      <FloralHero guestName={guest?.name} />
      <section className="px-6 py-24">
        <Reveal>
          <SectionHeading>Counting down</SectionHeading>
          <Countdown />
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
