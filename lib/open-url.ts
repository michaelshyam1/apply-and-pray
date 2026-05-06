"use client";

/** True when running inside a Tauri desktop window. */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Open a URL in the user's default browser.
 *
 * Tauri: invokes the `open_in_browser` Rust command which uses
 *        `cmd /C start` — the only reliable way to escape the WebView
 *        and reach the system browser on Windows.
 *
 * Browser: falls back to window.open.
 *
 * Invalid or non-http URLs are silently ignored.
 */
export async function openExternalUrl(url: string | undefined): Promise<void> {
  if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) return;

  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("open_in_browser", { url });
    } catch (err) {
      console.error("[openExternalUrl] Tauri invoke failed:", err);
      // Hard fallback — may not escape the WebView but worth trying
      window.open(url, "_blank", "noopener,noreferrer");
    }
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
