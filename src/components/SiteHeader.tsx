import Link from "next/link";

/**
 * A slim bar pinned to the top of the invitation, with a way to the registry
 * from anywhere on the page.
 *
 * The gifts section used to sit at the very bottom and guests were not finding
 * it. Moving it up helps people who scroll; this helps everyone else.
 *
 * It sits over the hero, so it stays thin and frosted rather than solid, and
 * the links carry their own background so they never get lost against the
 * photograph behind them.
 */
export default function SiteHeader({
  /** The guest's registry link when we know who they are, else the public one. */
  registryHref,
  /** Home for this visitor: their own invitation if they have one. */
  homeHref = "/",
  /** Hidden on the registry page itself, which has its own way back. */
  showRsvp = true,
}: {
  registryHref: string;
  homeHref?: string;
  showRsvp?: boolean;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/40 bg-white/55 backdrop-blur-md">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href={homeHref}
          className="font-display truncate text-lg italic text-ink transition-opacity hover:opacity-70"
        >
          Julie &amp; Robert
        </Link>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {showRsvp && (
            <Link
              href={`${homeHref}#rsvp`}
              className="rounded-full px-3 py-2 text-xs tracking-[0.14em] text-ink-dim uppercase transition-colors hover:text-ink sm:text-[13px]"
            >
              RSVP
            </Link>
          )}
          <Link
            href={registryHref}
            className="rounded-full bg-gradient-to-r from-[#6b4f96] to-[#8a6db1] px-4 py-2 text-xs font-medium tracking-[0.12em] text-white uppercase shadow-sm transition-[filter,transform] hover:brightness-110 active:scale-[0.98] sm:px-5 sm:text-[13px]"
          >
            Gifts
          </Link>
        </div>
      </nav>
    </header>
  );
}
