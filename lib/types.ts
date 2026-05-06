export type ApplicationStatus =
  | "To Apply"
  | "Applied"
  | "Interview"
  | "Final Round"
  | "Offer"
  | "Rejected"
  | "Withdrawn";

export type ApplicationCategory =
  | "SWE"
  | "Data"
  | "Quant"
  | "Finance"
  | "Research"
  | "Government"
  | "Other";

export interface Application {
  id: string;
  dateApplied: string;
  company: string;
  role: string;
  category: ApplicationCategory;
  location: string;
  status: ApplicationStatus;
  deadline?: string;
  salary?: string;
  notes?: string;
  url?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExtractionResult {
  company?: string;
  role?: string;
  location?: string;
  status?: ApplicationStatus;
  category?: ApplicationCategory;
  deadline?: string;
  salary?: string;
  url?: string;
  notes?: string;
  confidence?: number;
  uncertainFields?: string[];
}

export interface DashboardStats {
  total: number;
  active: number;
  offers: number;
  rejected: number;
  responseRate: number;
  thisWeek: number;
  thisMonth: number;
}

export interface SheetConfig {
  spreadsheetId: string;
  sheetName: string;
  accessToken: string;
}

export interface VelocityDataPoint {
  date: string;
  count: number;
  cumulative: number;
}

export type SortField = keyof Application;
export type SortDirection = "asc" | "desc";

export interface TableFilters {
  status?: ApplicationStatus | "All";
  category?: ApplicationCategory | "All";
  search?: string;
}
