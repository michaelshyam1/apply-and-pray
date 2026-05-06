import { NextRequest, NextResponse } from "next/server";
import {
  appendApplicationToSheet,
  overwriteSheetWithApplications,
  readApplicationsFromSheet,
  isSheetsConfigured,
} from "@/lib/sheets";
import type { Application } from "@/lib/types";

/**
 * GET /api/sheets
 * Returns { configured, applications } — the frontend always gets both pieces
 * so it can hydrate state or show an offline warning in one round-trip.
 */
export async function GET() {
  if (!isSheetsConfigured()) {
    return NextResponse.json({ configured: false, applications: [] });
  }

  try {
    const applications = await readApplicationsFromSheet();
    return NextResponse.json({ configured: true, applications });
  } catch (err) {
    console.error("[sheets GET] read failed:", err);
    return NextResponse.json(
      { configured: true, applications: [], error: err instanceof Error ? err.message : "Read failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!isSheetsConfigured()) {
    return NextResponse.json(
      { error: "Google Sheets not configured. Set GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_PRIVATE_KEY in .env.local" },
      { status: 503 }
    );
  }

  try {
    const body = await req.json() as {
      action: "append" | "sync";
      application?: Application;
      applications?: Application[];
    };

    switch (body.action) {
      case "append":
        if (!body.application) {
          return NextResponse.json({ error: "Missing application" }, { status: 400 });
        }
        await appendApplicationToSheet(body.application);
        break;

      case "sync":
        await overwriteSheetWithApplications(body.applications ?? []);
        break;

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[sheets POST] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sheets operation failed" },
      { status: 500 }
    );
  }
}
