"use client";

import { AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { daysUntilDeadline, formatDate } from "@/lib/utils";
import { DEADLINE_WARNING_DAYS } from "@/lib/constants";
import type { Application } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DeadlineWarningsProps {
  applications: Application[];
}

export function DeadlineWarnings({ applications }: DeadlineWarningsProps) {
  const upcoming = applications
    .filter((a) => {
      const days = daysUntilDeadline(a.deadline);
      return days !== null && days >= 0 && days <= DEADLINE_WARNING_DAYS;
    })
    .sort((a, b) => {
      const da = daysUntilDeadline(a.deadline) ?? 999;
      const db = daysUntilDeadline(b.deadline) ?? 999;
      return da - db;
    });

  if (upcoming.length === 0) return null;

  return (
    <Card className="border-amber-500/20 bg-amber-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <CardTitle className="text-amber-400">Deadlines This Week</CardTitle>
          <span className="ml-auto rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
            {upcoming.length}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {upcoming.map((app) => {
          const days = daysUntilDeadline(app.deadline)!;
          const isUrgent = days <= 2;
          return (
            <div
              key={app.id}
              className={cn(
                "flex items-center justify-between rounded-lg border px-3 py-2",
                isUrgent
                  ? "border-red-500/20 bg-red-500/5"
                  : "border-zinc-800 bg-zinc-900/50"
              )}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-200">
                  {app.company}
                </p>
                <p className="truncate text-xs text-zinc-500">{app.role}</p>
              </div>
              <div className="ml-3 flex shrink-0 flex-col items-end gap-1">
                <StatusBadge status={app.status} />
                <div className={cn("flex items-center gap-1 text-xs", isUrgent ? "text-red-400" : "text-amber-400")}>
                  <Clock className="h-3 w-3" />
                  {days === 0 ? "Today!" : days === 1 ? "Tomorrow" : `${days} days`}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
