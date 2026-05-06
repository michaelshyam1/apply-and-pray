"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VelocityDataPoint } from "@/lib/types";
import { format, parseISO } from "date-fns";

interface VelocityChartProps {
  data: VelocityDataPoint[];
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 shadow-xl">
      <p className="mb-1 text-xs text-zinc-500">
        {label ? format(parseISO(label), "MMM d, yyyy") : ""}
      </p>
      {payload.map((p) => (
        <p key={p.name} className="text-sm font-medium text-zinc-100">
          {p.name === "count" ? `${p.value} applied` : `${p.value} total`}
        </p>
      ))}
    </div>
  );
}

export function VelocityChart({ data }: VelocityChartProps) {
  const hasData = data.some((d) => d.count > 0);

  const tickDates = data.filter((_, i) => i % 7 === 0).map((d) => d.date);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Application Velocity</CardTitle>
            <p className="mt-1 text-xl font-bold text-zinc-100">
              {data.reduce((s, d) => s + d.count, 0)} this month
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              Daily
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-indigo-800" />
              Cumulative
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-sm text-zinc-600">No applications yet — start tracking</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={data} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="date"
                ticks={tickDates}
                tickFormatter={(v) => format(parseISO(v), "MMM d")}
                tick={{ fill: "#52525b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#52525b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="#4f46e5"
                strokeWidth={2}
                fill="url(#colorCumulative)"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#818cf8"
                strokeWidth={1.5}
                fill="url(#colorCount)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
