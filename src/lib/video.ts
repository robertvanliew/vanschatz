/**
 * The wedding film, filmed by WIZTV and hosted unlisted on YouTube.
 *
 * Unlisted means it only plays for people with the link, so the /video page
 * is kept out of search engines too: it's shared the same way, by link.
 */
export const WEDDING_VIDEO = {
  youtubeId: "DzKZPgUxI_w",
  title: "The Van Schatz wedding and reception",
  filmedBy: "WIZTV",
  /**
   * The lakeside photo, not YouTube's automatic frame: that one is letterboxed
   * and caught mid-crossfade, with a third person ghosted over the couple.
   */
  poster: "/video/poster.jpg",
} as const;

/**
 * The privacy-enhanced player: no YouTube cookies until someone presses play,
 * and related videos at the end come only from this channel.
 */
export function embedUrl(id: string): string {
  const params = new URLSearchParams({ autoplay: "1", rel: "0", modestbranding: "1", playsinline: "1" });
  return `https://www.youtube-nocookie.com/embed/${id}?${params}`;
}
