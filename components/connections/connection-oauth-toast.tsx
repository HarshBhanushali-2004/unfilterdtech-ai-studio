"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Platform } from "@prisma/client";
import { toast } from "sonner";

import { PLATFORM_LABELS } from "@/lib/connections/platforms";

/**
 * Mirrors the `SocialAuthErrorCode` union in lib/social/errors.ts — kept as
 * a plain local copy (not imported) so this "use client" file never pulls
 * in anything from lib/social/** (see the comment on
 * `OAUTH_ENABLED_PLATFORMS` in lib/connections/platforms.ts for why that
 * boundary matters).
 */
const ERROR_MESSAGES: Record<string, string> = {
  cancelled: "Sign-in was cancelled.",
  invalid_state: "That sign-in link expired or was invalid. Please try again.",
  exchange_failed: "That sign-in link expired. Please try connecting again.",
  missing_channel:
    "This Google account doesn't have a YouTube channel. Try a different account, or create a channel first.",
  network_error: "Couldn't reach the platform. Please check your connection and try again.",
  not_configured: "This platform isn't set up yet. Please try again later.",
  unknown: "Something went wrong while connecting. Please try again.",
};

/**
 * The OAuth connect/callback routes (app/api/social/**) are plain HTTP
 * redirects — they can't show a toast directly. They signal the outcome as
 * query params on the redirect back to this page (`?social=connected`,
 * `?social_error=<code>`, optionally `&warning=no_refresh_token`); this
 * component reads them once on mount, shows the matching toast, and strips
 * them from the URL so refreshing the page doesn't re-fire it. Mounted
 * inside a <Suspense> boundary on the page (useSearchParams requires one —
 * same pattern as the Studio workspace, see CLAUDE.md Section 11).
 */
export function ConnectionOAuthToast() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const success = searchParams.get("social");
    const errorCode = searchParams.get("social_error");

    if (!success && !errorCode) return;

    const platformParam = searchParams.get("platform");
    const label =
      platformParam && platformParam in PLATFORM_LABELS
        ? PLATFORM_LABELS[platformParam as Platform]
        : "the platform";

    if (success === "connected") {
      toast.success(`Connected to ${label}`);

      if (searchParams.get("warning") === "no_refresh_token") {
        toast.warning("Connected, but you may need to reconnect again later.");
      }
    } else if (errorCode) {
      toast.error(ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.unknown);
    }

    router.replace("/connections");
    // Only re-run when the URL's search params actually change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return null;
}
