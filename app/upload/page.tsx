"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, PenLine, Cpu, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/shared/app-shell";
import { UploadZone } from "@/components/upload/upload-zone";
import { ExtractionPreview } from "@/components/upload/extraction-preview";
import { ManualEntryForm } from "@/components/upload/manual-entry-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useApplications } from "@/hooks/use-applications";
import type { DuplicateResult } from "@/hooks/use-applications";
import type { ExtractionResult } from "@/lib/types";
import type { AIProvider } from "@/lib/ai-provider";

export default function UploadPage() {
  const router = useRouter();
  const { add } = useApplications();
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [provider, setProvider] = useState<AIProvider | null>(null);
  const [providerModel, setProviderModel] = useState<string>("");

  // Duplicate-warning state
  const [pendingData, setPendingData] = useState<ExtractionResult | null>(null);
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateResult | null>(null);

  useEffect(() => {
    fetch("/api/extract")
      .then((r) => r.json())
      .then((d: { provider: AIProvider; model: string }) => {
        setProvider(d.provider);
        setProviderModel(d.model);
      })
      .catch(() => {});
  }, []);

  const handleExtracted = (result: ExtractionResult, imgUrl?: string) => {
    setExtraction(result);
    setImageUrl(imgUrl);
    // Clear any previous duplicate warning when new extraction comes in
    setDuplicateInfo(null);
    setPendingData(null);
  };

  const handleReset = () => {
    setExtraction(null);
    setImageUrl(undefined);
    setDuplicateInfo(null);
    setPendingData(null);
  };

  const saveApplication = async (data: ExtractionResult, force = false) => {
    setIsSaving(true);
    const outcome = add(data, force);

    // Duplicate detected — surface warning, don't navigate away
    if (outcome && "duplicate" in outcome) {
      setPendingData(data);
      setDuplicateInfo(outcome);
      setIsSaving(false);
      return;
    }

    if (outcome) {
      // Fire-and-forget sheet append
      fetch("/api/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "append", application: outcome }),
      }).catch(() => {});
      router.push("/dashboard");
    }

    setIsSaving(false);
  };

  const handleConfirm = (data: ExtractionResult) => saveApplication(data, false);

  const handleAddAnyway = () => {
    if (pendingData) {
      setDuplicateInfo(null);
      saveApplication(pendingData, true);
      setPendingData(null);
    }
  };

  const handleDismissDuplicate = () => {
    setDuplicateInfo(null);
    setPendingData(null);
  };

  const dup = duplicateInfo?.duplicate;

  return (
    <AppShell>
      <div className="flex flex-col gap-6 p-6 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-start justify-between gap-4"
        >
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">Add Application</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              Paste a URL or enter details manually
            </p>
          </div>

          {provider === "ollama" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
              className="shrink-0 flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1"
            >
              <Cpu className="h-3 w-3 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">
                Local AI — no API costs
              </span>
            </motion.div>
          )}
        </motion.div>

        {/* Duplicate warning banner */}
        <AnimatePresence>
          {dup && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-400">
                    Application already exists
                  </p>
                  <p className="mt-0.5 text-xs text-amber-400/70">
                    {dup.reason === "url"
                      ? "An entry with the same URL already exists"
                      : `Already tracking ${dup.existingApp.company} – ${dup.existingApp.role}`}
                    {" "}(status: {dup.existingApp.status}).
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddAnyway}
                  className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                >
                  Add anyway
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDismissDuplicate}
                  className="text-zinc-500 hover:text-zinc-300">
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {extraction ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <ExtractionPreview
                extraction={extraction}
                imageUrl={imageUrl}
                onConfirm={handleConfirm}
                onReset={handleReset}
                isLoading={isSaving}
              />
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <Tabs defaultValue="url-manual">
                <TabsList className="w-full">
                  <TabsTrigger value="url-manual" className="flex-1 gap-2">
                    <Link2 className="h-3.5 w-3.5" />
                    URL / Manual
                  </TabsTrigger>
                  <TabsTrigger value="screenshot" className="flex-1 gap-2 text-zinc-500">
                    <PenLine className="h-3.5 w-3.5" />
                    Screenshot
                    <span className="ml-1 rounded border border-zinc-700 px-1 py-px text-[10px] font-medium text-zinc-600">
                      Experimental
                    </span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="url-manual" className="mt-4">
                  <ManualEntryForm onExtracted={handleExtracted} />
                </TabsContent>

                <TabsContent value="screenshot" className="mt-4 space-y-3">
                  <UploadZone onExtracted={handleExtracted} />
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
                    <span className="mt-px text-amber-400">⚠</span>
                    <p className="text-xs text-amber-400/80 leading-relaxed">
                      <span className="font-medium text-amber-400">Experimental.</span>{" "}
                      Screenshot extraction requires a local vision model (e.g.{" "}
                      <code className="font-mono">qwen2.5vl:7b</code>). The current model{" "}
                      {providerModel && <code className="font-mono">{providerModel}</code>}{" "}
                      is text-only and will fail on images. Use URL mode instead.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
