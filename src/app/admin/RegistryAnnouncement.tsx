import { ConfirmButton } from "@/app/admin/AdminUi";
import {
  testRegistryEmailAction,
  sendRegistryAnnouncementAction,
} from "@/app/admin/actions";
import { announcementSummary, type AnnouncementGuest } from "@/lib/registry-email";

/**
 * One email telling everyone the registry is up, with an RSVP nudge added only
 * for guests who haven't replied.
 *
 * The test send is deliberately in the way: this goes to real people and cannot
 * be recalled, so the panel shows exactly who it will reach and offers a test to
 * yourself first.
 */
export default function RegistryAnnouncement({
  guests,
  saved,
  card,
  primaryBtn,
  ghostBtn,
}: {
  guests: (AnnouncementGuest & { id: string })[];
  saved?: string;
  card: string;
  primaryBtn: string;
  ghostBtn: string;
}) {
  const summary = announcementSummary(guests);
  // Prefer a guest whose email is the couple's own for the test send.
  const testTarget =
    guests.find((g) => g.email?.toLowerCase() === "robvanliew@gmail.com") ??
    guests.find((g) => g.email);

  return (
    <section className={`${card} mt-8 p-7`}>
      <h2 className="text-sm tracking-[0.25em] text-gold uppercase">Registry announcement</h2>
      <p className="mt-2 text-xs leading-relaxed text-ink-dim">
        One email telling everyone the registry is up. Guests who haven&rsquo;t replied also get a
        short RSVP nudge at the bottom; anyone who already said yes doesn&rsquo;t, so nobody is
        asked twice. People who declined are left out entirely. Each guest gets their own links,
        and nobody is emailed twice however many times you press the button.
      </p>

      {saved === "registry-test" && (
        <p className="mt-4 rounded-xl border border-[#bcd0ac] bg-[#eef4e7] px-4 py-2.5 text-sm text-[#5f7554]">
          Test sent — check your inbox before sending to everyone.
        </p>
      )}
      {saved === "registry-sent" && (
        <p className="mt-4 rounded-xl border border-[#bcd0ac] bg-[#eef4e7] px-4 py-2.5 text-sm text-[#5f7554]">
          Sent. Nobody will be emailed this again.
        </p>
      )}

      <div className="mt-5 grid gap-3 rounded-2xl border border-line bg-[#faf8f4] p-4 sm:grid-cols-3">
        <div>
          <div className="font-display text-3xl text-[#6b4f96]">{summary.total}</div>
          <div className="text-[11px] tracking-[0.18em] text-ink-dim uppercase">will be emailed</div>
        </div>
        <div>
          <div className="font-display text-3xl text-[#6b4f96]">{summary.withNudge}</div>
          <div className="text-[11px] tracking-[0.18em] text-ink-dim uppercase">
            also get an RSVP nudge
          </div>
        </div>
        <div>
          <div className="font-display text-3xl text-ink-dim">{summary.skipped}</div>
          <div className="text-[11px] tracking-[0.18em] text-ink-dim uppercase">
            skipped
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {testTarget && (
          <form action={testRegistryEmailAction}>
            <input type="hidden" name="id" value={testTarget.id} />
            <button type="submit" className={ghostBtn}>
              Send a test to {testTarget.email}
            </button>
          </form>
        )}

        <form action={sendRegistryAnnouncementAction}>
          <ConfirmButton
            className={primaryBtn}
            message={`Email ${summary.total} ${summary.total === 1 ? "guest" : "guests"} about the registry? ${summary.withNudge} of them will also be asked to RSVP. This can't be undone.`}
            confirmLabel={`Yes, email ${summary.total}`}
          >
            Email everyone about the registry
          </ConfirmButton>
        </form>
      </div>

      {summary.total === 0 && (
        <p className="mt-4 text-sm text-ink-dim">
          Everyone eligible has already had it. Guests added from now on can be sent it with the
          same button.
        </p>
      )}

      <p className="mt-4 text-xs leading-relaxed text-ink-dim">
        Send the test first and read it properly — this goes to real people and can&rsquo;t be
        recalled.
      </p>
    </section>
  );
}
