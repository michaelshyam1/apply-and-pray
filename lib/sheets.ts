import { google } from "googleapis";
import type { Application, ApplicationCategory, ApplicationStatus } from "./types";
import { SHEETS_COLUMNS } from "./constants";
import { stableId } from "./utils";

// ── Auth ─────────────────────────────────────────────────────────────────────

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let key = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !key) {
    throw new Error(
      "Google service account not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in .env.local"
    );
  }

  key = key.replace(/\\n/g, "\n");

  return new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: key },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error("GOOGLE_SHEET_ID not set in .env.local");
  return id;
}

function getSheetName(): string {
  return process.env.GOOGLE_SHEET_NAME ?? "Applications";
}

// ── Row ↔ Application ─────────────────────────────────────────────────────────

function safeUrl(url: string | undefined): string {
  if (!url) return "";
  return url.startsWith("http://") || url.startsWith("https://") ? url : "";
}

function applicationToRow(app: Application): string[] {
  return [
    app.dateApplied,
    app.company,
    app.role,
    app.category,
    app.location,
    app.status,
    app.deadline ?? "",
    app.salary ?? "",
    app.notes ?? "",
    safeUrl(app.url),
  ];
}

function rowToApplication(row: (string | number | boolean)[]): Application | null {
  if (row.length < 2) return null;

  const dateApplied = String(row[0] ?? "").trim();
  const company     = String(row[1] ?? "").trim() || "Unknown";
  const role        = String(row[2] ?? "").trim() || "Unknown";

  return {
    id:          stableId(company, role, dateApplied),
    dateApplied,
    company,
    role,
    category:    (String(row[3] ?? "Other"))  as ApplicationCategory,
    location:    String(row[4] ?? "Remote"),
    status:      (String(row[5] ?? "To Apply")) as ApplicationStatus,
    deadline:    row[6] ? String(row[6]) : undefined,
    salary:      row[7] ? String(row[7]) : undefined,
    notes:       row[8] ? String(row[8]) : undefined,
    url:         row[9] ? String(row[9]) : undefined,
    createdAt:   new Date().toISOString(),
    updatedAt:   new Date().toISOString(),
  };
}

// ── Public helpers ────────────────────────────────────────────────────────────

export function isSheetsConfigured(): boolean {
  return !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_SHEET_ID
  );
}

/** Read all data rows from the sheet and return as Application objects. */
export async function readApplicationsFromSheet(): Promise<Application[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: `${getSheetName()}!A2:J`,
  });

  const rows = response.data.values ?? [];
  const applications = rows
    .map(rowToApplication)
    .filter((a): a is Application => a !== null);

  console.log(`[sheets] read ${applications.length} row(s)`);
  return applications;
}

/** Write the header row to A1:J1. Safe to call repeatedly. */
export async function initializeSheet(): Promise<void> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.update({
    spreadsheetId: getSheetId(),
    range: `${getSheetName()}!A1:J1`,
    valueInputOption: "RAW",
    requestBody: { values: [SHEETS_COLUMNS as unknown as string[]] },
  });
}

/** Append a single new application row without touching existing rows. */
export async function appendApplicationToSheet(application: Application): Promise<void> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  console.log("[sheets] append — URL:", safeUrl(application.url) || "(none)");

  await sheets.spreadsheets.values.append({
    spreadsheetId: getSheetId(),
    range: `${getSheetName()}!A:J`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [applicationToRow(application)] },
  });
}

/**
 * Clear all data rows (A2:J) then rewrite from the current application list.
 * Guarantees the sheet matches dashboard state exactly — no ghost rows.
 */
export async function overwriteSheetWithApplications(
  applications: Application[]
): Promise<void> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = getSheetId();
  const sheetName = getSheetName();

  // 1 — Headers
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1:J1`,
    valueInputOption: "RAW",
    requestBody: { values: [SHEETS_COLUMNS as unknown as string[]] },
  });

  // 2 — Clear data rows
  await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${sheetName}!A2:J` });

  // 3 — Write
  if (applications.length > 0) {
    console.log(`[sheets] overwrite — ${applications.length} row(s). URLs:`,
      applications.map((a) => safeUrl(a.url) || "(none)"));
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A2`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: applications.map(applicationToRow) },
    });
  } else {
    console.log("[sheets] overwrite — empty; headers only");
  }
}
