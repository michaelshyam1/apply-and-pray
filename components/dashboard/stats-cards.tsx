"use client";

import { motion } from "framer-motion";
import { TrendingUp, Inbox, Trophy, XCircle, Zap } from "lucide-react";
import { Card, CardContent, CardTitle, CardHeader } from "@/components/ui/card";
import type { DashboardStats } from "@/lib/types";

interface StatsCardsProps {
  stats: DashboardStats;
}

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.35, ease: "easeOut" },
  }),
};

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      label: "Total Applied",
      value: stats.total,
      sub: `${stats.thisMonth} this month`,
      icon: Inbox,
      iconColor: "text-indigo-400",
      iconBg: "bg-indigo-500/10",
    },
    {
      label: "Active",
      value: stats.active,
      sub: "In pipeline",
      icon: Zap,
      iconColor: "text-amber-400",
      iconBg: "bg-amber-500/10",
    },
    {
      label: "Offers",
      value: stats.offers,
      sub: stats.total > 0 ? `${Math.round((stats.offers / stats.total) * 100)}% conversion` : "—",
      icon: Trophy,
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/10",
    },
    {
      label: "Response Rate",
      value: `${stats.responseRate}%`,
      sub: `${stats.thisWeek} this week`,
      icon: TrendingUp,
      iconColor: "text-blue-400",
      iconBg: "bg-blue-500/10",
    },
    {
      label: "Rejected",
      value: stats.rejected,
      sub: stats.total > 0 ? `${Math.round((stats.rejected / stats.total) * 100)}% of total` : "—",
      icon: XCircle,
      iconColor: "text-red-400",
      iconBg: "bg-red-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <motion.div key={card.label} custom={i} initial="hidden" animate="visible" variants={cardVariants}>
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle>{card.label}</CardTitle>
                  <div className={`rounded-md p-1.5 ${card.iconBg}`}>
                    <Icon className={`h-3.5 w-3.5 ${card.iconColor}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-zinc-100 tabular-nums">{card.value}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{card.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
