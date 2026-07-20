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
  manualRemindersAction,
  scheduledRemindersAction,
} from "@/app/admin/actions";
import { CopyLinkButton } from "@/app/admin/AdminUi";

export const dynamic = "force-dynamic";

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
  const practice = isPracticeMode("email") || isPracticeMode("sms");

  const statCard = (label: string, value: number) => (
    <div key={label} className="rounded-2xl border border-line bg-white p-5 text-center">
      <div className="font-display text-4xl">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.2em] text-ink-dim">{label}</div>
    </div>
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-display text-4xl italic">
        Wedding HQ {practice && <span className="align-middle rounded-full border border-gold/50 px-3 py-1 text-xs not-italic uppercase tracking-wider text-gold">Practice mode</span>}
      </h1>

      <section className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCard("Attending", tallies.attending)}
        {statCard("Declined", tallies.declined)}
        {statCard("No response", tallies.pending)}
        {statCard("Headcount", tallies.headcount)}
      </section>

      <section className="mt-12">
        <h2 className="text-sm uppercase tracking-[0.25em] text-ink-dim">Add guest</h2>
        <form action={addGuestAction} className="mt-4 flex flex-wrap gap-3">
          <input name="name" placeholder="Name" required className="min-w-40 flex-1 rounded-xl border border-line bg-white px-4 py-2.5" />
          <input name="email" placeholder="Email (optional)" className="min-w-40 flex-1 rounded-xl border border-line bg-white px-4 py-2.5" />
          <input name="phone" placeholder="Phone (optional)" className="min-w-40 flex-1 rounded-xl border border-line bg-white px-4 py-2.5" />
          <button className="rounded-xl cursor-pointer bg-gradient-to-r from-[#6b4f96] to-[#8a6db1] px-6 py-2.5 font-medium text-white">Add</button>
        </form>
      </section>

      <section className="mt-12">
        <h2 className="text-sm uppercase tracking-[0.25em] text-ink-dim">Guests ({guests.length})</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-ink-dim">
              <tr>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Party</th>
                <th className="py-2 pr-4">Contact</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((g) => (
                <tr key={g.id} className="border-t border-line">
                  <td className="py-3 pr-4">{g.name}</td>
                  <td className="py-3 pr-4">
                    {g.rsvpStatus === "YES" ? "✅ Yes" : g.rsvpStatus === "NO" ? "❌ No" : "⏳ Pending"}
                  </td>
                  <td className="py-3 pr-4">
                    {g.rsvpStatus === "YES"
                      ? `${g.partySize} (${g.adults}a${g.children ? ` + ${g.children}c` : ""})`
                      : "—"}
                  </td>
                  <td className="py-3 pr-4 text-ink-dim">{[g.email, g.phone].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <CopyLinkButton url={`${base}/invite/${g.token}`} />
                      <form action={setRsvpAction} className="flex items-center gap-1">
                        <input type="hidden" name="id" value={g.id} />
                        <select name="attending" defaultValue={g.rsvpStatus === "NO" ? "no" : "yes"} className="rounded-lg border border-line bg-white px-2 py-1.5 text-xs">
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                        <input name="adults" type="number" min={1} max={10} defaultValue={Math.max(1, g.adults)} title="Adults" aria-label="Adults" className="w-12 rounded-lg border border-line bg-white px-2 py-1.5 text-xs" />
                        <input name="children" type="number" min={0} max={10} defaultValue={Math.max(0, g.children)} title="Children" aria-label="Children" className="w-12 rounded-lg border border-line bg-white px-2 py-1.5 text-xs" />
                        <button className="rounded-lg cursor-pointer border border-line px-3 py-1.5 text-xs uppercase tracking-wider transition-colors duration-200 hover:bg-[#f0eaf7]">Set</button>
                      </form>
                      <form action={deleteGuestAction}>
                        <input type="hidden" name="id" value={g.id} />
                        <button className="rounded-lg cursor-pointer border border-red-300 px-3 py-1.5 text-xs uppercase tracking-wider text-red-700 transition-colors duration-200 hover:bg-red-50">Remove</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-sm uppercase tracking-[0.25em] text-ink-dim">Reminders</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <form action={manualRemindersAction}>
            <button className="rounded-xl cursor-pointer bg-gradient-to-r from-[#6b4f96] to-[#a97a9c] px-6 py-3 font-medium text-white">
              Send reminder to everyone who hasn&apos;t RSVP&apos;d
            </button>
          </form>
          <form action={scheduledRemindersAction}>
            <button className="rounded-xl cursor-pointer border border-line px-6 py-3 transition-colors duration-200 hover:bg-[#f0eaf7]">
              Run scheduled check now
            </button>
          </form>
        </div>
        <div className="mt-6">
          <h3 className="text-xs uppercase tracking-wider text-ink-dim">Recent sends</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {logs.length === 0 && <li className="text-ink-dim">No reminders sent yet.</li>}
            {logs.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5">
                <span>{l.guest.name}</span>
                <span className="text-ink-dim">· {l.channel} · {l.scheduleKey}</span>
                {l.simulated && <span className="rounded-full border border-gold/50 px-2 py-0.5 text-[10px] uppercase text-gold">simulated</span>}
                <span className="ml-auto text-xs text-ink-dim">{l.sentAt.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
