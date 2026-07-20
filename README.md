# Julie & Robert's Wedding Invite Site

A small Next.js app for Julie & Robert's wedding — Saturday, October 17, 2026 at
Lakeview House, Newburgh, NY. Guests get a personal invite link, RSVP online, and
receive reminder emails/texts as the date approaches.

## Quick start

```bash
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Then open http://localhost:3000. Copy `.env.example` to `.env` first if you
haven't already, and set `ADMIN_PASSWORD` to something only you know.

## Guest links

Each guest gets a unique link at `/invite/<token>`. Tokens are generated when a
guest is added and can be copied straight from the admin dashboard — there's no
need to construct them by hand.

## Admin dashboard

Visit `/admin` and sign in with the password set in `.env` as `ADMIN_PASSWORD`.
From there you can add/remove guests, record RSVPs on a guest's behalf, and
trigger reminders. If `ADMIN_PASSWORD` isn't set, the admin area is locked out
entirely (fails closed) rather than allowing a blank password.

## Practice mode

By default the site runs in "practice mode": RSVPs and reminders work fully,
but no real emails or texts are sent — actions are just logged. Real sending
turns on automatically once the relevant provider keys are set. See
`.env.example` for the full list of optional production variables (Resend for
email, Twilio for SMS, `CRON_SECRET` for the reminder endpoint, etc.).

## Reminders

Reminders can be sent two ways:

- **Manually**, via a button in the admin dashboard.
- **Automatically**, via a daily cron job that reminds guests who haven't
  RSVPed at 30, 7, and 3 days before the wedding. In production this hits the
  `/api/cron/reminders` endpoint and requires `CRON_SECRET` to be set.

## Tests

```bash
npm test
```

## Deferred / not yet done

These are known gaps, left for a future pass before or after go-live:

- Registry content (currently a placeholder section).
- Bulk guest import via CSV.
- Switching the database from SQLite to Postgres for production hosting.
- Final dress-code and reception copy.
