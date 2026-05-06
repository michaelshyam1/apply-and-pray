"use client";

import { useState, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Application, ExtractionResult } from "@/lib/types";
import {
  getApplications,
  addApplication,
  updateApplication,
  deleteApplication,
} from "@/lib/storage";
import { todayISO, detectDuplicates } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export function useApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadApplications = async () => {
      const stored = getApplications();
      
      // If localStorage is empty, try to load from Google Sheets
      if (stored.length === 0) {
        try {
          const response = await fetch("/api/sheets?action=read");
          if (response.ok) {
            const data = await response.json();
            const sheetsApps = data.applications || [];
            if (sheetsApps.length > 0) {
              // Assign unique IDs to sheet applications and save to localStorage
              const appsWithIds = sheetsApps.map((app: Application) => ({
                ...app,
                id: app.id || uuidv4(),
              }));
              setApplications(appsWithIds);
              // Optionally persist to localStorage for offline access
              appsWithIds.forEach((app: Application) => addApplication(app));
              return;
            }
          }
        } catch (err) {
          console.error("Failed to load from Google Sheets:", err);
        }
      }
      
      setApplications(stored);
      setIsLoaded(true);
    };

    loadApplications().then(() => setIsLoaded(true));
  }, []);

  const add = useCallback(
    (data: ExtractionResult & { notes?: string }): Application | null => {
      const duplicate = detectDuplicates(
        applications,
        data.company ?? "",
        data.role ?? ""
      );
      if (duplicate) {
        toast({
          title: "Duplicate detected",
          description: `You already applied to ${data.company} – ${data.role}`,
          variant: "destructive",
        });
        return null;
      }

      const app: Application = {
        id: uuidv4(),
        dateApplied: todayISO(),
        company: data.company ?? "Unknown",
        role: data.role ?? "Unknown",
        category: data.category ?? "Other",
        location: data.location ?? "Remote",
        status: data.status ?? "Applied",
        deadline: data.deadline ?? undefined,
        salary: data.salary ?? undefined,
        notes: data.notes ?? undefined,
        url: data.url ?? undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updated = addApplication(app);
      setApplications(updated);

      toast({
        title: "Application added",
        description: `${app.company} – ${app.role}`,
        variant: "success" as never,
      });

      return app;
    },
    [applications]
  );

  const update = useCallback(
    (id: string, updates: Partial<Application>) => {
      const updated = updateApplication(id, updates);
      setApplications(updated);
    },
    []
  );

  const remove = useCallback((id: string) => {
    const updated = deleteApplication(id);
    setApplications(updated);
    toast({ title: "Application removed" });
  }, []);

  return { applications, isLoaded, add, update, remove };
}
