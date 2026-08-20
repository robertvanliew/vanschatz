import Link from "next/link";
import GiftGrid from "./GiftGrid";
import ShaderBackground from "@/components/ShaderBackground";
import { type GiftView } from "@/lib/registry";
import { addressLines, type Shipping } from "@/lib/shipping";

/**
 * The registry page body, shared by /registry and /invite/<token>/registry.
 * The only difference between them is whether a guest is known, which decides
 * whether claiming is offered.
 */
export default function RegistryPage({
  gifts,
  guestId,
  guestName,
  token,
  shipping,
}: {
  gifts: GiftView[];
  guestId: string | null;
  guestName: string | null;
  token: string | null;
  /** Already filtered by visibleShipping — null means do not show an address. */
  shipping: Shipping | null;
}) {
  return (
    <main>
      <ShaderBackground />

      <section className="mx-auto max-w-6xl px-6 pb-28 pt-24">
        <div className="mb-12 text-center">
          <Link
            href={token ? `/invite/${token}` : "/"}
            className="text-sm text-ink-dim underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            &larr; Back to the invitation
          </Link>

          <h1 className="font-display mt-6 text-4xl font-light italic sm:text-5xl">Gifts</h1>

          <p className="mx-auto mt-5 max-w-xl text-ink-dim">
            {guestName ? `${guestName}, your` : "Your"} presence really is the greatest gift.
            But a few people asked, so here are some things we&rsquo;ve had our eye on.
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm text-ink-dim">
            Everything links straight to the shop &mdash; nothing is bought through this page.
            {token
              ? " Tap “I’m getting this” so nobody ends up buying the same thing twice."
              : " Open your personal invitation link if you'd like to claim one."}
          </p>
        </div>

        {shipping && (
          <details className="mx-auto mb-10 max-w-md rounded-2xl border border-line bg-white/70 px-5 py-3 text-center">
            <summary className="cursor-pointer text-sm text-ink-dim">
              Where to send gifts
            </summary>
            <address className="not-italic mt-3 text-sm leading-relaxed text-ink">
              {addressLines(shipping).map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            {shipping.arriveBy && (
              <p className="mt-2 text-xs text-ink-dim">
                Please aim for it to arrive by {shipping.arriveBy}.
              </p>
            )}
          </details>
        )}

        <GiftGrid gifts={gifts} guestId={guestId} token={token} shipping={shipping} />

        <p className="mx-auto mt-16 max-w-xl text-center text-sm text-ink-dim">
          Prices are approximate and change often &mdash; the shop&rsquo;s price is the real one.
        </p>
      </section>
    </main>
  );
}
