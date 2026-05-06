import { NextRequest, NextResponse } from "next/server";
import {
  extractFromScreenshot,
  extractFromText,
  fetchJobPostingText,
  looksLikeUrl,
} from "@/lib/ai-provider";

export async function GET() {
  return NextResponse.json({
    provider: "ollama",
    model: process.env.OLLAMA_MODEL ?? "llama3.2:3b",
  });
}

export async function POST(req: NextRequest) {
  let body: { image?: string; mimeType?: string; text?: string };
  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    // ── Screenshot path ──────────────────────────────────────────────────────
    if (body.image) {
      const result = await extractFromScreenshot(
        body.image,
        body.mimeType ?? "image/png"
      );
      return NextResponse.json(result);
    }

    // ── Text / URL path ──────────────────────────────────────────────────────
    if (body.text) {
      const input = body.text.trim();

      if (looksLikeUrl(input)) {
        console.log("[extract] sourceUrl received:", input);
        const pageText = await fetchJobPostingText(input);
        const result = await extractFromText(pageText, input);
        console.log("[extract] final URL written to result:", result.url ?? "(none)");
        return NextResponse.json(result);
      }

      // Plain text — send directly, no sourceUrl
      const result = await extractFromText(input);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Provide image (screenshot) or text (URL or job description)" },
      { status: 400 }
    );
  } catch (err) {
    console.error("Extraction error:", err);
    const message = err instanceof Error ? err.message : "Extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
