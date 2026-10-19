import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, "node_modules/pdfjs-dist/build/pdf.worker.min.mjs");
const dest = join(root, "public/pdf.worker.min.mjs");

if (existsSync(src)) {
  copyFileSync(src, dest);
  console.log("[pdfjs] worker copied to public/pdf.worker.min.mjs");
} else {
  console.warn("[pdfjs] worker source not found, skipping copy");
}
