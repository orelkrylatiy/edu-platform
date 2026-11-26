import { test, expect } from "@playwright/test";

test("every view renders on desktop and mobile without overflow", async ({ page }) => {
  for (const view of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    await page.setViewportSize({ width: view.width, height: view.height });
    if (view.name === "mobile") {
      await page.evaluate(() => {
        localStorage.setItem("course", JSON.stringify("system-analyst"));
        localStorage.setItem("lesson", JSON.stringify("sa-01"));
      });
    }
    await page.goto("/");
    await expect(page.locator(".hero h1")).toBeVisible();
    async function visit(id, label) {
      if (id !== "home") {
        if (view.name === "mobile") await page.getByRole("button", { name: "Навигация" }).click();
        await page.locator(".nav-item").filter({ hasText: label }).click();
      }
      await expect(page.locator(".main")).toBeVisible();
      await page.waitForTimeout(250);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: "test-results/" + view.name + "-" + id + ".png", fullPage: id !== "knowledge" });
    }
    await visit("home", "Обзор");
    await visit("courses", "Курсы");
    await visit("practice", "Практикум");
    await expect(page.locator(".practice-card")).toHaveCount(14);
    await visit("knowledge", "Библиотека");
    await expect(page.locator(".document-tabs button")).toHaveCount(3);
    await expect(page.locator(".document-reader")).toContainText("Middle System Analyst");
    await visit("calendar", "Активность");
    await expect(page.locator(".calendar-grid.weekly .day")).toHaveCount(7);
    const firstPeriod = await page.locator(".calendar-toolbar h2").textContent();
    await page.getByRole("button", { name: "Следующая неделя или месяц" }).click();
    await expect(page.locator(".calendar-toolbar h2")).not.toHaveText(firstPeriod);
    await page.getByRole("button", { name: "Предыдущая неделя или месяц" }).click();
    await expect(page.locator(".calendar-toolbar h2")).toHaveText(firstPeriod);
    await page.getByRole("button", { name: "Месяц", exact: true }).click();
    expect(await page.locator(".calendar-grid.monthly .day").count()).toBeGreaterThanOrEqual(28);
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
    await page.waitForTimeout(250);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: "test-results/" + view.name + "-lesson.png", fullPage: true });
    await page.locator(".lesson-top").getByRole("button", { name: "AI mentor" }).click();
    await expect(page.locator(".chat")).toBeVisible();
    await page.waitForTimeout(250);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: "test-results/" + view.name + "-mentor.png", fullPage: true });
  }
});

test("light mode remains legible and calendar expands", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Сменить тему" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.waitForTimeout(250);
  await page.screenshot({ path: "test-results/light-overview.png", fullPage: true });
  await page.locator(".nav-item").filter({ hasText: "Активность" }).click();
  await page.getByRole("button", { name: "Месяц", exact: true }).click();
  await expect(page.locator(".calendar-grid.monthly")).toBeVisible();
  await page.screenshot({ path: "test-results/light-calendar-month.png", fullPage: true });
});
