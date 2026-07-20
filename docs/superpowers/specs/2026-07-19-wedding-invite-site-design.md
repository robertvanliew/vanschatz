# Julie & Robert Wedding Invite Website — Design Spec

**Date:** 2026-07-19
**Status:** Approved by Robert

## Overview

A visually stunning, cosmic/celestial-themed ("Age of Aquarius") wedding invitation website for Julie & Robert's wedding. Guests receive personal one-tap links, view a cinematic single-page invite, and RSVP in seconds. Robert & Julie manage everything from a private admin dashboard, including on-demand and auto-scheduled email/SMS reminders.

## Wedding Facts

| Item | Value |
|---|---|
| Couple | Julie & Robert ("Julie & Rob") |
| Date | Saturday, October 17, 2026 |
| Event time | 12:00 PM – 5:00 PM |
| Guest arrival | 11:30 AM (displayed prominently) |
| Venue | Lakeview House, Newburgh |
| Street address | **[PLACEHOLDER — fill in]** |
| Reception details | **[PLACEHOLDER — same venue assumed until specified]** |
| Dress code | **[PLACEHOLDER — fill in]** |
| RSVP deadline | **[PLACEHOLDER — fill in]** |
| Domain | Purchased later; build must work on any URL |

## Design Direction

Theme: **"Under the Same Sky"** — cosmic-celestial blended with sleek-futuristic motion and a warm romantic core.

- Deep-space palette (navy/indigo), starfield background with slow drift, aurora/nebula gradient accents, luminous typography.
- A glowing animated 3D celestial element in the hero (React Three Fiber), e.g. aurora/nebula orb.
- Scroll-driven cinematic reveals (Framer Motion).
- **Mobile-first**: buttery-smooth on phones; equally polished on desktop.
- **Accessibility:** honors `prefers-reduced-motion` with a calm static variant; large touch targets; readable contrast; friendly to older, less tech-savvy guests.

## Guest Experience

1. Guest taps their **personal link** (unique token per guest) from a text or email.
2. Page opens with the cosmic hero; **greets them by name** — no login, code, or typing.
3. Single scrolling page sections:
   - **Hero** — names, date, celestial 3D scene
   - **Countdown** — live countdown to Oct 17, 2026
   - **When & Where** — venue, arrival time (11:30 AM), event time (12–5 PM), map
   - **Details** — dress code, schedule, other notes (placeholders initially)
   - **RSVP** — two large buttons: "Yes, I'll be there" / "Sorry, can't make it", then **party size** selector. Nothing else.
   - **Registry** — stubbed section, hidden or "coming soon" until the gift list exists (future phase)
4. Confirmation animation on RSVP; guests can revisit their link anytime to change their response.

## RSVP Data Collected

- Attending: yes / no
- Party size (total headcount including the guest)

No meal choice, dietary, or notes fields (deliberately minimal).

## Admin Dashboard (`/admin`, password-protected)

- **Guest list management:** add guests individually or import (name + phone and/or email); edit/remove.
- **Personal links:** generate and copy each guest's unique link for sending.
- **Live tallies:** attending / declined / no response / total headcount.
- **RSVP on behalf of a guest** (e.g., after a phone call).
- **Reminders:**
  - **On-demand:** "Send reminder to everyone who hasn't RSVP'd" button (email and/or SMS per guest's available contact info).
  - **Auto-scheduled:** reminders at ~1 month, 1 week, and 3 days before the wedding; automatically skip guests who already responded.

## Architecture

- **Framework:** Next.js (App Router), deployed on Vercel.
- **3D/Animation:** React Three Fiber (hero scene), Framer Motion (scroll/reveal).
- **Database:** Neon (hosted Postgres, free tier) — guests, RSVPs, reminder logs.
- **Email:** Resend.
- **SMS:** Twilio.
- **Scheduling:** Vercel Cron triggers the auto-reminder job.
- **Auth:** simple password gate for `/admin` (single shared admin credential); guest access via unguessable per-guest tokens in URLs.

### Practice Mode

Until Robert creates the external accounts (Vercel, Neon, Resend, Twilio, domain), the app runs fully in **practice mode**:

- Local/SQLite-or-mock data store or local Postgres substitute as needed.
- Reminder "sends" are simulated and logged visibly in the dashboard (no real messages, no cost).
- Swapping to real services is a configuration change (env vars), not a rebuild.

## Error Handling & Edge Cases

- Invalid/unknown guest token → graceful generic invite page with a "contact Julie & Rob" note (no crash, no data leak).
- Guest with only email (no phone) → email-only reminders; and vice versa.
- Double-taps / repeat RSVPs → last response wins; always changeable.
- Reminder job idempotency → a given scheduled reminder is sent at most once per guest.
- Reduced-motion and low-power devices → static fallback visuals.

## Testing

- Unit tests for RSVP logic, reminder eligibility (who gets skipped), and token lookup.
- Manual verification on mobile viewport and desktop; reduced-motion check.
- Practice-mode end-to-end: create guest → open personal link → RSVP → verify tallies → trigger reminder job → verify simulated sends and skips.

## Future Phases (explicitly out of scope now)

- Gift registry content (section stubbed).
- Real service hookup (Twilio/Resend/Neon/Vercel/domain) — step-by-step guide to be provided at that time.
- Optional extras: photos, hotel block, story section content.
