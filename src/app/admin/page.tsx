import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { computeTallies } from "@/lib/rsvp";
import { isPracticeMode } from "@/lib/messaging";
import {
  isAdmin,
  addGuestAction,
  deleteGuestAction,
  setRsvpAction,
  sendInviteAction,
  sendAllInvitesAction,
  manualRemindersAction,
  scheduledRemindersAction,
} from "@/app/admin/actions";
import { CopyLinkButton, ConfirmButton } from "@/app/admin/AdminUi";

export const dynamic = "force-dynamic";

const card =
  "rounded-3xl border border-line bg-white/85 backdrop-blur-sm shadow-[0_18px_50px_-30px_rgba(107,79,150,0.45)]";
const primaryBtn =
  "cursor-pointer rounded-full bg-gradient-to-r from-[#6b4f96] to-[#8a6db1] px-6 py-3 text-sm font-medium tracking-wide text-white transition-opacity duration-200 hover:opacity-90";
const ghostBtn =
  "cursor-pointer rounded-full border border-line bg-white px-3 py-1.5 text-xs tracking-wider uppercase text-ink-dim transition-colors duration-200 hover:bg-[#f3eee7]";
const inputCls =
  "rounded-xl border border-line bg-white px-4 py-2.5 outline-none transition-colors focus:border-[#8a6db1]";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    YES: { label: "Attending", cls: "border-[#bcd0ac] bg-[#eef4e7] text-[#5f7554]" },
    NO: { label: "Declined", cls: "border-[#e0c3c7] bg-[#f7edee] text-[#a24a56]" },
    PENDING: { label: "Pending", cls: "border-[#e6d3ab] bg-[#faf4e6] text-[#8f6f3a]" },
  };
  const { label, cls } = map[status] ?? map.PENDING;
  return (
    <span className={`inline-block rounded-full border px-3 py-1 text-[11px] tracking-wider uppercase ${cls}`}>
      {label}
    </span>
  );
}

