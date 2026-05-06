"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Trash2,
  ChevronDown,
  Search,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { openExternalUrl } from "@/lib/open-url";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/shared/status-badge";
import { CategoryBadge } from "@/components/shared/category-badge";
import { formatDate } from "@/lib/utils";
import { APPLICATION_STATUSES, APPLICATION_CATEGORIES } from "@/lib/constants";
import type { Application, ApplicationStatus, ApplicationCategory, SortDirection } from "@/lib/types";

interface ApplicationTableProps {
  applications: Application[];
  onUpdate: (id: string, updates: Partial<Application>) => void;
  onDelete: (id: string) => void;
}

type SortKey = "dateApplied" | "company" | "status" | "deadline";

export function ApplicationTable({ applications, onUpdate, onDelete }: ApplicationTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("dateApplied");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "All">("All");
  const [categoryFilter, setCategoryFilter] = useState<ApplicationCategory | "All">("All");

  const filtered = useMemo(() => {
    let result = [...applications];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.company.toLowerCase().includes(q) ||
          a.role.toLowerCase().includes(q) ||
          a.location.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "All") {
      result = result.filter((a) => a.status === statusFilter);
    }
    if (categoryFilter !== "All") {
      result = result.filter((a) => a.category === categoryFilter);
    }

    result.sort((a, b) => {
      const aVal = a[sortKey] ?? "";
      const bVal = b[sortKey] ?? "";
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [applications, search, statusFilter, categoryFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3.5 w-3.5 text-zinc-600" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-indigo-400" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-indigo-400" />
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search company, role, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ApplicationStatus | "All")}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Statuses</SelectItem>
            {APPLICATION_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as ApplicationCategory | "All")}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Types</SelectItem>
            {APPLICATION_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="ml-auto text-xs text-zinc-500">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="px-4 py-2.5 text-left">
                <button
                  onClick={() => toggleSort("company")}
                  className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Company <SortIcon col="company" />
                </button>
              </th>
              <th className="px-4 py-2.5 text-left hidden md:table-cell">
                <span className="text-xs font-medium text-zinc-500">Role</span>
              </th>
              <th className="px-4 py-2.5 text-left hidden lg:table-cell">
                <span className="text-xs font-medium text-zinc-500">Category</span>
              </th>
              <th className="px-4 py-2.5 text-left">
                <button
                  onClick={() => toggleSort("status")}
                  className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Status <SortIcon col="status" />
                </button>
              </th>
              <th className="px-4 py-2.5 text-left hidden xl:table-cell">
                <button
                  onClick={() => toggleSort("dateApplied")}
                  className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Applied <SortIcon col="dateApplied" />
                </button>
              </th>
              <th className="px-4 py-2.5 text-left hidden xl:table-cell">
                <button
                  onClick={() => toggleSort("deadline")}
                  className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Deadline <SortIcon col="deadline" />
                </button>
              </th>
              <th className="px-4 py-2.5 w-10" />
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-zinc-600">
                    {applications.length === 0
                      ? "No applications yet. Add your first one →"
                      : "No results match your filters."}
                  </td>
                </tr>
              ) : (
                filtered.map((app, idx) => (
                  <motion.tr
                    key={app.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="group border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-100">{app.company}</div>
                      <div className="text-xs text-zinc-500 md:hidden">{app.role}</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-zinc-300">{app.role}</span>
                      {app.location && (
                        <div className="text-xs text-zinc-600">{app.location}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <CategoryBadge category={app.category} />
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex items-center gap-1 rounded-md transition-opacity">
                            <StatusBadge status={app.status} />
                            <ChevronDown className="h-3 w-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuLabel>Change status</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {APPLICATION_STATUSES.map((s) => (
                            <DropdownMenuItem
                              key={s}
                              onClick={() => onUpdate(app.id, { status: s })}
                              className={app.status === s ? "text-indigo-400" : ""}
                            >
                              {s}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span className="text-xs text-zinc-400">{formatDate(app.dateApplied)}</span>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      {app.deadline ? (
                        <span className="text-xs text-zinc-400">{formatDate(app.deadline)}</span>
                      ) : (
                        <span className="text-xs text-zinc-700">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <TooltipProvider delayDuration={300}>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {app.url && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => openExternalUrl(app.url)}
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Open job posting</TooltipContent>
                            </Tooltip>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-zinc-600 hover:text-red-400"
                            onClick={() => onDelete(app.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TooltipProvider>
                    </td>
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}
