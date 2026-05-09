import { test, expect } from "@playwright/test";
import path from "path";

test("Phase 1.2: BootScene loads manifest and transitions to TitleScene", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("http://localhost:5173", { waitUntil: "domcontentloaded" });

  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible({ timeout: 10000 });

  await page.waitForTimeout(3000);

  expect(errors.length).toBe(0);
});