export default async function AdminDashboard() {
  if (!(await isAdmin())) redirect("/admin/login");

  const guests = await db.guest.findMany({ orderBy: { createdAt: "asc" } });
  const logs = await db.reminderLog.findMany({
    orderBy: { sentAt: "desc" },
    take: 50,
    include: { guest: true },
  });
  const tallies = computeTallies(guests);

  const h = await headers();
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ?? `http://${h.get("host") ?? "localhost:3000"}`;
  const emailLive = !isPracticeMode("email");
  const smsLive = !isPracticeMode("sms");

  const statCard = (label: string, value: number) => (
    <div key={label} className={`${card} p-6 text-center`}>
      <div className="font-display text-5xl text-[#6b4f96]">{value}</div>
      <div className="mt-2 text-[11px] tracking-[0.25em] text-ink-dim uppercase">{label}</div>
    </div>
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-5xl italic text-ink">Wedding HQ</h1>
        {emailLive ? (
          <span className="rounded-full border border-[#bcd0ac] bg-[#eef4e7] px-3 py-1 text-xs tracking-wider text-[#5f7554] uppercase">
            Email sending live
          </span>
        ) : (
          <span className="rounded-full border border-gold/50 bg-[#faf4e6] px-3 py-1 text-xs tracking-wider text-gold uppercase">
            Practice mode
          </span>
        )}
      </header>
      {!emailLive && (
        <p className="mt-2 max-w-2xl text-sm text-ink-dim">
          Emails are simulated (nothing is actually sent) until <code className="text-gold">RESEND_API_KEY</code> is
          set in the environment.
        </p>
      )}
      {emailLive && !smsLive && (
        <p className="mt-2 max-w-2xl text-sm text-ink-dim">
          Email invites &amp; reminders send for real. (Text/SMS isn&apos;t configured — you&apos;re using email, so
          that&apos;s fine.)
        </p>
      )}

      <section className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCard("Attending", tallies.attending)}
        {statCard("Declined", tallies.declined)}
        {statCard("No response", tallies.pending)}
        {statCard("Headcount", tallies.headcount)}
      </section>

      <section className={`${card} mt-8 p-7`}>
        <h2 className="text-sm tracking-[0.25em] text-gold uppercase">Add a guest</h2>
        <form action={addGuestAction} className="mt-5 flex flex-wrap gap-3">
          <input name="name" placeholder="Name" required className={`min-w-40 flex-1 ${inputCls}`} />
          <input name="email" placeholder="Email (optional)" className={`min-w-40 flex-1 ${inputCls}`} />
          <input name="phone" placeholder="Phone (optional)" className={`min-w-40 flex-1 ${inputCls}`} />
          <button className={primaryBtn}>Add</button>
        </form>
      </section>

      <section className={`${card} mt-8 p-7`}>
        <h2 className="text-sm tracking-[0.25em] text-gold uppercase">Guests ({guests.length})</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="text-[11px] tracking-wider text-ink-dim uppercase">
              <tr className="border-b border-line">
                <th className="pb-3 pr-4 font-normal">Name</th>
                <th className="pb-3 pr-4 font-normal">Status</th>
                <th className="pb-3 pr-4 font-normal">Party</th>
                <th className="pb-3 pr-4 font-normal">Contact</th>
                <th className="pb-3 pr-4 font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {guests.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-ink-dim">
                    No guests yet — add your first one above.
                  </td>
                </tr>
              )}
              {guests.map((g) => (
                <tr key={g.id} className="border-b border-line/70 last:border-0">
                  <td className="py-4 pr-4 font-medium">{g.name}</td>
                  <td className="py-4 pr-4">
                    <StatusBadge status={g.rsvpStatus} />
                  </td>
                  <td className="py-4 pr-4 text-ink-dim">
                    {g.rsvpStatus === "YES"
                      ? `${g.partySize} · ${g.adults} adult${g.adults === 1 ? "" : "s"}${g.children ? `, ${g.children} child${g.children === 1 ? "" : "ren"}` : ""}`
                      : "—"}
                  </td>
                  <td className="py-4 pr-4 text-ink-dim">
                    {[g.email, g.phone].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="py-4 pr-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <CopyLinkButton url={`${base}/invite/${g.token}`} />
                      {g.email && (
                        <form action={sendInviteAction}>
                          <input type="hidden" name="id" value={g.id} />
                          <ConfirmButton
                            className={ghostBtn}
                            message={`Email ${g.name} their invite?`}
                            confirmLabel="Send invite"
                          >
                            Email invite
                          </ConfirmButton>
                        </form>
                      )}
                      <form action={setRsvpAction} className="flex items-center gap-1">
                        <input type="hidden" name="id" value={g.id} />
                        <select
                          name="attending"
                          defaultValue={g.rsvpStatus === "NO" ? "no" : "yes"}
                          className="rounded-lg border border-line bg-white px-2 py-1.5 text-xs"
                        >
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                        <input name="adults" type="number" min={1} max={10} defaultValue={Math.max(1, g.adults)} title="Adults" aria-label="Adults" className="w-12 rounded-lg border border-line bg-white px-2 py-1.5 text-xs" />
                        <input name="children" type="number" min={0} max={10} defaultValue={Math.max(0, g.children)} title="Children" aria-label="Children" className="w-12 rounded-lg border border-line bg-white px-2 py-1.5 text-xs" />
                        <button className={ghostBtn}>Set</button>
                      </form>
                      <form action={deleteGuestAction}>
                        <input type="hidden" name="id" value={g.id} />
                        <ConfirmButton
                          tone="danger"
                          className="cursor-pointer rounded-full border border-[#e0c3c7] bg-white px-3 py-1.5 text-xs tracking-wider text-[#a24a56] uppercase transition-colors duration-200 hover:bg-[#f7edee]"
                          message={`Remove ${g.name} from the guest list?`}
                          confirmLabel="Remove"
                        >
                          Remove
                        </ConfirmButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`${card} mt-8 p-7`}>
        <h2 className="text-sm tracking-[0.25em] text-gold uppercase">Invitations</h2>
        <form action={sendAllInvitesAction} className="mt-5">
          <ConfirmButton
            className={primaryBtn}
            message="Email invites to everyone who has an email on file?"
            confirmLabel="Send all invites"
          >
            Email invites to everyone with an email
          </ConfirmButton>
        </form>
        <p className="mt-3 text-xs leading-relaxed text-ink-dim">
          Sends each guest their personal invite link as a designed email. Guests already invited are
          skipped, so it&apos;s safe to click again after adding new people. Or use the per-guest
          &ldquo;Email invite&rdquo; button above.
        </p>
      </section>

      <section className={`${card} mt-8 p-7`}>
        <h2 className="text-sm tracking-[0.25em] text-gold uppercase">Reminders</h2>
        <div className="mt-5 flex flex-wrap gap-3">
          <form action={manualRemindersAction}>
            <ConfirmButton
              className="cursor-pointer rounded-full bg-gradient-to-r from-[#6b4f96] to-[#a97a9c] px-6 py-3 text-sm font-medium tracking-wide text-white transition-opacity duration-200 hover:opacity-90"
              message="Send a reminder to everyone who hasn't RSVP'd yet?"
              confirmLabel="Send reminders"
            >
              Send reminder to everyone who hasn&apos;t RSVP&apos;d
            </ConfirmButton>
          </form>
          <form action={scheduledRemindersAction}>
            <ConfirmButton
              className="cursor-pointer rounded-full border border-line bg-white px-6 py-3 text-sm text-ink-dim transition-colors duration-200 hover:bg-[#f3eee7]"
              message="Run the scheduled reminder check now?"
              confirmLabel="Run check"
            >
              Run scheduled check now
            </ConfirmButton>
          </form>
        </div>
        <div className="mt-7">
          <h3 className="text-[11px] tracking-wider text-ink-dim uppercase">Recent sends</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {logs.length === 0 && <li className="text-ink-dim">Nothing sent yet.</li>}
            {logs.map((l) => (
              <li
                key={l.id}
                className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white px-4 py-2.5"
              >
                <span className="font-medium">{l.guest.name}</span>
                <span className="text-ink-dim">
                  · {l.channel} · {l.scheduleKey.startsWith("invite") ? "invite" : l.scheduleKey}
                </span>
                {l.simulated && (
                  <span className="rounded-full border border-gold/50 px-2 py-0.5 text-[10px] tracking-wider text-gold uppercase">
                    simulated
                  </span>
                )}
                <span className="ml-auto text-xs text-ink-dim">{l.sentAt.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
