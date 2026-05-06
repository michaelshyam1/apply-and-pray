/**
 * Copies the files that Next.js standalone mode needs but doesn't include:
 *   .next/static  →  .next/standalone/.next/static
 *   public/       →  .next/standalone/public/
 *
 * Run automatically as part of `npm run tauri:build`.
 */

import { cpSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function copy(src, dst) {
  if (!existsSync(src)) {
    console.warn(`⚠  skipping (not found): ${src}`);
    return;
  }
  console.log(`   ${src.replace(root, ".")}  →  ${dst.replace(root, ".")}`);
  cpSync(src, dst, { recursive: true, force: true });
}

console.log("\nPreparing Next.js standalone build…\n");

copy(
  join(root, ".next", "static"),
  join(root, ".next", "standalone", ".next", "static")
);

copy(
  join(root, "public"),
  join(root, ".next", "standalone", "public")
);

console.log("\n✓ Standalone build ready at .next/standalone/\n");
