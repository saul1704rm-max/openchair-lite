import { expect, test } from "@playwright/test";

test("creates a session workspace", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /start a session/i }).click();
  await page.getByLabel("Conference").fill("Northstar MUN");
  await page.getByRole("textbox", { name: /^Committee \*/ }).fill("Security Council");
  await page.getByRole("button", { name: /create workspace/i }).click();
  await expect(page.getByText("Security Council").first()).toBeVisible();
});
