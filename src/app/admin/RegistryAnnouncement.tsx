import { ConfirmButton } from "@/app/admin/AdminUi";
import {
  testRegistryEmailAction,
  sendRegistryAnnouncementAction,
} from "@/app/admin/actions";
import { announcementSummary, type AnnouncementGuest } from "@/lib/registry-email";

/**
 * The wedding update email: the day's details plus the registry, with an RSVP
 * nudge for guests who haven't replied and their headcount for those who have.
 *
 * The test send is deliberately in the way: this goes to real people and can't
 * be recalled, so the panel shows exactly who it will reach and sends the couple
 * both versions first.
 */
export default function RegistryAnnouncement({
  guests,
  saved,
  sentCount = 0,
  failedCount = 0,
  card,
  primaryBtn,
  ghostBtn,
}: {
  guests: AnnouncementGuest[];
  saved?: string;
  sentCount?: number;
  failedCount?: number;
  card: string;
  primaryBtn: string;
  ghostBtn: string;
}) {
  const summary = announcementSummary(guests);

  return (
    <section className={`${card} mt-8 p-7`}>
      <h2 className="text-sm tracking-[0.25em] text-gold uppercase">Wedding update email</h2>
      <p className="mt-2 text-xs leading-relaxed text-ink-dim">
        One email to everyone who hasn&rsquo;t declined: the date, time and venue, plus a link to
        their own registry page. Guests who haven&rsquo;t replied get a short RSVP request at the
        bottom; guests who said yes see the headcount you have for them, so a wrong number gets
        caught. People who declined are left out. Nobody is emailed twice, however many times you
        press the button.
      </p>

      {saved === "registry-test" && (
        <p className="mt-4 rounded-xl border border-[#bcd0ac] bg-[#eef4e7] px-4 py-2.5 text-sm text-[#5f7554]">
          Two test emails sent to you &mdash; one as a guest who hasn&rsquo;t replied sees it, one as
          an attending guest sees it. Read both before sending to everyone.
        </p>
      )}
      {saved === "registry-sent" && failedCount === 0 && (
        <p className="mt-4 rounded-xl border border-[#bcd0ac] bg-[#eef4e7] px-4 py-2.5 text-sm text-[#5f7554]">
          Sent to {sentCount} {sentCount === 1 ? "guest" : "guests"}. Nobody will be emailed this
          again.
        </p>
      )}
      {saved === "registry-sent" && failedCount > 0 && (
        <p className="mt-4 rounded-xl border border-[#e0c3c7] bg-[#f7edee] px-4 py-2.5 text-sm text-[#a24a56]">
          Sent to {sentCount}, but {failedCount} couldn&rsquo;t be sent. Press &ldquo;Email
          everyone&rdquo; again &mdash; it only goes to the ones who didn&rsquo;t get it.
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
            also asked to RSVP
          </div>
        </div>
        <div>
          <div className="font-display text-3xl text-ink-dim">{summary.skipped}</div>
          <div className="text-[11px] tracking-[0.18em] text-ink-dim uppercase">skipped</div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <form action={testRegistryEmailAction}>
          <button type="submit" className={ghostBtn}>
            Send me both test versions
          </button>
        </form>

        <form action={sendRegistryAnnouncementAction}>
          <ConfirmButton
            className={primaryBtn}
            message={`Email ${summary.total} ${summary.total === 1 ? "guest" : "guests"}? ${summary.withNudge} of them will also be asked to RSVP. This can't be undone.`}
            confirmLabel={`Yes, email ${summary.total}`}
          >
            Email everyone
          </ConfirmButton>
        </form>
      </div>

      {summary.total === 0 && (
        <p className="mt-4 text-sm text-ink-dim">
          Everyone eligible has already had it. Guests added from now on can be sent it with the
          same button.
        </p>
      )}
    </section>
  );
}
