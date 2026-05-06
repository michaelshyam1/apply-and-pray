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
import { stableId } from "@/lib/utils";
import { todayISO, detectDuplicates } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export type SyncStatus = "syncing" | "synced" | "offline" | "error";

export function useApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("syncing");
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const hydrating = useRef(false);

  const hydrate = useCallback(async () => {
    // Guard against concurrent calls (React StrictMode double-invoke, etc.)
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
        // Sheets not set up — fall back to local cache
        const cached = getApplications();
        setApplications(cached);
        setSyncStatus("offline");
        setIsLoaded(true);
        hydrating.current = false;
        return;
      }

      if (data.error) throw new Error(data.error);

      // Sheets returned successfully — it is now the source of truth
      const apps = data.applications ?? [];
      setApplications(apps);
      saveApplications(apps); // keep localStorage in sync as a cache
      const now = new Date();
      setLastSynced(now);
      saveLastSynced(now);
      setSyncStatus("synced");
    } catch (err) {
      console.warn("[useApplications] Sheets unreachable, falling back to localStorage:", err);
      const cached = getApplications();
      setApplications(cached);
      const storedDate = getLastSynced();
      setLastSynced(storedDate);
      setSyncStatus("offline");
    } finally {
      setIsLoaded(true);
      hydrating.current = false;
    }
  }, []);

  // Hydrate once on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // ── Mutations ───────────────────────────────────────────────────────────────

  const add = useCallback(
    (data: ExtractionResult & { notes?: string }): Application | null => {
      const company = data.company ?? "Unknown";
      const role    = data.role    ?? "Unknown";

      const duplicate = detectDuplicates(applications, company, role);
      if (duplicate) {
        toast({
          title: "Duplicate detected",
          description: `You already have ${company} – ${role}`,
          variant: "destructive",
        });
        return null;
      }

      const date = todayISO();
      const app: Application = {
        // Deterministic ID — matches what readApplicationsFromSheet() generates
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

      toast({
        title: "Application added",
        description: `${app.company} – ${app.role}`,
      });

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
