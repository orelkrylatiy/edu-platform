import { test, expect } from "@playwright/test";

test("every view renders on desktop and mobile without overflow", async ({ page }) => {
  for (const view of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    await page.setViewportSize({ width: view.width, height: view.height });
    await page.goto("/");
    await expect(page.locator(".hero h1")).toBeVisible();
    async function visit(id, label) {
      if (id !== "home") {
        if (view.name === "mobile") await page.getByRole("button", { name: "Навигация" }).click();
        await page.locator(".nav-item").filter({ hasText: label }).click();
      }
      await expect(page.locator(".main")).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: "test-results/" + view.name + "-" + id + ".png", fullPage: true });
    }
    await visit("home", "Обзор");
    await visit("courses", "Курсы");
    await visit("calendar", "Активность");
    await expect(page.locator(".calendar-grid.weekly .day")).toHaveCount(7);
    await page.getByRole("button", { name: "Месяц" }).click();
    await expect(page.locator(".calendar-grid.monthly .day").count()).resolves.toBeGreaterThanOrEqual(28);
    await visit("focus", "Фокус");
    await visit("artifacts", "Материалы");
    await visit("review", "Повторение");
    await visit("skills", "Навыки");
    await visit("settings", "Настройки");
    if (view.name === "mobile") await page.getByRole("button", { name: "Навигация" }).click();
    await page.locator(".nav-item").filter({ hasText: "Курсы" }).click();
    await page.locator(".course-card").first().getByRole("button", { name: "Открыть" }).click();
    await expect(page.locator(".task").first()).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: "test-results/" + view.name + "-lesson.png", fullPage: true });
    await page.locator(".lesson-top").getByRole("button", { name: "AI mentor" }).click();
    await expect(page.locator(".chat")).toBeVisible();
    await page.screenshot({ path: "test-results/" + view.name + "-mentor.png", fullPage: true });
  }
});

test("light mode remains legible and calendar expands", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Сменить тему" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.screenshot({ path: "test-results/light-overview.png", fullPage: true });
  await page.locator(".nav-item").filter({ hasText: "Активность" }).click();
  await page.getByRole("button", { name: "Месяц" }).click();
  await expect(page.locator(".calendar-grid.monthly")).toBeVisible();
  await page.screenshot({ path: "test-results/light-calendar-month.png", fullPage: true });
});
