"use client";
import type { InviteGuest } from "@/components/InvitePage";

export default function RsvpCard({ guest }: { guest: InviteGuest }) {
  return <p className="text-center text-ink-dim">RSVP for {guest.name} — coming right up.</p>;
}
