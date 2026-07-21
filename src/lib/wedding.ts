export const WEDDING = {
  coupleShort: "Julie & Rob",
  coupleFull: "Julie & Robert",
  dateLabel: "Saturday, October 17, 2026",
  timeLabel: "11:30 AM – 5:00 PM",
  scheduleLabel: "Ceremony at noon, reception to follow",
  venueName: "Lakeview House",
  venueStreet: "343 Lakeside Road",
  venueAddress: "343 Lakeside Road, Orange Lake, Newburgh, NY 12550",
  // Private after-party details — kept OFF the public site (shown blurred there)
  // and included only on the emailed invitation to invited guests.
  afterParty: {
    host: "Barb & John's",
    address: "753 River Rd, Newburgh, NY 12550",
    phone: "(917) 656-5572",
  },
  date: new Date(2026, 9, 17, 11, 30),
} as const;

function dateOnly(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Whole calendar days from `now` until `target` (default: wedding day). Negative after. */
export function daysUntil(now: Date, target: Date = WEDDING.date): number {
  const MS_PER_DAY = 86_400_000;
  return Math.round((dateOnly(target) - dateOnly(now)) / MS_PER_DAY);
}

const encodedAddress = encodeURIComponent(
  `${WEDDING.venueName}, ${WEDDING.venueAddress}`
).replace(/%20/g, "+");

export function mapsUrl(): string {
  return `https://maps.google.com/?q=${encodedAddress}`;
}

export function mapsEmbedUrl(): string {
  return `https://www.google.com/maps?q=${encodedAddress}&output=embed`;
}

/** Turn-by-turn directions — opens the Google Maps app on phones. */
export function mapsDirUrl(): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
}
