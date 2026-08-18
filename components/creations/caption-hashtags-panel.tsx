import { CaptionCard } from "@/components/creations/caption-card";
import { HashtagsCard } from "@/components/creations/hashtags-card";

/**
 * The Instagram caption + hashtags that accompany every format when
 * published — deliberately kept as its own section, separate from a
 * Carousel's slide text / a Story's frame text / a Reel's script (Core
 * Requirement #3: "Caption separate from slide content"). Every format
 * gets exactly this one panel; only the hero workspace above it changes.
 * Reuses the existing `CaptionCard`/`HashtagsCard` (Copy actions included)
 * unchanged rather than re-implementing them.
 */
export function CaptionHashtagsPanel({ caption, hashtags }: { caption: string; hashtags: string[] }) {
  return (
    <div className="grid gap-6 rounded-2xl border bg-card p-5 shadow-sm sm:grid-cols-2 md:p-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Caption</h3>
        <CaptionCard caption={caption} />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Hashtags</h3>
        {hashtags.length > 0 ? (
          <HashtagsCard hashtags={hashtags} />
        ) : (
          <p className="text-sm text-muted-foreground">No hashtags generated for this creation.</p>
        )}
      </div>
    </div>
  );
}
