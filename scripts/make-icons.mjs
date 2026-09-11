// Generates PWA PNG icons from an inline SVG using sharp
import sharp from "sharp";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "icons");
mkdirSync(outDir, { recursive: true });

const svg = (size) => Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#6d28d9"/>
  <rect x="156" y="76" width="200" height="360" rx="36" fill="#ffffff"/>
  <rect x="176" y="100" width="160" height="280" rx="16" fill="#ede9fe"/>
  <circle cx="256" cy="408" r="12" fill="#6d28d9"/>
  <path d="M216 220l28 28 52-56" stroke="#6d28d9" stroke-width="26" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="226" y="140" width="60" height="14" rx="7" fill="#c4b5fd"/>
</svg>`);

const targets = [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
  ["favicon-32.png", 32],
];

for (const [name, size] of targets) {
  await sharp(svg(size)).resize(size, size).png().toFile(join(outDir, name));
  console.log("wrote", name);
}
console.log("icons done");
