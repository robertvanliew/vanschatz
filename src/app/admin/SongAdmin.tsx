import { ConfirmButton, CopyTextButton } from "@/app/admin/AdminUi";
import { deleteSongAction } from "@/app/admin/actions";
import { djList, type RankedSong } from "@/lib/songs";

/**
 * Every song guests have asked for, most-requested first, with who asked and
 * why, and the whole list as plain text for the DJ.
 */
export default function SongAdmin({
  songs,
  guestsWhoAsked,
  card,
  ghostBtn,
}: {
  songs: RankedSong[];
  guestsWhoAsked: number;
  card: string;
  ghostBtn: string;
}) {
  return (
    <section id="songs" className={`${card} mt-8 scroll-mt-6 p-7`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm tracking-[0.25em] text-gold uppercase">Song requests</h2>
        {songs.length > 0 && (
          <CopyTextButton text={djList(songs)} label="Copy list for the DJ" className={ghostBtn} />
        )}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-ink-dim">
        {songs.length === 0
          ? "Nobody has sent songs yet. Guests pick them under “Get us dancing” on the invitation, and each submission is emailed to you."
          : `${songs.length} ${songs.length === 1 ? "song" : "songs"} from ${guestsWhoAsked} ${guestsWhoAsked === 1 ? "guest" : "guests"}. Each submission is also emailed to you. “E” marks an explicit song — the copied list asks for the clean version.`}
      </p>

      {songs.length > 0 && (
        <ol className="mt-5 space-y-2">
          {songs.map((s, i) => (
            <li
              key={s.trackId}
              className="flex items-start gap-3 rounded-2xl border border-line bg-white p-3"
            >
              <span className="w-6 shrink-0 pt-1 text-right text-sm text-ink-dim">{i + 1}</span>
              {s.artwork ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.artwork} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="h-12 w-12 shrink-0 rounded-lg bg-[#f0eaf7]" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={s.appleUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-ink underline-offset-4 hover:underline"
                  >
                    {s.title}
                  </a>
                  {s.explicit && (
                    <span className="rounded border border-line px-1 text-[10px] leading-4 text-ink-dim">
                      E
                    </span>
                  )}
                  {s.requests.length > 1 && (
                    <span className="rounded-full border border-[#c9b8e0] bg-[#f6f1fb] px-2 py-0.5 text-[11px] text-[#6b4f96]">
                      &times;{s.requests.length}
                    </span>
                  )}
                </div>
                <div className="text-sm text-ink-dim">{s.artist}</div>
                <ul className="mt-1 space-y-0.5 text-xs text-ink-dim">
                  {s.requests.map((r, j) => (
                    <li key={j}>
                      {r.requester}
                      {r.note && <span className="italic text-[#8a6db1]"> &mdash; &ldquo;{r.note}&rdquo;</span>}
                    </li>
                  ))}
                </ul>
              </div>
              <form action={deleteSongAction} className="shrink-0">
                <input type="hidden" name="trackId" value={s.trackId} />
                <ConfirmButton
                  className={ghostBtn}
                  message={`Take “${s.title}” off the list? It's removed for everyone who asked for it.`}
                  confirmLabel="Remove"
                >
                  Remove
                </ConfirmButton>
              </form>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
