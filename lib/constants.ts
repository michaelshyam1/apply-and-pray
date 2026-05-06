import type { ApplicationStatus, ApplicationCategory } from "./types";

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "To Apply",
  "Applied",
  "Interview",
  "Final Round",
  "Offer",
  "Rejected",
  "Withdrawn",
];

export const APPLICATION_CATEGORIES: ApplicationCategory[] = [
  "SWE",
  "Data",
  "Quant",
  "Finance",
  "Research",
  "Government",
  "Other",
];

export const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  "To Apply": {
    label: "To Apply",
    color: "text-zinc-300",
    bg: "bg-zinc-500/10",
    border: "border-zinc-500/20",
    dot: "bg-zinc-400",
  },
  Applied: {
    label: "Applied",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    dot: "bg-blue-400",
  },
  Interview: {
    label: "Interview",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    dot: "bg-orange-400",
  },
  "Final Round": {
    label: "Final Round",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    dot: "bg-purple-400",
  },
  Offer: {
    label: "Offer",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  Rejected: {
    label: "Rejected",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    dot: "bg-red-400",
  },
  Withdrawn: {
    label: "Withdrawn",
    color: "text-zinc-400",
    bg: "bg-zinc-500/10",
    border: "border-zinc-500/20",
    dot: "bg-zinc-400",
  },
};

export const CATEGORY_CONFIG: Record<
  ApplicationCategory,
  { label: string; color: string; bg: string; border: string }
> = {
  SWE: {
    label: "SWE",
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
  },
  Data: {
    label: "Data",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
  },
  Quant: {
    label: "Quant",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  Finance: {
    label: "Finance",
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
  },
  Research: {
    label: "Research",
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
  },
  Government: {
    label: "Gov",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  Other: {
    label: "Other",
    color: "text-zinc-400",
    bg: "bg-zinc-500/10",
    border: "border-zinc-500/20",
  },
};

export const SHEETS_COLUMNS = [
  "Date Applied",
  "Company",
  "Role",
  "Category",
  "Location",
  "Status",
  "Deadline",
  "Salary",
  "Notes",
  "URL",
] as const;

export const ACTIVE_STATUSES: ApplicationStatus[] = [
  "To Apply",
  "Applied",
  "Interview",
  "Final Round",
];

export const DEADLINE_WARNING_DAYS = 7;
