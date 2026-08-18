import { CanvaApiError } from "./errors";

/**
 * Thin, plain-`fetch` wrapper around Canva's Design Import API — no SDK,
 * matching `lib/social/providers/canva.ts`'s own reasoning. Request/response
 * shapes below were verified against the live Canva Connect API reference
 * (`canva.dev/docs/connect/api-reference/design-imports/...`) while writing
 * this file, not assumed — see CANVA_NEXT_PHASE_PLAN.md §15 for the exact
 * pages consulted.
 */

const IMPORTS_URL = "https://api.canva.com/rest/v1/imports";

/** Poll cadence and ceiling for the async import job — generous enough for
 * a single-slide Post (small file, should resolve in a few seconds) without
 * polling forever if Canva is degraded. */
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_MS = 60_000;

export type ImportedDesign = {
  designId: string;
  editUrl: string;
  viewUrl: string;
};

type ImportJob = {
  id: string;
  status: "in_progress" | "success" | "failed";
  result?: {
    designs: Array<{
      id: string;
      title: string;
      urls: { edit_url: string; view_url: string };
    }>;
  };
  error?: { code?: string; message?: string };
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createImportJob(accessToken: string, pptxBuffer: Buffer, title: string): Promise<string> {
  // Canva caps a design title at 50 characters (unencoded) — truncate
  // rather than let the request fail on a long Post headline/title.
  const safeTitle = title.slice(0, 50);
  const metadata = { title_base64: Buffer.from(safeTitle, "utf-8").toString("base64") };

  let response: Response;
  try {
    response = await fetch(IMPORTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/octet-stream",
        "Import-Metadata": JSON.stringify(metadata),
      },
      body: new Uint8Array(pptxBuffer),
    });
  } catch (error) {
    throw new CanvaApiError(
      "network_error",
      `Failed to reach Canva's import endpoint: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const body = (await response.json().catch(() => null)) as { job?: ImportJob } | null;

  if (!response.ok || !body?.job?.id) {
    console.error("[Canva] Create import job failed:", response.status, body);
    throw new CanvaApiError(
      "request_failed",
      `Canva rejected the design import request (${response.status}).`
    );
  }

  return body.job.id;
}

async function getImportJob(accessToken: string, jobId: string): Promise<ImportJob> {
  let response: Response;
  try {
    response = await fetch(`${IMPORTS_URL}/${jobId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (error) {
    throw new CanvaApiError(
      "network_error",
      `Failed to reach Canva's import endpoint: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const body = (await response.json().catch(() => null)) as { job?: ImportJob } | null;

  if (!response.ok || !body?.job) {
    console.error("[Canva] Get import job failed:", response.status, body);
    throw new CanvaApiError("request_failed", `Canva returned an unexpected response (${response.status}) while checking the import job.`);
  }

  return body.job;
}

/**
 * Imports a `.pptx` (built by `lib/canva/pptx-builder.ts` — either
 * `buildPostPptx`'s single slide or `buildCarouselPptx`'s multi-slide deck,
 * this endpoint doesn't care which) as a new Canva design, polling until
 * the async job resolves. Returns just what the caller needs to persist and
 * hand back to the browser — never the raw Canva job/response body, which
 * could carry vendor diagnostic detail. Format-agnostic despite the
 * original Post-only name this function shipped with — renamed once a
 * second caller (Carousel) needed the identical logic.
 */
export async function importDesign(
  accessToken: string,
  pptxBuffer: Buffer,
  title: string
): Promise<ImportedDesign> {
  const jobId = await createImportJob(accessToken, pptxBuffer, title);

  const startedAt = Date.now();
  let job = await getImportJob(accessToken, jobId);

  while (job.status === "in_progress") {
    if (Date.now() - startedAt > MAX_POLL_MS) {
      throw new CanvaApiError("timeout", "Canva's design import is taking longer than expected. Please try again.");
    }
    await sleep(POLL_INTERVAL_MS);
    job = await getImportJob(accessToken, jobId);
  }

  if (job.status === "failed") {
    console.error("[Canva] Import job failed:", job.error);
    throw new CanvaApiError(
      "request_failed",
      job.error?.code === "invalid_file"
        ? "Canva couldn't import the generated design file."
        : "Canva was unable to complete the design import."
    );
  }

  const design = job.result?.designs[0];
  if (!design) {
    throw new CanvaApiError("invalid_response", "Canva's import job succeeded but returned no design.");
  }

  return {
    designId: design.id,
    editUrl: design.urls.edit_url,
    viewUrl: design.urls.view_url,
  };
}
