import { NextRequest, NextResponse } from "next/server";
import {
  appendApplicationToSheet,
  overwriteSheetWithApplications,
  isSheetsConfigured,
  readApplicationsFromSheet,
} from "@/lib/sheets";
import type { Application } from "@/lib/types";

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action");
  
  // ?action=read — fetch applications from sheet
  if (action === "read") {
    if (!isSheetsConfigured()) {
      return NextResponse.json({ applications: [] });
    }
    try {
      const applications = await readApplicationsFromSheet();
      return NextResponse.json({ applications });
    } catch (err) {
      console.error("Sheets read error:", err);
      return NextResponse.json({ applications: [] });
    }
  }
  
  // Default: just return configured status
  return NextResponse.json({ configured: isSheetsConfigured() });
}

export async function POST(req: NextRequest) {
  if (!isSheetsConfigured()) {
    return NextResponse.json(
      {
        error:
          "Google Sheets not configured. Set GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_PRIVATE_KEY in .env.local",
      },
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
        // overwriteSheetWithApplications handles headers + clear + rewrite atomically
        await overwriteSheetWithApplications(body.applications ?? []);
        break;

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Sheets error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sheets operation failed" },
      { status: 500 }
    );
  }
}
