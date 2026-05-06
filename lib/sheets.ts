import { google } from "googleapis";
import type { Application } from "./types";
import { SHEETS_COLUMNS } from "./constants";

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let key = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !key) {
    console.error("[sheets] Missing credentials:", {
      email: !!email,
      key: !!key,
    });
    throw new Error(
      "Google service account not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in .env.local"
    );
  }

  // Normalize the key: convert literal \n sequences to actual newlines
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

export function isSheetsConfigured(): boolean {
  return !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_SHEET_ID
  );
}

function rowToApplication(row: (string | number | boolean)[]): Application | null {
  if (row.length < 6) return null;
  return {
    id: "", // IDs are managed locally
    dateApplied: String(row[0]) || "",
    company: String(row[1]) || "Unknown",
    role: String(row[2]) || "Unknown",
    category: (String(row[3]) || "Other") as any,
    location: String(row[4]) || "Remote",
    status: (String(row[5]) || "Applied") as any,
    deadline: row[6] ? String(row[6]) : undefined,
    salary: row[7] ? String(row[7]) : undefined,
    notes: row[8] ? String(row[8]) : undefined,
    url: row[9] ? String(row[9]) : undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/** Read all applications from the sheet (excluding header). */
export async function readApplicationsFromSheet(): Promise<Application[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: getSheetId(),
      range: `${getSheetName()}!A2:J`,
    });

    const rows = response.data.values || [];
    const applications = rows
      .map(rowToApplication)
      .filter((app): app is Application => app !== null);

    console.log(`[sheets] read ${applications.length} applications from sheet`);
    return applications;
  } catch (err) {
    console.error("[sheets] read error:", err);
    return [];
  }
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

/** Append a single new application row. Does not touch existing rows. */
export async function appendApplicationToSheet(application: Application): Promise<void> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  console.log("[sheets] append — URL written to sheet:", safeUrl(application.url) || "(none)");

  await sheets.spreadsheets.values.append({
    spreadsheetId: getSheetId(),
    range: `${getSheetName()}!A:J`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [applicationToRow(application)] },
  });
}

/**
 * Replace ALL data rows with the current application list.
 *
 * Strategy:
 *   1. Ensure headers exist in A1:J1.
 *   2. Clear A2:J (all existing data rows — avoids ghost rows from deleted entries).
 *   3. If applications is non-empty, write rows starting at A2.
 *
 * This guarantees the sheet matches the app state exactly, even when rows
 * have been deleted locally.
 */
export async function overwriteSheetWithApplications(
  applications: Application[]
): Promise<void> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = getSheetId();
  const sheetName = getSheetName();

  // Step 1 — Ensure header row is present
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1:J1`,
    valueInputOption: "RAW",
    requestBody: { values: [SHEETS_COLUMNS as unknown as string[]] },
  });

  // Step 2 — Wipe all existing data rows
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${sheetName}!A2:J`,
  });

  // Step 3 — Write current applications (skip if empty — sheet is already clean)
  if (applications.length > 0) {
    console.log(
      `[sheets] overwrite — writing ${applications.length} row(s). URLs:`,
      applications.map((a) => safeUrl(a.url) || "(none)")
    );
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A2`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: applications.map(applicationToRow) },
    });
  } else {
    console.log("[sheets] overwrite — no applications; sheet cleared to headers only");
  }
}
