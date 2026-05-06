import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, parseISO, isValid, differenceInDays } from "date-fns";
import type { Application, DashboardStats, VelocityDataPoint } from "./types";
import { ACTIVE_STATUSES } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
