import { test, expect } from "@playwright/test";

test("renderer smoke flow renders markdown, math, mermaid, citations, and line numbers", async ({ page }) => {
  await page.goto("/?fixture=e2e-smoke.md");

  await expect(page.locator(".topbar h1")).toHaveText("冒烟测试文档");
  await expect(page.locator(".line-number").first()).toHaveText("1");
  await expect(page.locator(".preview .katex")).toHaveCount(2);
  await expect(page.locator(".preview .mermaid-diagram svg")).toHaveCount(1);
  await expect(page.locator(".preview .citation-ref a")).toHaveText("[1]");
});
