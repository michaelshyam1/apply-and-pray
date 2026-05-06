import { load } from "cheerio";
import type { ExtractionResult } from "./types";
import { APPLICATION_CATEGORIES, APPLICATION_STATUSES } from "./constants";

// ─── Provider selection ─────────────────────────────────────────────────────────
// Ollama only — no cloud API dependencies

export type AIProvider = "ollama";

export function getProvider(): AIProvider {
  return "ollama";
}

// ─── Vision capability detection ───────────────────────────────────────────────

const VISION_KEYWORDS = ["vl", "vision", "llava", "bakllava", "moondream", "minicpm-v"];

function isVisionModel(name: string): boolean {
  const lower = name.toLowerCase();
  return VISION_KEYWORDS.some((kw) => lower.includes(kw));
}

// ─── Shared prompt ──────────────────────────────────────────────────────────────

const STATUSES_LIST = APPLICATION_STATUSES.join(", ");
const CATEGORIES_LIST = APPLICATION_CATEGORIES.join(", ");

const EXTRACTION_PROMPT = `You are an expert at extracting job application details from job postings.

Extract the following fields. Return ONLY valid JSON — no markdown fences, no explanation, no extra text.

Fields to extract:
- company: Company name (string)
- role: Job title/role (string)
- location: City, State, country, or "Remote" (string)
- status: One of [${STATUSES_LIST}]. Default to "To Apply" if not yet applied. Use "Applied" if an application was submitted. Use "Interview" if any interview stage is mentioned.
- category: One of [${CATEGORIES_LIST}] — classify based on the role title
- deadline: Application deadline in YYYY-MM-DD format if visible (string or null)
- salary: Compensation range or hourly rate if visible (string or null)
- url: Job posting URL if visible in the content (string or null)
- notes: Any other useful details — recruiter name, application round, portal name, etc. (string or null)
- confidence: Overall confidence in this extraction, 0–100 (number)
- uncertainFields: Array of field names you are less than 70% confident about, e.g. ["salary", "deadline"] (string[])

Category classification guide:
- SWE: Software engineer, developer, fullstack, backend, frontend, mobile, platform, DevOps, infra
- Data: Data scientist, data engineer, data analyst, ML engineer, AI/ML
- Quant: Quantitative researcher, quant trader, quant developer, algo trading
- Finance: Investment banking, PE, VC, accounting, financial analyst, corporate finance
- Research: Research scientist, research engineer (non-ML), lab research
- Government: Government, policy, public sector, defense, intelligence
- Other: Anything else

Return exactly this JSON structure (no trailing commas, valid JSON):
{
  "company": "...",
  "role": "...",
  "location": "...",
  "status": "To Apply",
  "category": "SWE",
  "deadline": null,
  "salary": null,
  "url": null,
  "notes": null,
  "confidence": 80,
  "uncertainFields": []
}`;

// ─── Response parser ────────────────────────────────────────────────────────────

function parseResponse(raw: string): ExtractionResult {
  // Strip markdown fences and leading/trailing whitespace
  const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();

  // Find the JSON object — some models output prose before/after
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error(
      "Model returned no JSON object. Try again or check that the model is working correctly."
    );
  }

  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as ExtractionResult;
  } catch {
    throw new Error(
      "Model returned malformed JSON. The model may not be following instructions well — try a larger model."
    );
  }
}

// ─── Ollama ─────────────────────────────────────────────────────────────────────

const OLLAMA_TIMEOUT_MS = 120_000;

