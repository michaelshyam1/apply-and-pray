"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Application, ExtractionResult } from "@/lib/types";
import {
  getApplications,
  saveApplications,
  addApplication,
  updateApplication,
  deleteApplication,
  getLastSynced,
  saveLastSynced,
} from "@/lib/storage";
import { stableId, isDuplicateApplication } from "@/lib/utils";
import type { DuplicateMatch } from "@/lib/utils";
import { todayISO } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export type SyncStatus = "syncing" | "synced" | "offline" | "error";

/** Returned by add() when a duplicate is found and force is not set. */
export interface DuplicateResult {
  duplicate: DuplicateMatch;
}

/** add() return type:
 *  - Application     → successfully saved
 *  - DuplicateResult → blocked; call add(data, true) to override
 *  - null            → silent failure (should not happen in normal flow)
 */
export type AddOutcome = Application | DuplicateResult | null;

export function useApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("syncing");
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const hydrating = useRef(false);

  const hydrate = useCallback(async () => {
    if (hydrating.current) return;
    hydrating.current = true;
    setSyncStatus("syncing");

    try {
      const res = await fetch("/api/sheets");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as {
        configured: boolean;
        applications: Application[];
        error?: string;
      };

      if (!data.configured) {
        const cached = getApplications();
        setApplications(cached);
        setSyncStatus("offline");
        setIsLoaded(true);
        hydrating.current = false;
        return;
      }

      if (data.error) throw new Error(data.error);

      const apps = data.applications ?? [];
      setApplications(apps);
      saveApplications(apps);
      const now = new Date();
      setLastSynced(now);
      saveLastSynced(now);
      setSyncStatus("synced");
    } catch (err) {
      console.warn("[useApplications] Sheets unreachable, falling back to localStorage:", err);
      const cached = getApplications();
      setApplications(cached);
      setLastSynced(getLastSynced());
      setSyncStatus("offline");
    } finally {
      setIsLoaded(true);
      hydrating.current = false;
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // ── Mutations ───────────────────────────────────────────────────────────────

  const add = useCallback(
    (data: ExtractionResult, force = false): AddOutcome => {
      // Duplicate check — skipped when force=true (user chose "Add anyway")
      if (!force) {
        const dup = isDuplicateApplication(applications, data);
        if (dup) return { duplicate: dup };
      }

      const company = data.company ?? "Unknown";
      const role    = data.role    ?? "Unknown";
      const date    = todayISO();

      const app: Application = {
        id:          stableId(company, role, date),
        dateApplied: date,
        company,
        role,
        category:    data.category ?? "Other",
        location:    data.location ?? "Remote",
        status:      data.status   ?? "To Apply",
        deadline:    data.deadline  ?? undefined,
        salary:      data.salary    ?? undefined,
        notes:       data.notes     ?? undefined,
        url:         data.url       ?? undefined,
        createdAt:   new Date().toISOString(),
        updatedAt:   new Date().toISOString(),
      };

      const updated = addApplication(app);
      setApplications(updated);

      toast({ title: "Application added", description: `${app.company} – ${app.role}` });

      return app;
    },
    [applications]
  );

  const update = useCallback((id: string, updates: Partial<Application>) => {
    const updated = updateApplication(id, updates);
    setApplications(updated);
  }, []);

  const remove = useCallback((id: string) => {
    const updated = deleteApplication(id);
    setApplications(updated);
    toast({ title: "Application removed" });
  }, []);

  return {
    applications,
    isLoaded,
    syncStatus,
    lastSynced,
    refresh: hydrate,
    add,
    update,
    remove,
  };
}
