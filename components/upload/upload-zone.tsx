"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, ImagePlus, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { fileToBase64 } from "@/lib/utils";
import type { ExtractionResult } from "@/lib/types";
import { toast } from "@/hooks/use-toast";

interface UploadZoneProps {
  onExtracted: (result: ExtractionResult, imageUrl?: string) => void;
  disabled?: boolean;
}

export function UploadZone({ onExtracted, disabled }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Invalid file", description: "Please upload an image file.", variant: "destructive" });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: "Maximum size is 10MB.", variant: "destructive" });
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      setIsProcessing(true);

      try {
        const base64 = await fileToBase64(file);
        const res = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64, mimeType: file.type }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? "Extraction failed");
        }

        const result = await res.json() as ExtractionResult;
        onExtracted(result, objectUrl);
      } catch (err) {
        toast({
          title: "Extraction failed",
          description: err instanceof Error ? err.message : "Please try manual entry instead.",
          variant: "destructive",
        });
        setPreview(null);
      } finally {
        setIsProcessing(false);
      }
    },
    [onExtracted]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData.items);
      const imageItem = items.find((item) => item.type.startsWith("image/"));
      if (imageItem) {
        const file = imageItem.getAsFile();
        if (file) processFile(file);
      }
    },
    [processFile]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onPaste={handlePaste}
      onClick={() => !isProcessing && !disabled && inputRef.current?.click()}
      className={cn(
        "relative flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200",
        isDragging
          ? "border-indigo-500 bg-indigo-500/5 scale-[1.01]"
          : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-600 hover:bg-zinc-900",
        (isProcessing || disabled) && "cursor-default pointer-events-none"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={isProcessing || disabled}
      />

      <AnimatePresence mode="wait">
        {isProcessing ? (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3"
          >
            {preview && (
              <div className="relative mb-2 h-20 w-20 overflow-hidden rounded-lg border border-zinc-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="preview" className="h-full w-full object-cover opacity-50" />
              </div>
            )}
            <div className="flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
              <span className="text-sm text-indigo-300">AI extracting details...</span>
            </div>
            <p className="text-xs text-zinc-500">This takes a few seconds</p>
          </motion.div>
        ) : isDragging ? (
          <motion.div
            key="dragging"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="rounded-full border border-indigo-500/30 bg-indigo-500/10 p-4">
              <Upload className="h-6 w-6 text-indigo-400" />
            </div>
            <p className="text-sm font-medium text-indigo-300">Drop to analyze</p>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3 px-6 text-center"
          >
            <div className="relative">
              <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-4">
                <ImagePlus className="h-7 w-7 text-zinc-400" />
              </div>
              <div className="absolute -right-1 -top-1 rounded-full border border-indigo-500/30 bg-indigo-500/20 p-1">
                <Sparkles className="h-3 w-3 text-indigo-400" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-200">
                Drop a screenshot here
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                or click to browse · paste from clipboard
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {["Job posting", "Confirmation email", "Application page"].map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-0.5 text-xs text-zinc-500"
                >
                  {t}
                </span>
              ))}
            </div>
            <p className="text-xs text-zinc-600">PNG, JPG, WEBP up to 10MB</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