async function ollamaGenerate(prompt: string, images?: string[]): Promise<string> {
  const baseUrl = (process.env.OLLAMA_URL ?? "http://localhost:11434").replace(/\/$/, "");
  const model = process.env.OLLAMA_MODEL ?? "llama3.2:3b";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

  try {
    const res = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        prompt,
        ...(images ? { images } : {}),
        stream: false,
        options: { temperature: 0.1 },
      }),
    });
    clearTimeout(timer);

    if (res.status === 404) {
      throw new Error(
        `Model "${model}" not found in Ollama. Pull it with:\n  ollama pull ${model}`
      );
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Ollama returned HTTP ${res.status}${body ? `: ${body}` : ""}`);
    }

    const data = await res.json() as { response?: string; error?: string };
    if (data.error) throw new Error(`Ollama error: ${data.error}`);
    if (!data.response) throw new Error("Ollama returned an empty response");

    return data.response;
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        throw new Error(
          "Ollama did not respond within 120 s. The model may still be loading — try again in a moment."
        );
      }
      if (
        err.message.includes("ECONNREFUSED") ||
        err.message.includes("fetch failed") ||
        err.message.includes("ENOTFOUND")
      ) {
        throw new Error(
          "Ollama is not running. Start it with:\n  ollama serve"
        );
      }
    }
    throw err;
  }
}

async function extractFromTextOllama(
  text: string,
  sourceUrl?: string
): Promise<ExtractionResult> {
  const prompt = `${EXTRACTION_PROMPT}\n\nHere is the job posting content to analyze:\n\n${text}`;
  const raw = await ollamaGenerate(prompt);
  const result = parseResponse(raw);
  // sourceUrl (the original user-pasted URL) always wins over any URL the model
  // may have extracted from page text — models hallucinate or rewrite URLs.
  const finalUrl = sourceUrl ?? (isValidUrl(result.url) ? result.url : undefined);
  return { ...result, url: finalUrl };
}

async function extractFromScreenshotOllama(base64Image: string): Promise<ExtractionResult> {
  const model = process.env.OLLAMA_MODEL ?? "llama3.2:3b";

  if (!isVisionModel(model)) {
    throw new Error(
      `Model "${model}" is text-only and cannot process images.\n` +
      `Switch to a vision model (e.g. OLLAMA_MODEL=qwen2.5vl:7b) or use URL extraction instead.`
    );
  }

  const raw = await ollamaGenerate(EXTRACTION_PROMPT, [base64Image]);
  return parseResponse(raw);
}



// ─── Public API ─────────────────────────────────────────────────────────────────

export async function extractFromText(
  text: string,
  sourceUrl?: string
): Promise<ExtractionResult> {
  return extractFromTextOllama(text, sourceUrl);
}

export async function extractFromScreenshot(
  base64Image: string,
  mimeType: string = "image/png"
): Promise<ExtractionResult> {
  return extractFromScreenshotOllama(base64Image);
}

// ─── URL utilities & fetcher ────────────────────────────────────────────────────

/** Returns true only for http:// or https:// URLs — rejects model hallucinations. */
export function isValidUrl(url: string | undefined | null): url is string {
  if (!url) return false;
  return url.startsWith("http://") || url.startsWith("https://");
}

export function looksLikeUrl(input: string): boolean {
  const trimmed = input.trim();
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const FETCH_TIMEOUT_MS = 10_000;
const TEXT_CHAR_LIMIT = 12_000;
const MIN_USEFUL_TEXT = 150;

export async function fetchJobPostingText(rawUrl: string): Promise<string> {
  const url = rawUrl.trim();

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL — make sure it starts with https://");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http:// and https:// URLs are supported");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let html: string;
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,*/*;q=0.9",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(timer);

    if (res.status === 403 || res.status === 401) {
      throw new Error(
        "This page blocks automated access (403). Use screenshot mode or paste the job description text instead."
      );
    }
    if (res.status === 404) {
      throw new Error("Job posting not found (404). The listing may have closed.");
    }
    if (!res.ok) {
      throw new Error(
        `Page returned HTTP ${res.status}. Try pasting the job description text directly.`
      );
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) {
      throw new Error(
        "URL did not return an HTML page. Paste the job description text instead."
      );
    }

    html = await res.text();
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Page took too long to load (10 s timeout). Try screenshot mode instead.");
    }
    throw err;
  }

  // ── Parse with cheerio ─────────────────────────────────────────────────────
  const $ = load(html);

  const title = $("title").first().text().trim();
  const ogTitle = $('meta[property="og:title"]').attr("content")?.trim() ?? "";
  const ogDesc = $('meta[property="og:description"]').attr("content")?.trim() ?? "";
  const metaDesc = $('meta[name="description"]').attr("content")?.trim() ?? "";

  // Strip noise
  $(
    "script, style, noscript, iframe, svg, " +
    "nav, footer, header, aside, " +
    '[role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"], ' +
    ".cookie-banner, .cookie-consent, #cookie, " +
    ".ad, .advertisement, .promo, .sidebar, #sidebar"
  ).remove();

  const bodyText = $("body")
    .text()
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (bodyText.length < MIN_USEFUL_TEXT) {
    throw new Error(
      "Not enough readable text found on this page. " +
      "The site likely uses JavaScript rendering or blocks scraping. " +
      "Paste the job description text directly instead."
    );
  }

  const parts = [
    title && `Title: ${title}`,
    ogTitle && ogTitle !== title && `OG Title: ${ogTitle}`,
    ogDesc && `OG Description: ${ogDesc}`,
    metaDesc && `Meta Description: ${metaDesc}`,
    `\nPage content:\n${bodyText}`,
  ].filter(Boolean) as string[];

  const combined = parts.join("\n");
  return combined.length > TEXT_CHAR_LIMIT
    ? combined.slice(0, TEXT_CHAR_LIMIT) + "\n[truncated]"
    : combined;
}
