"use client";

import { useState } from "react";
import { Loader2, Wand2, PenLine, Info } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APPLICATION_STATUSES, APPLICATION_CATEGORIES } from "@/lib/constants";
import type { ExtractionResult } from "@/lib/types";
import { toast } from "@/hooks/use-toast";

interface ManualEntryFormProps {
  onExtracted: (result: ExtractionResult) => void;
}

export function ManualEntryForm({ onExtracted }: ManualEntryFormProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [urlText, setUrlText] = useState("");

  const isUrl = (s: string) => {
    try { return ["http:", "https:"].includes(new URL(s.trim()).protocol); }
    catch { return false; }
  };
  const [manualForm, setManualForm] = useState<ExtractionResult>({
    company: "",
    role: "",
    location: "",
    status: "Applied",
    category: "SWE",
  });

  const handleUrlExtract = async () => {
    if (!urlText.trim()) return;
    setIsExtracting(true);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: urlText }),
      });

      const data = await res.json() as ExtractionResult & { error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "Extraction failed");
      }

      onExtracted(data);
    } catch (err) {
      toast({
        title: "Could not extract",
        description: err instanceof Error ? err.message : "Try pasting the job description text directly.",
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.company || !manualForm.role) {
      toast({ title: "Required fields missing", description: "Company and role are required.", variant: "destructive" });
      return;
    }
    onExtracted({ ...manualForm, confidence: 100 });
  };

  return (
    <Tabs defaultValue="url">
      <TabsList className="w-full">
        <TabsTrigger value="url" className="flex-1 gap-2">
          <Wand2 className="h-3.5 w-3.5" /> URL / Text
        </TabsTrigger>
        <TabsTrigger value="manual" className="flex-1 gap-2">
          <PenLine className="h-3.5 w-3.5" /> Manual Entry
        </TabsTrigger>
      </TabsList>

      <TabsContent value="url" className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="urltext">Job posting URL or description</Label>
          <Textarea
            id="urltext"
            value={urlText}
            onChange={(e) => setUrlText(e.target.value)}
            placeholder="https://jobs.company.com/role/12345&#10;&#10;— or paste the full job description text here —"
            className="h-32"
          />
        </div>
        <Button
          onClick={handleUrlExtract}
          disabled={isExtracting || !urlText.trim()}
          className="w-full gap-2"
        >
          {isExtracting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {isUrl(urlText) ? "Fetching page and extracting..." : "Extracting..."}
            </>
          ) : (
            <><Wand2 className="h-4 w-4" /> Extract with AI</>
          )}
        </Button>
        <div className="flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
          <p className="text-xs text-zinc-500">
            URL extraction works best on public job posting pages. Some portals
            may block scraping — use{" "}
            <span className="text-zinc-400">screenshot mode</span> if that happens.
          </p>
        </div>
      </TabsContent>

      <TabsContent value="manual" className="mt-4">
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="m-company">Company *</Label>
              <Input
                id="m-company"
                value={manualForm.company ?? ""}
                onChange={(e) => setManualForm((p) => ({ ...p, company: e.target.value }))}
                placeholder="Stripe"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-role">Role *</Label>
              <Input
                id="m-role"
                value={manualForm.role ?? ""}
                onChange={(e) => setManualForm((p) => ({ ...p, role: e.target.value }))}
                placeholder="SWE Intern"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="m-cat">Category</Label>
              <Select value={manualForm.category ?? "SWE"} onValueChange={(v) => setManualForm((p) => ({ ...p, category: v as never }))}>
                <SelectTrigger id="m-cat"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {APPLICATION_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-status">Status</Label>
              <Select value={manualForm.status ?? "Applied"} onValueChange={(v) => setManualForm((p) => ({ ...p, status: v as never }))}>
                <SelectTrigger id="m-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {APPLICATION_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="m-loc">Location</Label>
              <Input
                id="m-loc"
                value={manualForm.location ?? ""}
                onChange={(e) => setManualForm((p) => ({ ...p, location: e.target.value }))}
                placeholder="San Francisco / Remote"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-deadline">Deadline</Label>
              <Input
                id="m-deadline"
                type="date"
                value={manualForm.deadline ?? ""}
                onChange={(e) => setManualForm((p) => ({ ...p, deadline: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="m-salary">Salary</Label>
              <Input
                id="m-salary"
                value={manualForm.salary ?? ""}
                onChange={(e) => setManualForm((p) => ({ ...p, salary: e.target.value }))}
                placeholder="$45/hr"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-url">URL</Label>
              <Input
                id="m-url"
                type="url"
                value={manualForm.url ?? ""}
                onChange={(e) => setManualForm((p) => ({ ...p, url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
          </div>
          <Button type="submit" className="w-full">Add Application</Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}
