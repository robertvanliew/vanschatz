import { FUND_KEYS, money, progress } from "@/lib/fund";
import { ConfirmButton } from "@/app/admin/AdminUi";
import {
  saveFundAction,
  saveTileAction,
  toggleTileAction,
  deleteTileAction,
  confirmContributionAction,
  deleteContributionAction,
} from "@/app/admin/actions";

/**
 * The honeymoon fund's admin panel: the PayPal link, the pieces of the trip, and
 * the contributions guests have said they sent.
 *
 * Kept out of admin/page.tsx, which is long enough already.
 */

export type AdminTile = {
  id: string;
  title: string;
  note: string | null;
  targetCents: number;
  suggested: number[];
  active: boolean;
  contributions: {
    id: string;
    amountCents: number;
    message: string | null;
    confirmed: boolean;
    givenName: string | null;
    guest: { name: string } | null;
  }[];
};

export default function FundAdmin({
  tiles,
  settings,
  saved,
  card,
  primaryBtn,
  ghostBtn,
  inputCls,
}: {
  tiles: AdminTile[];
  settings: Record<string, string>;
  saved?: string;
  card: string;
  primaryBtn: string;
  ghostBtn: string;
  inputCls: string;
}) {
  const contributions = tiles.flatMap((t) =>
    t.contributions.map((c) => ({ ...c, tileTitle: t.title }))
  );
  const raisedCents = contributions.reduce((sum, c) => sum + c.amountCents, 0);
  const unconfirmed = contributions.filter((c) => !c.confirmed).length;

  return (
    <section className={`${card} mt-8 p-7`}>
      <h2 className="text-sm tracking-[0.25em] text-gold uppercase">Honeymoon fund</h2>
      <p className="mt-2 text-xs leading-relaxed text-ink-dim">
        Guests send money through PayPal, then tap &ldquo;I&rsquo;ve sent this&rdquo;, which moves
        the bar. Nothing is verified &mdash; PayPal tells this site nothing &mdash; so tick each one
        off against your own PayPal history below. Clearing the link hides the whole section from
        the site.
      </p>

      {saved === "fund" && (
        <p className="mt-4 rounded-xl border border-[#bcd0ac] bg-[#eef4e7] px-4 py-2.5 text-sm text-[#5f7554]">
          Saved. Guests can see this now.
        </p>
      )}

      <form action={saveFundAction} className="mt-5 grid gap-3">
        <input
          name="payLink"
          defaultValue={settings[FUND_KEYS.payLink] ?? ""}
          placeholder="Your PayPal link — e.g. https://paypal.me/yourname"
          className={inputCls}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            name="heading"
            defaultValue={settings[FUND_KEYS.heading] ?? ""}
            placeholder="Heading (default: The honeymoon)"
            className={inputCls}
          />
          <input
            name="blurb"
            defaultValue={settings[FUND_KEYS.blurb] ?? ""}
            placeholder="One line under the heading (optional)"
            className={inputCls}
          />
        </div>
        <div>
          <button type="submit" className={primaryBtn}>
            Save fund settings
          </button>
        </div>
      </form>

      <p className="mt-7 text-[11px] tracking-[0.18em] text-ink-dim uppercase">Pieces of the trip</p>
      <ul className="mt-3 space-y-3">
        {tiles.map((tile) => {
          const raised = tile.contributions.reduce((sum, c) => sum + c.amountCents, 0);
          const p = progress(raised, tile.targetCents);
          return (
            <li
              key={tile.id}
              className={`rounded-2xl border border-line bg-white p-4 ${tile.active ? "" : "opacity-55"}`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{tile.title}</p>
                  <p className="text-xs text-ink-dim">
                    {money(raised)} of {money(tile.targetCents)} &middot; {p.percent}%
                    {tile.active ? "" : " · hidden"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={toggleTileAction}>
                    <input type="hidden" name="id" value={tile.id} />
                    <button type="submit" className={ghostBtn}>
                      {tile.active ? "Hide" : "Show"}
                    </button>
                  </form>
                  <form action={deleteTileAction}>
                    <input type="hidden" name="id" value={tile.id} />
                    <ConfirmButton
                      className={ghostBtn}
                      tone="danger"
                      message={`Delete "${tile.title}"? Any contributions recorded against it go too.`}
                      confirmLabel="Delete"
                    >
                      Delete
                    </ConfirmButton>
                  </form>
                </div>
              </div>

              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-ink-dim">Edit</summary>
                <form action={saveTileAction} className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="id" value={tile.id} />
                  <input name="title" defaultValue={tile.title} required className={inputCls} />
                  <input
                    name="note"
                    defaultValue={tile.note ?? ""}
                    placeholder="Note"
                    className={inputCls}
                  />
                  <input
                    name="target"
                    defaultValue={(tile.targetCents / 100).toFixed(2)}
                    placeholder="Target, e.g. 180"
                    className={inputCls}
                  />
                  <input
                    name="suggested"
                    defaultValue={tile.suggested.map((c) => c / 100).join(", ")}
                    placeholder="Buttons, e.g. 25, 50, 100"
                    className={inputCls}
                  />
                  <div className="sm:col-span-2">
                    <button type="submit" className={ghostBtn}>
                      Save
                    </button>
                  </div>
                </form>
              </details>
            </li>
          );
        })}
      </ul>

      <form
        action={saveTileAction}
        className="mt-4 grid gap-3 rounded-2xl border border-line bg-[#faf8f4] p-4 sm:grid-cols-2"
      >
        <input
          name="title"
          placeholder="Add a piece — e.g. dinner for two"
          required
          className={inputCls}
        />
        <input name="note" placeholder="Note (optional)" className={inputCls} />
        <input name="target" placeholder="Target, e.g. 90" required className={inputCls} />
        <input name="suggested" placeholder="Buttons, e.g. 25, 50, 90" className={inputCls} />
        <div className="sm:col-span-2">
          <button type="submit" className={primaryBtn}>
            Add piece
          </button>
        </div>
      </form>

      <p className="mt-7 text-[11px] tracking-[0.18em] text-ink-dim uppercase">
        Contributions &middot; {money(raisedCents)} recorded
        {unconfirmed > 0 && ` · ${unconfirmed} to check`}
      </p>
      {contributions.length === 0 ? (
        <p className="mt-3 text-sm text-ink-dim">Nothing yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {contributions.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white px-4 py-2.5 text-sm"
            >
              <span className="font-medium">{c.guest?.name ?? c.givenName ?? "Someone"}</span>
              <span className="text-ink-dim">
                {money(c.amountCents)} &middot; {c.tileTitle}
              </span>
              {c.message && (
                <span className="text-xs italic text-ink-dim">&ldquo;{c.message}&rdquo;</span>
              )}
              {c.confirmed && (
                <span className="rounded-full border border-[#bcd0ac] bg-[#eef4e7] px-2 py-0.5 text-[10px] tracking-wider text-[#5f7554] uppercase">
                  confirmed
                </span>
              )}
              <span className="ml-auto flex gap-2">
                <form action={confirmContributionAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" className={ghostBtn}>
                    {c.confirmed ? "Un-confirm" : "Confirm"}
                  </button>
                </form>
                <form action={deleteContributionAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <ConfirmButton
                    className={ghostBtn}
                    tone="danger"
                    message="Remove this contribution? The public bar goes down by this amount."
                    confirmLabel="Remove"
                  >
                    Remove
                  </ConfirmButton>
                </form>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
