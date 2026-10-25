import type { Metadata } from "next";
import Link from "next/link";
import ShaderBackground from "@/components/ShaderBackground";
import VideoPlayer from "@/components/VideoPlayer";
import ShareFilmButton from "@/components/ShareFilmButton";
import { WEDDING_VIDEO } from "@/lib/video";

export const metadata: Metadata = {
  title: "Our wedding film — Julie & Robert",
  description: "October 17, 2026 at Lakeview House. Filmed by WIZTV.",
  // Unlisted on YouTube, so unlisted here too: shared by link, never searched.
  robots: { index: false, follow: false },
  openGraph: {
    title: "Our wedding film — Julie & Robert",
    description: "October 17, 2026 at Lakeview House. Tap to watch.",
    url: "https://thevanschatz.com/video",
    type: "video.other",
    images: [{ url: WEDDING_VIDEO.poster, width: 1600, height: 900, alt: "Julie & Robert's wedding film" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Our wedding film — Julie & Robert",
    description: "October 17, 2026 at Lakeview House. Tap to watch.",
    images: [WEDDING_VIDEO.poster],
  },
};

/** The wedding film, in the site's own design rather than on YouTube's page. */
export default function WeddingFilm() {
  return (
    <main className="min-h-screen">
      <ShaderBackground />

      <header className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="font-display text-xl italic text-ink transition-opacity hover:opacity-70">
          Julie &amp; Robert
        </Link>
        <span className="text-[11px] tracking-[0.25em] text-ink-dim uppercase">October 17, 2026</span>
      </header>

      <section className="mx-auto max-w-5xl px-4 pt-8 pb-10 text-center sm:px-8 sm:pt-14">
        <p className="text-[11px] tracking-[0.35em] text-gold uppercase">Lakeview House &middot; Newburgh, NY</p>
        <h1 className="font-display mt-5 text-5xl font-light italic leading-[1.05] text-ink sm:text-7xl">
          Our wedding film
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-ink-dim">
          Relive the day with us &mdash; the ceremony, the reception, and so many of you.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-3 sm:px-8">
        <VideoPlayer
          youtubeId={WEDDING_VIDEO.youtubeId}
          title={WEDDING_VIDEO.title}
          poster={WEDDING_VIDEO.poster}
        />
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 px-2 text-sm text-ink-dim">
          <span>
            Filmed by <span className="text-ink">{WEDDING_VIDEO.filmedBy}</span>
          </span>
          <ShareFilmButton />
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-6 pt-20 pb-24 text-center">
        <div className="mx-auto h-px w-12 bg-gold/60" />
        <p className="font-display mt-8 text-2xl italic leading-relaxed text-ink sm:text-3xl">
          Thank you for being part of our day.
        </p>
        <p className="font-display mt-6 text-3xl text-ink">
          J <span className="italic text-gold">&amp;</span> R
        </p>
      </section>
    </main>
  );
}
