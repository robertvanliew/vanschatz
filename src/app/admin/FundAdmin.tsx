import { FUND_KEYS, money, parseAmounts } from "@/lib/fund";
import { ConfirmButton } from "@/app/admin/AdminUi";
import {
  saveFundAction,
  confirmContributionAction,
  hideNoteAction,
  deleteContributionAction,
} from "@/app/admin/actions";

/**
 * The fund's admin panel: the PayPal link, the quick-pick amounts, and every
 * contribution.
 *
 * Amounts and the running total live here and nowhere else — the public page
 * deliberately shows no numbers at all.
 */

export type AdminContribution = {
  id: string;
  amountCents: number;
  message: string | null;
  noteHidden: boolean;
  confirmed: boolean;
  givenName: string | null;
  createdAt: Date;
  guest: { name: string } | null;
};

export default function FundAdmin({
  contributions,
  settings,
  saved,
  card,
  primaryBtn,
  ghostBtn,
  inputCls,
}: {
  contributions: AdminContribution[];
  settings: Record<string, string>;
  saved?: string;
  card: string;
  primaryBtn: string;
  ghostBtn: string;
  inputCls: string;
}) {
  const total = contributions.reduce((sum, c) => sum + c.amountCents, 0);
  const confirmedTotal = contributions
    .filter((c) => c.confirmed)
    .reduce((sum, c) => sum + c.amountCents, 0);
  const toCheck = contributions.filter((c) => !c.confirmed).length;
  const live = (settings[FUND_KEYS.payLink] ?? "").trim();

  return (
    <section className={`${card} mt-8 p-7`}>
      <h2 className="text-sm tracking-[0.25em] text-gold uppercase">Honeymoon fund</h2>
      <p className="mt-2 text-xs leading-relaxed text-ink-dim">
        Guests donate through PayPal, then tap &ldquo;I&rsquo;ve sent it&rdquo;. Nothing is verified
        &mdash; PayPal tells this site nothing &mdash; so tick each one off against your own PayPal
        history. The public page shows no amounts and no total, only the notes people leave.
        Clearing the link hides the whole section.
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
          placeholder="Your PayPal link — e.g. https://paypal.me/thevanschatz"
          className={inputCls}
        />
        <input
          name="amounts"
          defaultValue={settings[FUND_KEYS.amounts] ?? ""}
          placeholder="Quick-pick buttons, e.g. 50, 100, 150, 250"
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

      <div className="mt-5 rounded-2xl border border-line bg-[#faf8f4] p-4">
        <p className="text-[11px] tracking-[0.18em] text-ink-dim uppercase">Buttons guests see</p>
        <p className="mt-2 text-sm text-ink">
          {parseAmounts(settings[FUND_KEYS.amounts]).map((c) => money(c)).join("  ·  ")}
          <span className="text-ink-dim"> · plus any amount they type</span>
        </p>
        <p className="mt-2 text-xs text-ink-dim">
          {live ? "The fund is live on the registry." : "Hidden — add a PayPal link above."}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-5 text-sm">
        <span className="text-ink-dim">
          Given: <span className="font-medium text-ink">{money(total)}</span>
        </span>
        <span className="text-ink-dim">
          Confirmed: <span className="font-medium text-ink">{money(confirmedTotal)}</span>
        </span>
        {toCheck > 0 && (
          <span className="text-gold">
            {toCheck} to check against PayPal
          </span>
        )}
      </div>

      {contributions.length === 0 ? (
        <p className="mt-4 text-sm text-ink-dim">No donations yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {contributions.map((c) => (
            <li key={c.id} className="rounded-2xl border border-line bg-white px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium">{c.guest?.name ?? c.givenName ?? "Someone"}</span>
                <span className="text-ink-dim">{money(c.amountCents)}</span>
                {c.confirmed && (
                  <span className="rounded-full border border-[#bcd0ac] bg-[#eef4e7] px-2 py-0.5 text-[10px] tracking-wider text-[#5f7554] uppercase">
                    confirmed
                  </span>
                )}
                {c.noteHidden && c.message && (
                  <span className="rounded-full border border-[#e6d3ab] bg-[#faf4e6] px-2 py-0.5 text-[10px] tracking-wider text-gold uppercase">
                    note hidden
                  </span>
                )}
                <span className="ml-auto text-xs text-ink-dim">
                  {c.createdAt.toLocaleDateString()}
                </span>
              </div>

              {c.message && (
                <p className="mt-2 text-xs italic text-ink-dim">&ldquo;{c.message}&rdquo;</p>
              )}

              <div className="mt-2 flex flex-wrap gap-2">
                <form action={confirmContributionAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" className={ghostBtn}>
                    {c.confirmed ? "Un-confirm" : "Confirm"}
                  </button>
                </form>
                {c.message && (
                  <form action={hideNoteAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className={ghostBtn}>
                      {c.noteHidden ? "Show note" : "Hide note"}
                    </button>
                  </form>
                )}
                <form action={deleteContributionAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <ConfirmButton
                    className={ghostBtn}
                    tone="danger"
                    message="Remove this donation record? The note disappears from the site too."
                    confirmLabel="Remove"
                  >
                    Remove
                  </ConfirmButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
