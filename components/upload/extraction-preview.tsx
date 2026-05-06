"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APPLICATION_STATUSES, APPLICATION_CATEGORIES } from "@/lib/constants";
import type { ExtractionResult, ApplicationStatus, ApplicationCategory } from "@/lib/types";

interface ExtractionPreviewProps {
  extraction: ExtractionResult;
  imageUrl?: string;
  onConfirm: (data: ExtractionResult) => void;
  onReset: () => void;
  isLoading?: boolean;
}

export function ExtractionPreview({
  extraction,
  imageUrl,
  onConfirm,
  onReset,
  isLoading,
}: ExtractionPreviewProps) {
  const [form, setForm] = useState<ExtractionResult>({
    ...extraction,
    status: extraction.status ?? "Applied",
    category: extraction.category ?? "SWE",
  });

  const update = (field: keyof ExtractionResult, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(form);
  };

  const confidence = form.confidence ?? extraction.confidence;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">
              {confidence ? `${confidence}% confidence` : "Extracted"}
            </span>
          </div>
          <span className="text-xs text-zinc-500">Review and edit the fields below</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onReset} className="gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" />
          Start over
        </Button>
      </div>

      <div className="flex gap-4">
        {imageUrl && (
          <div className="hidden md:block shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Uploaded screenshot"
              className="h-40 w-32 rounded-lg border border-zinc-700 object-cover object-top"
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="company">Company *</Label>
              <Input
                id="company"
                value={form.company ?? ""}
                onChange={(e) => update("company", e.target.value)}
                placeholder="e.g. Stripe"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role">Role *</Label>
              <Input
                id="role"
                value={form.role ?? ""}
                onChange={(e) => update("role", e.target.value)}
                placeholder="e.g. Software Engineer Intern"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <Select
                value={form.category ?? "SWE"}
                onValueChange={(v) => update("category", v)}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPLICATION_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select
                value={form.status ?? "Applied"}
                onValueChange={(v) => update("status", v)}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPLICATION_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={form.location ?? ""}
                onChange={(e) => update("location", e.target.value)}
                placeholder="e.g. San Francisco, CA"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={form.deadline ?? ""}
                onChange={(e) => update("deadline", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="salary">Salary / Compensation</Label>
              <Input
                id="salary"
                value={form.salary ?? ""}
                onChange={(e) => update("salary", e.target.value)}
                placeholder="e.g. $45/hr or $110k"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="url">Job URL</Label>
              <Input
                id="url"
                type="url"
                value={form.url ?? ""}
                onChange={(e) => update("url", e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes ?? ""}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Referral, recruiter contact, specific role details..."
              className="h-20"
            />
          </div>

          <Button type="submit" className="w-full gap-2" disabled={isLoading}>
            <CheckCircle className="h-4 w-4" />
            {isLoading ? "Saving..." : "Save Application"}
          </Button>
        </form>
      </div>
    </motion.div>
  );
}
