import { WEDDING } from "@/lib/wedding";
import CosmicHero from "@/components/CosmicHero";

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
      <CosmicHero guestName={guest?.name} />
      {unknownToken && (
        <p>We couldn&apos;t find your invitation — please reach out to Julie &amp; Rob.</p>
      )}
      <h1>{WEDDING.coupleFull}</h1>
      <p>{WEDDING.dateLabel}</p>
      <p>{WEDDING.arrivalLabel}</p>
      <p>{WEDDING.timeLabel}</p>
      <p>
        {WEDDING.venueName}, {WEDDING.venueAddress}
      </p>
      {!guest && !unknownToken && <p>Please use your personal invitation link to RSVP.</p>}
    </main>
  );
}
