import type { Platform } from "@prisma/client";

import { cn } from "@/lib/utils";

/**
 * lucide-react (this project's icon set — CLAUDE.md Section 15) ships no
 * social/brand marks, so these are small, hand-drawn, monochrome
 * (`currentColor`) glyphs — one per supported platform, deliberately
 * simplified rather than pixel-exact brand logos. Deliberate, scoped
 * exception to "icons: lucide-react exclusively", the same way the palette
 * section is a documented exception to "no raw hex values" (Section 15).
 */

type GlyphProps = { className?: string };

function InstagramGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
    </svg>
  );
}

function FacebookGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M14.5 8.5H16.5V5.3C16.16 5.26 15 5.17 13.65 5.17C10.82 5.17 8.89 6.9 8.89 10.06V12.7H5.75V16.27H8.89V21H12.58V16.27H15.6L16.07 12.7H12.58V10.43C12.58 9.39 12.86 8.5 14.5 8.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function LinkedInGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="7.5" cy="8" r="1.2" fill="currentColor" />
      <path d="M7.5 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M11.5 17V13.3C11.5 11.9 12.3 11 13.5 11C14.7 11 15.4 11.8 15.4 13.3V17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M11.5 17V11.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function XGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M5 5L19 19M19 5L5 19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function YoutubeGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="2.5" y="6" width="19" height="12" rx="4" stroke="currentColor" strokeWidth="2" />
      <path d="M10.5 9.5L15 12L10.5 14.5V9.5Z" fill="currentColor" />
    </svg>
  );
}

const GLYPHS: Record<Platform, typeof InstagramGlyph> = {
  INSTAGRAM: InstagramGlyph,
  FACEBOOK: FacebookGlyph,
  LINKEDIN: LinkedInGlyph,
  TWITTER: XGlyph,
  YOUTUBE: YoutubeGlyph,
};

/** Accent chip background/foreground per platform — the one place in this
 * app custom brand colors are deliberately used instead of the shared
 * violet accent, so the five platforms stay visually distinguishable. */
export const PLATFORM_ACCENT_CLASSES: Record<Platform, string> = {
  INSTAGRAM: "bg-gradient-to-br from-fuchsia-500/15 via-pink-500/15 to-amber-400/15 text-pink-600 dark:text-pink-300",
  FACEBOOK: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
  LINKEDIN: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
  TWITTER: "bg-foreground/10 text-foreground",
  YOUTUBE: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export function PlatformIcon({ platform, className }: { platform: Platform; className?: string }) {
  const Glyph = GLYPHS[platform];

  return <Glyph className={cn("size-5", className)} />;
}
