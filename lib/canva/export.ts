import { CanvaApiError } from "./errors";

/**
 * Thin, plain-`fetch` wrapper around Canva's Export API — mirrors
 * `lib/canva/design-import.ts` exactly. Request/response shapes verified
 * against the live Canva Connect API reference
 * (`canva.dev/docs/connect/api-reference/exports/...`) while writing this
 * file — see CANVA_NEXT_PHASE_PLAN.md §15.
 */

const EXPORTS_URL = "https://api.canva.com/rest/v1/exports";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_MS = 60_000;

type ExportJob = {
  id: string;
  status: "in_progress" | "success" | "failed";
  urls?: string[];
  error?: { code?: string; message?: string };
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createExportJob(accessToken: string, designId: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(EXPORTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        design_id: designId,
        format: { type: "png" },
      }),
    });
  } catch (error) {
    throw new CanvaApiError(
      "network_error",
      `Failed to reach Canva's export endpoint: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const body = (await response.json().catch(() => null)) as { job?: ExportJob } | null;

  if (!response.ok || !body?.job?.id) {
    console.error("[Canva] Create export job failed:", response.status, body);
    throw new CanvaApiError("request_failed", `Canva rejected the export request (${response.status}).`);
  }

  return body.job.id;
}

async function getExportJob(accessToken: string, jobId: string): Promise<ExportJob> {
  let response: Response;
  try {
    response = await fetch(`${EXPORTS_URL}/${jobId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (error) {
    throw new CanvaApiError(
      "network_error",
      `Failed to reach Canva's export endpoint: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const body = (await response.json().catch(() => null)) as { job?: ExportJob } | null;

  if (!response.ok || !body?.job) {
    console.error("[Canva] Get export job failed:", response.status, body);
    throw new CanvaApiError("request_failed", `Canva returned an unexpected response (${response.status}) while checking the export job.`);
  }

  return body.job;
}

/**
 * Exports a Canva design as a single PNG, polls until done, then downloads
 * the result **server-side** and returns the raw bytes — the export's
 * download URL (Canva-hosted, unauthenticated, 24h-valid) is never returned
 * to this function's caller, let alone the browser; only the already-
 * fetched image bytes are. The caller (the `sync` route) is responsible for
 * persisting those bytes using the app's existing image-persistence
 * pattern (a `data:` URL, matching every other image in this schema).
 */
export async function exportDesignAsPng(accessToken: string, designId: string): Promise<Buffer> {
  const jobId = await createExportJob(accessToken, designId);

  const startedAt = Date.now();
  let job = await getExportJob(accessToken, jobId);

  while (job.status === "in_progress") {
    if (Date.now() - startedAt > MAX_POLL_MS) {
      throw new CanvaApiError("timeout", "Canva's design export is taking longer than expected. Please try again.");
    }
    await sleep(POLL_INTERVAL_MS);
    job = await getExportJob(accessToken, jobId);
  }

  if (job.status === "failed") {
    console.error("[Canva] Export job failed:", job.error);
    throw new CanvaApiError(
      "request_failed",
      job.error?.code === "license_required"
        ? "This design uses a premium Canva element that requires a paid plan to export."
        : "Canva was unable to complete the export."
    );
  }

  const downloadUrl = job.urls?.[0];
  if (!downloadUrl) {
    throw new CanvaApiError("invalid_response", "Canva's export job succeeded but returned no download URL.");
  }

  let fileResponse: Response;
  try {
    fileResponse = await fetch(downloadUrl);
  } catch (error) {
    throw new CanvaApiError(
      "network_error",
      `Failed to download the exported design: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (!fileResponse.ok) {
    throw new CanvaApiError("request_failed", `Failed to download the exported design (${fileResponse.status}).`);
  }

  const arrayBuffer = await fileResponse.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Exports a (possibly multi-page) Canva design as PNG and downloads every
 * page's image server-side — the Carousel counterpart to
 * `exportDesignAsPng`, added rather than changing that function's return
 * type so the working Post "Sync back" path is untouched. Canva's own
 * documented behavior: a multi-page design's export job returns one
 * download URL per page, "sorted by page order" — so `urls[0]` is slide 1,
 * `urls[1]` is slide 2, and so on, matching the order `buildCarouselPptx`
 * wrote the slides in. Returns the pages in that same order.
 */
export async function exportDesignPages(accessToken: string, designId: string): Promise<Buffer[]> {
  const jobId = await createExportJob(accessToken, designId);

  const startedAt = Date.now();
  let job = await getExportJob(accessToken, jobId);

  while (job.status === "in_progress") {
    if (Date.now() - startedAt > MAX_POLL_MS) {
      throw new CanvaApiError("timeout", "Canva's design export is taking longer than expected. Please try again.");
    }
    await sleep(POLL_INTERVAL_MS);
    job = await getExportJob(accessToken, jobId);
  }

  if (job.status === "failed") {
    console.error("[Canva] Export job failed:", job.error);
    throw new CanvaApiError(
      "request_failed",
      job.error?.code === "license_required"
        ? "This design uses a premium Canva element that requires a paid plan to export."
        : "Canva was unable to complete the export."
    );
  }

  const downloadUrls = job.urls ?? [];
  if (downloadUrls.length === 0) {
    throw new CanvaApiError("invalid_response", "Canva's export job succeeded but returned no download URLs.");
  }

  return Promise.all(
    downloadUrls.map(async (url, index) => {
      let fileResponse: Response;
      try {
        fileResponse = await fetch(url);
      } catch (error) {
        throw new CanvaApiError(
          "network_error",
          `Failed to download page ${index + 1} of the exported design: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      if (!fileResponse.ok) {
        throw new CanvaApiError(
          "request_failed",
          `Failed to download page ${index + 1} of the exported design (${fileResponse.status}).`
        );
      }

      const arrayBuffer = await fileResponse.arrayBuffer();
      return Buffer.from(arrayBuffer);
    })
  );
}
