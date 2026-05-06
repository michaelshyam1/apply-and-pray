"use client";

import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUS_CONFIG } from "@/lib/constants";
import type { Application, ApplicationStatus } from "@/lib/types";

interface StatusChartProps {
  applications: Application[];
}

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  "To Apply": "#a1a1aa",
  Applied: "#3b82f6",
  Interview: "#f97316",
  "Final Round": "#a855f7",
  Offer: "#10b981",
  Rejected: "#ef4444",
  Withdrawn: "#71717a",
};

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 shadow-xl">
      <p className="text-sm font-medium text-zinc-100">
        {payload[0].name}: {payload[0].value}
      </p>
    </div>
  );
}

export function StatusChart({ applications }: StatusChartProps) {
  const statusCounts = applications.reduce<Record<string, number>>((acc, app) => {
    acc[app.status] = (acc[app.status] ?? 0) + 1;
    return acc;
  }, {});

  const data = Object.entries(statusCounts)
    .filter(([, v]) => v > 0)
    .map(([status, count]) => ({ name: status, value: count }))
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Status Breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="flex h-40 items-center justify-center">
            <p className="text-sm text-zinc-600">No applications yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle>Status Breakdown</CardTitle></CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <PieChart width={120} height={120}>
            <Pie
              data={data}
              cx={60}
              cy={60}
              innerRadius={35}
              outerRadius={55}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={STATUS_COLORS[entry.name as ApplicationStatus] ?? "#52525b"}
                  stroke="transparent"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
          <div className="flex flex-col gap-1.5">
            {data.slice(0, 6).map((entry) => {
              const config = STATUS_CONFIG[entry.name as ApplicationStatus];
              return (
                <div key={entry.name} className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[entry.name as ApplicationStatus] }}
                  />
                  <span className="text-xs text-zinc-400">{config?.label ?? entry.name}</span>
                  <span className="ml-auto text-xs font-medium text-zinc-300 tabular-nums">
                    {entry.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
