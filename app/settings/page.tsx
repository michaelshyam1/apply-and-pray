"use client";

import { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import {
  TableProperties,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Key,
  RefreshCw,
  FileSpreadsheet,
} from "lucide-react";
import { AppShell } from "@/components/shared/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getApplications } from "@/lib/storage";
import { toast } from "@/hooks/use-toast";

function SettingsContent() {
  const [sheetsConfigured, setSheetsConfigured] = useState<boolean | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    fetch("/api/sheets")
      .then((r) => r.json())
      .then((d: { configured: boolean }) => setSheetsConfigured(d.configured))
      .catch(() => setSheetsConfigured(false));
  }, []);

  const handleInitAndSync = async () => {
    setIsSyncing(true);
    try {
      const applications = getApplications();

      // Single call: overwrites headers + clears A2:J + rewrites rows
      const res = await fetch("/api/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync", applications }),
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? "Sync failed");
      }

      toast({
        title: "Sync complete",
        description: "Google Sheet synced with current dashboard.",
      });
    } catch (err) {
      toast({
        title: "Sync failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-6 p-6 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-lg font-semibold text-zinc-100">Settings</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Configure integrations and API keys
          </p>
        </motion.div>

        {/* Google Sheets — Service Account */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2">
                <TableProperties className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-zinc-100 text-sm">Google Sheets</CardTitle>
                <CardDescription>Service account — no login required</CardDescription>
              </div>
              {sheetsConfigured === true && (
                <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Configured
                </div>
              )}
              {sheetsConfigured === false && (
                <div className="ml-auto flex items-center gap-1.5 text-xs text-zinc-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Not configured
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {sheetsConfigured ? (
              <div className="space-y-3">
                <p className="text-sm text-zinc-400">
                  Service account is connected. New applications are appended automatically.
                  Use the button below to do a full overwrite sync.
                </p>
                <Button
                  onClick={handleInitAndSync}
                  disabled={isSyncing}
                  variant="secondary"
                  className="gap-2"
                >
                  {isSyncing
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Syncing...</>
                    : <><RefreshCw className="h-3.5 w-3.5" /> Full Sync Now</>
                  }
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-zinc-400">
                  Add these three variables to your <code className="text-zinc-300">.env.local</code> file:
                </p>
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs leading-relaxed text-zinc-300">
                  <p><span className="text-zinc-500"># The sheet ID from the URL</span></p>
                  <p>GOOGLE_SHEET_ID=<span className="text-zinc-500">1BxiMVs0XRA5nFM...</span></p>
                  <br />
                  <p><span className="text-zinc-500"># From your service account JSON</span></p>
                  <p>GOOGLE_SERVICE_ACCOUNT_EMAIL=<span className="text-zinc-500">name@project.iam.gserviceaccount.com</span></p>
                  <p>GOOGLE_PRIVATE_KEY=<span className="text-zinc-500">&quot;-----BEGIN RSA PRIVATE KEY-----\n...&quot;</span></p>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 space-y-2">
                  <p className="text-xs font-medium text-zinc-300">Setup steps</p>
                  <ol className="space-y-1.5 text-xs text-zinc-500 list-decimal list-inside">
                    <li>
                      Open{" "}
                      <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-0.5">
                        Google Cloud Console <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                      {" "}and enable the <strong className="text-zinc-400">Google Sheets API</strong>
                    </li>
                    <li>Create a <strong className="text-zinc-400">Service Account</strong> under IAM &amp; Admin</li>
                    <li>Generate a JSON key — copy <code className="text-zinc-400">client_email</code> and <code className="text-zinc-400">private_key</code></li>
                    <li>Create a Google Sheet and share it with the service account email (Editor access)</li>
                    <li>Copy the Sheet ID from the URL and add all three vars to <code className="text-zinc-400">.env.local</code></li>
                    <li>Restart the dev server (<code className="text-zinc-400">npm run dev</code>)</li>
                  </ol>
                </div>

                <a
                  href="https://console.cloud.google.com/iam-admin/serviceaccounts"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-2">
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    Open Service Accounts
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data */}
        <Card>
          <CardHeader>
            <CardTitle className="text-zinc-100 text-sm">Data Storage</CardTitle>
            <CardDescription>How your data is stored</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Applications are saved to <code className="text-zinc-400">localStorage</code> in your browser.
              Google Sheets is your persistent backup. Clearing browser storage removes local data,
              but your sheet remains intact.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsContent />
    </Suspense>
  );
}
