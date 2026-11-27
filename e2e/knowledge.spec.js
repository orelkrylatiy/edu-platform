import { test, expect } from "@playwright/test";
import { loginAsOwner } from "./helpers.js";

test.beforeEach(async ({ page }) => { await loginAsOwner(page); });

test("source documents retain links and practice chat gets its own context", async ({ page }) => {
  await page.goto("/");
  await page.locator(".nav-item").filter({ hasText: "Библиотека" }).click();
  await expect(page.locator(".document-reader")).toContainText("30-day Interview Intensive");
  const internal = page.locator('.document-reader a[href^="#workspace-doc/sa-practice-lab"]').first();
  await expect(internal).toBeVisible();
  await internal.click();
  await expect(page.locator(".document-tabs button.active")).toContainText("SA Practice Lab");
  await page.locator(".document-tabs button").first().click();
  const docs = page.locator(".document-tabs button");
  await docs.nth(1).click();
  await expect(page.locator(".document-reader")).toContainText("Order Management");
  await page.locator(".document-reader").getByRole("button", { name:"Обсудить документ" }).click();
  await expect(page.getByRole("combobox", { name: "Сессия чата" })).toHaveAttribute("title", /SA Practice Lab/);
  await page.getByRole("button", { name:"Close chat" }).click();
  const firstHint = page.locator(".document-reader .study-hint").first();
  await expect(firstHint).toBeVisible();
  await firstHint.locator("summary").click();
  await expect(firstHint).toHaveAttribute("open", "");
  await page.locator(".nav-item").filter({ hasText: "Практикум" }).click();
  await page.locator(".practice-card").first().getByRole("button", { name: "Открыть практику" }).click();
  await expect(page.locator(".lesson-top")).toContainText("Practice Lab");
  await page.locator(".lesson-top").getByRole("button", { name: "AI mentor" }).click();
  await expect(page.getByRole("combobox", { name: "Сессия чата" })).toHaveAttribute("title", /Требования/);
  await page.getByRole("textbox", { name: "Message" }).fill("Как начать?");
  await page.route("**/api/chat", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.lesson_id).toMatch(/^sa-lab-diagnostic-/);
    expect(body.mode).toBe("tutor");
    await route.fulfill({ status:200, contentType:"application/json", body:JSON.stringify({
      provider:"mock", messages:[
        {role:"user",content:body.text,id:"one"},
        {role:"assistant",content:"Сначала выдели акторов.",provider:"mock",id:"two"}
      ]
    })});
  });
  await page.getByRole("button", { name: "Отправить" }).click();
  await expect(page.locator(".message.assistant")).toContainText("Сначала выдели акторов.");
  await page.locator(".task .icon").first().click();
  await expect(page.locator(".messages .message")).toHaveCount(0);
});

test("learning content loads with skeleton and shows diagnostic retry", async ({ page }) => {
  await page.route("**/api/content", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.continue();
  });
  await page.goto("/");
  await expect(page.locator(".loading-view")).toBeVisible();
  await expect(page.locator(".skeleton-hero")).toBeVisible();
  await expect(page.locator(".hero")).toBeVisible();
});


test("skeleton failure offers a working retry", async ({ page }) => {
  const failing = async (route) => {
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Service temporarily unavailable" }) });
  };
  await page.route("**/api/content", failing);
  await page.goto("/");
  await expect(page.locator(".loading-view")).toContainText("Не удалось загрузить рабочее пространство");
  await expect(page.locator(".loading-view")).toContainText("Service temporarily unavailable");
  await page.unroute("**/api/content", failing);
  await page.locator(".loading-view").getByRole("button", { name: "Повторить" }).click();
  await expect(page.locator(".hero h1")).toBeVisible();
});
