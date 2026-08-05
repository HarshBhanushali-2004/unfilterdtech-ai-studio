/**
 * TEMPORARY DIAGNOSTIC SCRIPT — not part of the app, safe to delete.
 * Does not modify any application code, provider, or .env.local.
 *
 * Tests every configured Gemini API key (GEMINI_API_KEY, GEMINI_API_KEY_2..5)
 * against the real Developer API to determine which one actually has image
 * generation enabled.
 *
 * For each key:
 *   1. Calls ai.models.list() to discover this key's real available models
 *      (no hardcoded/guessed model names).
 *   2. Filters to image-generation-capable models and picks the newest.
 *   3. Generates one test image using the current API for that model's
 *      family — generateContent + responseModalities:[IMAGE] for Gemini's
 *      native image-output models, generateImages for the Imagen family
 *      (generateImages is deprecated for Gemini-native models but is still
 *      the correct/current method for Imagen).
 *   4. Prints a fixed-format result block, classifying any failure.
 *
 * Run with:  npx tsx test-gemini-image.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { GoogleGenAI, Modality } from "@google/genai";
import * as fs from "fs";

const PROMPT = "A futuristic blue robot standing in a clean white studio.";

const KEY_ENV_VARS = [
  "GEMINI_API_KEY",
  "GEMINI_API_KEY_2",
  "GEMINI_API_KEY_3",
  "GEMINI_API_KEY_4",
  "GEMINI_API_KEY_5",
] as const;

type ModelInfo = {
  name: string; // e.g. "models/gemini-3.1-flash-image"
  displayName: string;
  supportedActions: string[];
};

type FailureReason =
  | "quota exhausted"
  | "image generation not enabled"
  | "permission denied"
  | "model unavailable"
  | "billing required"
  | "other";

type Classified = {
  code: string;
  message: string;
  reason: FailureReason;
};

/** Extracts a comparable version number from a model resource name, e.g. "models/gemini-3.1-flash-image" -> 301. */
function versionScore(name: string): number {
  const match = name.match(/(\d+)(?:\.(\d+))?/);
  if (!match) return 0;
  const major = Number(match[1]);
  const minor = match[2] ? Number(match[2]) : 0;
  return major * 100 + minor;
}

/** Same image-capability filter validated against the live API: Imagen family reports "predict", Gemini-native image-out models only report "generateContent" and are distinguished by name. */
function isImageCapable(m: ModelInfo): boolean {
  const actions = m.supportedActions.map((a) => a.toLowerCase());
  const haystack = `${m.name} ${m.displayName}`.toLowerCase();
  return (
    (actions.includes("predict") && /imagen/.test(haystack)) ||
    (actions.includes("generatecontent") && /image|imagen|nano-banana/.test(haystack))
  );
}

function isImagenFamily(m: ModelInfo): boolean {
  return (
    m.supportedActions.map((a) => a.toLowerCase()).includes("predict") ||
    /imagen/i.test(m.name)
  );
}

function byNewestWithinFamily(a: ModelInfo, b: ModelInfo): number {
  const diff = versionScore(b.name) - versionScore(a.name);
  if (diff !== 0) return diff;
  const aPreview = /preview|exp\b/i.test(a.name) ? 1 : 0;
  const bPreview = /preview|exp\b/i.test(b.name) ? 1 : 0;
  return aPreview - bPreview;
}

/**
 * Picks the newest image-capable model, preferring the Gemini-native
 * generateContent family over the Imagen/generateImages family — per
 * Google's own SDK deprecation notice ("generateImages is deprecated...
 * use generateContent with image models instead"), not by comparing raw
 * version numbers across the two product lines. Imagen's "4.0" and
 * Gemini's "3.1" use independent numbering schemes, so a numeric
 * comparison across families would be meaningless; version numbers are
 * only compared within the same family. Falls back to the newest Imagen
 * model only if this key has no Gemini-native candidate at all.
 */
function pickNewest(models: ModelInfo[]): ModelInfo | null {
  const geminiNative = models.filter((m) => !isImagenFamily(m)).sort(byNewestWithinFamily);
  if (geminiNative.length > 0) return geminiNative[0];

  const imagen = models.filter(isImagenFamily).sort(byNewestWithinFamily);
  return imagen[0] ?? null;
}

/** Turns a thrown error (ApiError or otherwise) into a fixed code/message/reason classification. */
function classifyError(err: unknown): Classified {
  const rawMessage = err instanceof Error ? err.message : String(err);
  let status = err && typeof err === "object" && "status" in err ? Number((err as { status: unknown }).status) || 0 : 0;
  let nestedStatus = "";
  let nestedMessage = rawMessage;

  try {
    const parsed = JSON.parse(rawMessage);
    if (parsed?.error) {
      nestedStatus = String(parsed.error.status ?? "");
      nestedMessage = String(parsed.error.message ?? rawMessage);
      if (!status && parsed.error.code) status = Number(parsed.error.code) || 0;
    }
  } catch {
    // Not a JSON error body — use the raw message as-is.
  }

  const haystack = `${nestedStatus} ${nestedMessage}`.toLowerCase();

  let reason: FailureReason = "other";
  if (status === 429 || nestedStatus === "RESOURCE_EXHAUSTED" || haystack.includes("quota")) {
    reason = "quota exhausted";
  } else if (haystack.includes("billing")) {
    reason = "billing required";
  } else if (haystack.includes("image generation") && /not enabled|not supported|disabled/.test(haystack)) {
    reason = "image generation not enabled";
  } else if (status === 404 || nestedStatus === "NOT_FOUND" || /no longer available|not found/.test(haystack)) {
    reason = "model unavailable";
  } else if (status === 403 || nestedStatus === "PERMISSION_DENIED") {
    reason = "permission denied";
  }

  return {
    code: status ? String(status) : nestedStatus || "unknown",
    message: nestedMessage,
    reason,
  };
}

