import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const errors = [];
page.on("pageerror", (err) => errors.push(err.message));

console.log("Navigating to http://localhost:5173...");
await page.goto("http://localhost:5173", { waitUntil: "domcontentloaded" });

const canvas = page.locator("canvas");
await canvas.waitFor({ state: "visible", timeout: 15000 });
console.log("Canvas visible - game started");

await page.waitForTimeout(4000);

if (errors.length > 0) {
  console.log("CONSOLE ERRORS:", errors);
} else {
  console.log("No console errors - PASS");
}

await page.screenshot({ path: "docs/verification/phase-1.2-initial.png" });
console.log("Screenshot saved");

await browser.close();

if (errors.length > 0) {
  console.error("VERIFICATION FAILED - errors found");
  process.exit(1);
} else {
  console.log("VERIFICATION PASSED");
}
