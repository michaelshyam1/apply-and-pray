import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, parseISO, isValid, differenceInDays } from "date-fns";
import type { Application, DashboardStats, VelocityDataPoint, ExtractionResult } from "./types";
import { ACTIVE_STATUSES } from "./constants";

// ── Duplicate detection ───────────────────────────────────────────────────────

export interface DuplicateMatch {
  existingApp: Application;
  /** 'url' is a definitive match; 'company-role' is a fuzzy match. */
  reason: "url" | "company-role";
}

/**
 * Check whether a candidate application already exists in the list.
 * URL match takes priority (exact); falls back to normalised company + role.
 */
export function isDuplicateApplication(
  applications: Application[],
  candidate: Pick<ExtractionResult, "url" | "company" | "role">
): DuplicateMatch | null {
  // 1. URL match — strongest signal
  if (
    candidate.url &&
    (candidate.url.startsWith("http://") || candidate.url.startsWith("https://"))
  ) {
    const urlMatch = applications.find((a) => a.url === candidate.url);
    if (urlMatch) return { existingApp: urlMatch, reason: "url" };
  }

  // 2. Company + role fuzzy match (case-insensitive, trimmed)
  const company = candidate.company?.toLowerCase().trim() ?? "";
  const role    = candidate.role?.toLowerCase().trim()    ?? "";
  if (company && role) {
    const nameMatch = applications.find(
      (a) =>
        a.company.toLowerCase().trim() === company &&
        a.role.toLowerCase().trim()    === role
    );
    if (nameMatch) return { existingApp: nameMatch, reason: "company-role" };
  }

  return null;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a stable, deterministic ID from company + role + date.
 * Used by both the client hook and the server sheet reader so both contexts
 * assign the same ID to the same application record.
 * Based on FNV-1a 32-bit hash.
 */
export function stableId(company: string, role: string, dateApplied: string): string {
  const str = `${company.trim().toLowerCase()}|${role.trim().toLowerCase()}|${dateApplied.trim()}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return dateStr;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function formatRelativeDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return dateStr;
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export function daysUntilDeadline(deadline: string | undefined): number | null {
  if (!deadline) return null;
  try {
    const date = parseISO(deadline);
    if (!isValid(date)) return null;
    return differenceInDays(date, new Date());
  } catch {
    return null;
  }
}

export function computeStats(applications: Application[]): DashboardStats {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const total = applications.length;
  const active = applications.filter((a) =>
    ACTIVE_STATUSES.includes(a.status)
  ).length;
  const offers = applications.filter((a) => a.status === "Offer").length;
  const rejected = applications.filter((a) => a.status === "Rejected").length;

  // Response rate = % of submitted applications that got any reply
  // (Interview, Final Round, Offer, or Rejected — anything past "Applied")
  // "To Apply" and "Withdrawn" are excluded from both numerator and denominator.
  const submitted = applications.filter(
    (a) => a.status !== "To Apply" && a.status !== "Withdrawn"
  ).length;
  const responded = applications.filter(
    (a) => a.status === "Interview" || a.status === "Final Round" ||
            a.status === "Offer" || a.status === "Rejected"
  ).length;
  const responseRate = submitted > 0 ? Math.round((responded / submitted) * 100) : 0;

  const thisWeek = applications.filter((a) => {
    try {
      return parseISO(a.dateApplied) >= weekAgo;
    } catch {
      return false;
    }
  }).length;

  const thisMonth = applications.filter((a) => {
    try {
      return parseISO(a.dateApplied) >= monthAgo;
    } catch {
      return false;
    }
  }).length;

  return { total, active, offers, rejected, responseRate, thisWeek, thisMonth };
}

export function computeVelocityData(
  applications: Application[],
  days = 30
): VelocityDataPoint[] {
  const now = new Date();
  const data: VelocityDataPoint[] = [];

  const sorted = [...applications].sort(
    (a, b) => parseISO(a.dateApplied).getTime() - parseISO(b.dateApplied).getTime()
  );

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split("T")[0];

    const count = sorted.filter((a) => a.dateApplied === dateStr).length;
    const cumulative = sorted.filter(
      (a) => parseISO(a.dateApplied) <= date
    ).length;

    data.push({ date: dateStr, count, cumulative });
  }

  return data;
}

export function detectDuplicates(
  applications: Application[],
  company: string,
  role: string
): Application | undefined {
  const norm = (s: string) => s.toLowerCase().trim();
  return applications.find(
    (a) => norm(a.company) === norm(company) && norm(a.role) === norm(role)
  );
}

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
