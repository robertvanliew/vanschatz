import { ConfirmButton } from "@/app/admin/AdminUi";
import {
  sendFinalDetailsNowAction,
  setFinalDetailsApprovalAction,
  testFinalDetailsAction,
} from "@/app/admin/actions";
import { FINAL_KEYS, planFinalDetails, type Edition, type FinalGuest } from "@/lib/final-details";

const SCHEDULE: { edition: Edition; when: string; subject: string }[] = [
  { edition: 1, when: "Thursday, Oct 15 · about 10 AM", subject: "2 days to go — the menu, the music & directions" },
  { edition: 2, when: "Friday, Oct 16 · about 6 PM", subject: "Tomorrow! Everything you need for Saturday" },
];

/**
 * The two final-details emails: what goes when, who it reaches, and the one
 * switch that lets the scheduled sends go out. Nothing is sent to guests until
 * the couple has read the tests and approved.
 */
export default function FinalDetailsPanel({
  guests,
  approved,
  saved,
  sentCount = 0,
  failedCount = 0,
  card,
  primaryBtn,
  ghostBtn,
}: {
  guests: FinalGuest[];
  approved: boolean;
  saved?: string;
  sentCount?: number;
  failedCount?: number;
  card: string;
  primaryBtn: string;
  ghostBtn: string;
}) {
  const sentFor = (edition: Edition) =>
    guests.filter((g) =>
      g.reminders.some((r) => r.scheduleKey === FINAL_KEYS[edition] && r.channel === "email" && !r.simulated)
    ).length;

  const notice = (tone: "ok" | "warn", text: string) => (
    <p
      className={`mt-4 rounded-xl border px-4 py-2.5 text-sm ${
        tone === "ok"
          ? "border-[#bcd0ac] bg-[#eef4e7] text-[#5f7554]"
          : "border-[#e0c3c7] bg-[#f7edee] text-[#a24a56]"
      }`}
    >
      {text}
    </p>
  );

  return (
    <section id="final-details" className={`${card} mt-8 scroll-mt-6 p-7`}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm tracking-[0.25em] text-gold uppercase">Final details email</h2>
        <span
          className={`rounded-full border px-3 py-1 text-[11px] tracking-wider uppercase ${
            approved
              ? "border-[#bcd0ac] bg-[#eef4e7] text-[#5f7554]"
              : "border-[#e6d3ab] bg-[#faf4e6] text-[#8f6f3a]"
          }`}
        >
          {approved ? "Approved — will send on schedule" : "Waiting for your OK"}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-ink-dim">
        The day&rsquo;s details, the dinner menu, and buttons to pick songs and see the gifts.
        Guests who haven&rsquo;t replied see an RSVP button first. Goes to everyone who
        hasn&rsquo;t declined, decided at the moment each one sends. Nobody gets the same edition
        twice.
      </p>

      {saved === "final-test" &&
        notice("ok", "Three test emails sent to you: Thursday's (attending and not-yet-replied) and Friday's.")}
      {saved === "final-approved" && notice("ok", "Approved. Both emails will go out at the times below.")}
      {saved === "final-paused" && notice("warn", "Paused. Nothing more will be sent until you approve again.")}
      {saved === "final-sent" &&
        notice(
          failedCount ? "warn" : "ok",
          failedCount
            ? `Sent to ${sentCount}, but ${failedCount} failed. Press send again — it only reaches the ones who didn't get it.`
            : `Sent to ${sentCount}.`
        )}

      <ul className="mt-5 space-y-3">
        {SCHEDULE.map((s) => {
          const done = sentFor(s.edition);
          const waiting = planFinalDetails(guests, s.edition).sends.length;
          return (
            <li key={s.edition} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-ink">{s.when}</div>
                <div className="text-xs text-ink-dim">&ldquo;{s.subject}&rdquo;</div>
              </div>
              <div className="text-xs text-ink-dim">
                {done > 0 ? `Sent to ${done}` : "Not sent yet"}
                {waiting > 0 && ` · ${waiting} to go`}
              </div>
              {waiting > 0 && (
                <form action={sendFinalDetailsNowAction}>
                  <input type="hidden" name="edition" value={s.edition} />
                  <ConfirmButton
                    className={ghostBtn}
                    message={`Send "${s.subject}" to ${waiting} ${waiting === 1 ? "guest" : "guests"} right now, instead of waiting for the schedule? This can't be undone.`}
                    confirmLabel={`Yes, send to ${waiting}`}
                  >
                    Send now
                  </ConfirmButton>
                </form>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <form action={testFinalDetailsAction}>
          <button type="submit" className={ghostBtn}>
            Send me the test emails
          </button>
        </form>
        <form action={setFinalDetailsApprovalAction}>
          <input type="hidden" name="approved" value={approved ? "" : "yes"} />
          {approved ? (
            <button type="submit" className={ghostBtn}>
              Pause the schedule
            </button>
          ) : (
            <ConfirmButton
              className={primaryBtn}
              message="Let both emails go out on schedule to every guest who hasn't declined? You can pause again any time before each one sends."
              confirmLabel="Yes, approve"
            >
              Approve the schedule
            </ConfirmButton>
          )}
        </form>
      </div>
    </section>
  );
}