function printBlock(fields: {
  keyNumber: number;
  keyPrefix: string;
  modelUsed: string;
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  errorCode?: string;
  errorMessage?: string;
  reason?: FailureReason;
}) {
  console.log("----------------------------------------");
  console.log(`Testing KEY #${fields.keyNumber}`);
  console.log(`Project key prefix: ${fields.keyPrefix}`);
  console.log(`Model used: ${fields.modelUsed}`);
  console.log(`Status: ${fields.status}`);
  console.log(`Error code: ${fields.errorCode ?? "-"}`);
  console.log(`Error message: ${fields.errorMessage ?? "-"}`);
  if (fields.reason) {
    console.log(`Failure reason: ${fields.reason}`);
  }
  console.log("----------------------------------------");
}

async function testKey(keyNumber: number, apiKey: string): Promise<boolean> {
  const keyPrefix = `${apiKey.slice(0, 12)}…`;
  const ai = new GoogleGenAI({ apiKey });

  let candidates: ModelInfo[] = [];
  try {
    const pager = await ai.models.list({ config: { queryBase: true, pageSize: 100 } });
    const all: ModelInfo[] = [];
    for await (const model of pager) {
      all.push({
        name: model.name ?? "",
        displayName: model.displayName ?? "",
        supportedActions: model.supportedActions ?? [],
      });
    }
    candidates = all.filter(isImageCapable);
  } catch (err) {
    const c = classifyError(err);
    printBlock({
      keyNumber,
      keyPrefix,
      modelUsed: "(models.list failed)",
      status: "FAILED",
      errorCode: c.code,
      errorMessage: c.message,
      reason: c.reason,
    });
    return false;
  }

  const chosen = pickNewest(candidates);
  if (!chosen) {
    printBlock({
      keyNumber,
      keyPrefix,
      modelUsed: "(none — no image-generation-capable model visible to this key)",
      status: "FAILED",
      errorCode: "-",
      errorMessage: "No image-generation-capable models were returned by models.list() for this key.",
      reason: "image generation not enabled",
    });
    return false;
  }

  const modelId = chosen.name.replace(/^models\//, "");

  try {
    if (isImagenFamily(chosen)) {
      const response = await ai.models.generateImages({
        model: modelId,
        prompt: PROMPT,
        config: { numberOfImages: 1 },
      });
      const image = response.generatedImages?.[0]?.image;
      if (!image?.imageBytes) throw new Error("generateImages returned no image bytes.");
      fs.writeFileSync("gemini-test.png", Buffer.from(image.imageBytes, "base64"));
    } else {
      const response = await ai.models.generateContent({
        model: modelId,
        contents: PROMPT,
        config: { responseModalities: [Modality.IMAGE] },
      });
      const inlineData =
        response.data ??
        response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData?.data;
      if (!inlineData) throw new Error("generateContent returned no inline image data.");
      fs.writeFileSync("gemini-test.png", Buffer.from(inlineData, "base64"));
    }

    printBlock({
      keyNumber,
      keyPrefix,
      modelUsed: chosen.name,
      status: "SUCCESS",
    });
    console.log("SUCCESS");
    console.log(`API KEY #${keyNumber} works for image generation`);
    return true;
  } catch (err) {
    const c = classifyError(err);
    printBlock({
      keyNumber,
      keyPrefix,
      modelUsed: chosen.name,
      status: "FAILED",
      errorCode: c.code,
      errorMessage: c.message,
      reason: c.reason,
    });
    return false;
  }
}

async function main() {
  const keys: { number: number; envName: string; value: string }[] = [];
  KEY_ENV_VARS.forEach((envName, i) => {
    const value = process.env[envName]?.trim();
    if (value) keys.push({ number: i + 1, envName, value });
  });

  if (keys.length === 0) {
    console.error("No GEMINI_API_KEY* variables found in .env.local.");
    process.exit(1);
  }

  console.log(`Found ${keys.length} configured key(s): ${keys.map((k) => k.envName).join(", ")}\n`);

  const workingKeys: number[] = [];
  for (const key of keys) {
    const ok = await testKey(key.number, key.value);
    if (ok) workingKeys.push(key.number);
    console.log("");
  }

  console.log("========================================");
  if (workingKeys.length > 0) {
    console.log(`Working key(s) for image generation: ${workingKeys.map((n) => `#${n}`).join(", ")}`);
  } else {
    console.log("No configured key currently works for image generation — see failure reasons above.");
  }
  console.log("========================================");
}

main().catch((err) => {
  console.error("\nDiagnostic script crashed:\n", err);
  process.exit(1);
});
