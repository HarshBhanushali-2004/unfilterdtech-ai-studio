/**
 * What media-type badge a slide/frame should actually show — the plan's
 * decision (`mediaType`) unless the Media Resolver couldn't honor a
 * VIDEO/SOURCE request and fell back to a generated image
 * (`resolutionPath === "GENERATED_IMAGE_FALLBACK"`, see
 * `lib/media-resolver/service.ts`). Showing "Video" in that case would be
 * exactly the "fake a video by renaming an image" AGENTS.md explicitly
 * warns against — the badge must reflect what was actually resolved, not
 * what was planned. Client-safe (no server-only imports) so both
 * `CarouselSlidesGallery` and `StoryFramesGallery` can use it directly.
 */
export function displayedMediaType(mediaType: string, resolutionPath: string | null): string {
  if (mediaType === "VIDEO" && resolutionPath === "GENERATED_IMAGE_FALLBACK") {
    return "IMAGE"
  }
  return mediaType
}
