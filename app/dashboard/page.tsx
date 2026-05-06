"use client";

import Link from "next/link";
import { useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/shared/app-shell";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { ApplicationTable } from "@/components/dashboard/application-table";
import { VelocityChart } from "@/components/dashboard/velocity-chart";
import { StatusChart } from "@/components/dashboard/status-chart";
import { DeadlineWarnings } from "@/components/dashboard/deadline-warnings";
import { Skeleton } from "@/components/ui/skeleton";
import { useApplications } from "@/hooks/use-applications";
import { computeStats, computeVelocityData } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { Application } from "@/lib/types";

export default function DashboardPage() {
  const { applications, isLoaded, update, remove } = useApplications();
  const [hasUnsyncedChanges, setHasUnsyncedChanges] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const stats = useMemo(() => computeStats(applications), [applications]);
  const velocityData = useMemo(() => computeVelocityData(applications), [applications]);

  // Wrap mutations to mark sheet as unsynced whenever local state changes
  const handleUpdate = useCallback(
    (id: string, updates: Partial<Application>) => {
      update(id, updates);
      setHasUnsyncedChanges(true);
    },
    [update]
  );

  const handleRemove = useCallback(
    (id: string) => {
      remove(id);
      setHasUnsyncedChanges(true);
    },
    [remove]
  );

  const handlePushToSheet = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync", applications }),
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? "Sync failed");
      }

      setHasUnsyncedChanges(false);
      toast({ title: "Sheet updated", description: "Google Sheet synced with dashboard." });
    } catch (err) {
      toast({
        title: "Sync failed",
        description: err instanceof Error ? err.message : "Check Settings for setup instructions.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h1 className="text-lg font-semibold text-zinc-100">Dashboard</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              {isLoaded
                ? applications.length === 0
                  ? "Start tracking your internship applications"
                  : `${applications.length} application${applications.length !== 1 ? "s" : ""} tracked`
                : "Loading..."}
            </p>
          </motion.div>

          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2">
              {/* Unsynced dot */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePushToSheet}
                  disabled={isSyncing}
                  className="gap-2"
                >
                  <RefreshCw
                    className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")}
                  />
                  Push Changes to Sheet
                </Button>
                {hasUnsyncedChanges && !isSyncing && (
                  <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                    <span className="relative h-2 w-2 rounded-full bg-amber-400" />
                  </span>
                )}
              </div>

              <Link href="/upload">
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Application
                </Button>
              </Link>
            </div>

            {/* Unsynced label */}
            {hasUnsyncedChanges && !isSyncing && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-amber-400/80"
              >
                Unsynced changes — sheet may be out of date
              </motion.p>
            )}
          </div>
        </div>

        {/* Stats */}
        {!isLoaded ? (
          <div className="grid grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : (
          <StatsCards stats={stats} />
        )}

        {/* Deadline warnings */}
        {isLoaded && <DeadlineWarnings applications={applications} />}

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {!isLoaded ? (
              <Skeleton className="h-64 rounded-xl" />
            ) : (
              <VelocityChart data={velocityData} />
            )}
          </div>
          <div>
            {!isLoaded ? (
              <Skeleton className="h-64 rounded-xl" />
            ) : (
              <StatusChart applications={applications} />
            )}
          </div>
        </div>

        {/* Applications table */}
        <div>
          <h2 className="mb-3 text-sm font-medium text-zinc-400">All Applications</h2>
          {!isLoaded ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : (
            <ApplicationTable
              applications={applications}
              onUpdate={handleUpdate}
              onDelete={handleRemove}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
