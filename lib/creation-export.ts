import type { CarouselSlide } from "@/components/creations/carousel-card";
import type { StoryFrame } from "@/components/creations/story-card";
import type { Reel } from "@/components/creations/reel-card";

export type ExportableCreation = {
  title: string;
  prompt: string;
  caption: string;
  hashtags: string[];
  carousel?: CarouselSlide[] | null;
  story?: StoryFrame[] | null;
  reel?: Reel | null;
};

function formatHashtagsLine(hashtags: string[]) {
  return hashtags.map((tag) => `#${tag.replace(/^#/, "")}`).join(" ");
}

/**
 * Plain-text bundle used by "Copy All" — caption, hashtags, post, carousel,
 * story and reel concatenated into a single clipboard-friendly block.
 */
export function buildCopyAllText(creation: ExportableCreation) {
  const sections: string[] = [];

  sections.push(`Caption\n\n${creation.caption}`);

  if (creation.hashtags.length > 0) {
    sections.push(`Hashtags\n\n${formatHashtagsLine(creation.hashtags)}`);
  }

  sections.push(
    `Post\n\n${creation.caption}${
      creation.hashtags.length > 0
        ? `\n\n${formatHashtagsLine(creation.hashtags)}`
        : ""
    }`
  );

  if (creation.carousel && creation.carousel.length > 0) {
    const carouselText = creation.carousel
      .map(
        (slide) =>
          `Slide ${slide.slideNumber}\nHeadline: ${slide.headline}\nBody: ${slide.body}\nVisual Suggestion: ${slide.visualSuggestion}`
      )
      .join("\n\n");
    sections.push(`Carousel\n\n${carouselText}`);
  }

  if (creation.story && creation.story.length > 0) {
    const storyText = creation.story
      .map(
        (frame) =>
          `Story ${frame.frameNumber}\nText: ${frame.text}\nVisual Suggestion: ${frame.visualSuggestion}`
      )
      .join("\n\n");
    sections.push(`Story\n\n${storyText}`);
  }

  if (creation.reel) {
    const scenesText = creation.reel.scenes
      .map(
        (scene) =>
          `Scene ${scene.sceneNumber}\nNarration: ${scene.narration}\nVisual: ${scene.visual}`
      )
      .join("\n\n");
    sections.push(
      `Reel\n\nHook: ${creation.reel.hook}\n\nScript: ${creation.reel.script}\n\n${scenesText}`
    );
  }

  return sections.join("\n\n========================================\n\n");
}

/**
 * Full markdown export — caption, post, hashtags, carousel, story, reel and
 * the original prompt, as one .md file.
 */
export function buildCreationMarkdown(creation: ExportableCreation) {
  const lines: string[] = [];

  lines.push(`# ${creation.title}`, "");

  lines.push("## Caption", "", creation.caption, "");

  if (creation.hashtags.length > 0) {
    lines.push("## Hashtags", "", formatHashtagsLine(creation.hashtags), "");
  }

  lines.push(
    "## Post",
    "",
    creation.caption,
    "",
    creation.hashtags.length > 0 ? formatHashtagsLine(creation.hashtags) : "",
    ""
  );

  if (creation.carousel && creation.carousel.length > 0) {
    lines.push("## Carousel", "");
    for (const slide of creation.carousel) {
      lines.push(
        `### Slide ${slide.slideNumber}: ${slide.headline}`,
        "",
        slide.body,
        "",
        `*Visual: ${slide.visualSuggestion}*`,
        ""
      );
    }
  }

  if (creation.story && creation.story.length > 0) {
    lines.push("## Story", "");
    for (const frame of creation.story) {
      lines.push(
        `### Story ${frame.frameNumber}`,
        "",
        frame.text,
        "",
        `*Visual: ${frame.visualSuggestion}*`,
        ""
      );
    }
  }

  if (creation.reel) {
    lines.push("## Reel", "", `**Hook:** ${creation.reel.hook}`, "");
    lines.push("**Script:**", "", creation.reel.script, "");
    for (const scene of creation.reel.scenes) {
      lines.push(
        `### Scene ${scene.sceneNumber}`,
        "",
        `Narration: ${scene.narration}`,
        "",
        `*Visual: ${scene.visual}*`,
        ""
      );
    }
  }

  lines.push("## Prompt", "", creation.prompt || "No prompt available.", "");

  return lines.join("\n");
}

export function downloadMarkdown(filename: string, markdown: string) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".md") ? filename : `${filename}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "creation"
  );
}
