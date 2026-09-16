// Screenshots the local dev server so UI changes can be reviewed visually
// without a browser. Usage:
//   node scripts/screenshot.mjs [url] [name]
// Requires the dev server to already be running (npm run dev).
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";

const url = process.argv[2] ?? "http://localhost:5183/";
const name = process.argv[3] ?? "shot";

const OUT_DIR = path.resolve(import.meta.dirname, "..", ".screenshots");
mkdirSync(OUT_DIR, { recursive: true });

const VIEWPORTS = [
  { tag: "desktop", width: 1280, height: 900 },
  { tag: "mobile", width: 390, height: 844 },
];

const browser = await chromium.launch();
try {
  for (const { tag, width, height } of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(url, { waitUntil: "networkidle" });
    const outPath = path.join(OUT_DIR, `${name}-${tag}.png`);
    await page.screenshot({ path: outPath, fullPage: true });
    console.log(outPath);
    await page.close();
  }
} finally {
  await browser.close();
}
