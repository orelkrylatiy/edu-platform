import { test, expect } from "@playwright/test";

const submit = (page, endpoint, data) => page.request.post("/api/auth/" + endpoint, {
  headers: { "X-Workspace": "1" }, data
});

test("guest can browse the public catalog without exposing course content", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".landing-root .landing-hero h1")).toContainText("Учись глубже.");
  await expect(page.locator(".landing-catalog-wrap .catalog-card")).toHaveCount(2);
  await expect(page.locator(".landing-catalog-wrap")).toContainText("Middle System Analyst");
  await page.screenshot({ path:"test-results/guest-landing-desktop.png", fullPage:true });
  const apiContent = await page.request.get("/api/content");
  expect(apiContent.status()).toBe(401);
  const publicCatalog = await page.request.get("/api/catalog");
  expect(publicCatalog.status()).toBe(200);
  const list = await publicCatalog.json();
  expect(list[0].lessons).toBeGreaterThan(0);
  expect(JSON.stringify(list)).not.toContain("source_stats");
  await page.setViewportSize({width:390,height:844});
  await page.reload();
  await expect(page.locator(".landing-hero h1")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path:"test-results/guest-landing-mobile.png", fullPage:true });
});

test("existing account logs in, stays signed in after reload and logs out", async ({ page, browser }) => {
  await page.goto("/");
  await page.getByRole("button", {name:"Войти",exact:true}).first().click();
  const form = page.locator(".auth-dialog form");
  await form.locator('input[name="username"]').fill("learner");
  await form.locator('input[name="password"]').fill("e2e-test-only");
  await form.getByRole("button", {name:"Войти"}).click();
  await expect(page.locator(".hero h1")).toBeVisible();
  const cookies = await page.context().cookies();
  const session = cookies.find((cookie) => cookie.name === "lw_session");
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Lax");
  expect(session?.expires).toBeGreaterThan(Date.now() / 1000 + 24*86400);
  await page.reload();
  await expect(page.locator(".hero h1")).toBeVisible();
  const sessionState = await page.context().storageState();
  const reopenedBrowser = await browser.newContext({ storageState: sessionState });
  const reopenedPage = await reopenedBrowser.newPage();
  await reopenedPage.goto("/");
  await expect(reopenedPage.locator(".hero h1")).toBeVisible();
  await reopenedBrowser.close();
  await page.getByRole("button", {name:"Выйти из аккаунта"}).click();
  await expect(page.locator(".landing-hero")).toBeVisible();
  const privateData = await page.request.get("/api/state");
  expect(privateData.status()).toBe(401);
});

test("new account registers, chooses a course and keeps private state", async ({ page, browser }) => {
  const username = "student_" + String(Date.now()).slice(-9);
  await page.goto("/");
  await page.getByRole("button", {name:"Начать обучение"}).first().click();
  const form = page.locator(".auth-dialog form");
  await form.locator('input[name="username"]').fill(username);
  await form.locator('input[name="password"]').fill("a-really-good-password-123!");
  await form.getByLabel("Код приглашения").fill("e2e-test-invite");
  await form.getByRole("button", {name:"Создать аккаунт"}).click();
  await expect(page.locator(".workspace-catalog")).toBeVisible();
  const first = page.locator(".workspace-catalog .catalog-card").filter({hasText:"Middle System Analyst"});
  await first.getByRole("button", {name:"Записаться"}).click();
  await expect(page.locator(".hero h1")).toBeVisible();
  await page.locator(".hero").getByRole("button", {name:"Продолжить"}).click();
  await expect(page.locator(".note-card")).toBeVisible();
  await page.getByRole("textbox", {name:"Мысли, выводы, вопросы"}).fill("Only student sees this.");
  await expect(page.locator(".note-card").getByText("Сохранено",{exact:true})).toBeVisible();
  await page.reload();
  await expect(page.locator(".hero h1")).toBeVisible();
  await page.locator(".hero").getByRole("button", {name:"Продолжить"}).click();
  await expect(page.getByRole("textbox",{name:"Мысли, выводы, вопросы"})).toHaveValue("Only student sees this.");
  await page.locator(".nav-item").filter({hasText:"Каталог"}).click();
  await page.locator(".workspace-catalog .catalog-card").filter({hasText:"Frontend Engineering"})
    .getByRole("button", {name:"Записаться"}).click();
  await expect(page.locator(".hero h1")).toBeVisible();
  const switcher = page.getByRole("combobox", {name:"Активный курс"});
  await expect(switcher).toBeVisible();
  await switcher.selectOption("system-analyst");
  await page.locator(".hero").getByRole("button", {name:"Продолжить"}).click();
  await expect(page.getByRole("textbox", {name:"Мысли, выводы, вопросы"})).toHaveValue("Only student sees this.");
  const owner = await browser.newContext();
  const ownerPage = await owner.newPage();
  const response = await submit(ownerPage, "login", {username:"learner",password:"e2e-test-only",remember:true});
  expect(response.status()).toBe(200);
  await ownerPage.goto("/");
  await expect(ownerPage.locator(".hero h1")).toBeVisible();
  await ownerPage.locator(".hero").getByRole("button",{name:"Продолжить"}).click();
  await expect(ownerPage.getByRole("textbox",{name:"Мысли, выводы, вопросы"})).not.toHaveValue("Only student sees this.");
  await owner.close();
  await page.getByRole("button", {name:"Выйти из аккаунта"}).click();
  await expect(page.locator(".landing-hero")).toBeVisible();
  await page.getByRole("button", {name:"Войти",exact:true}).first().click();
  const relogin = page.locator(".auth-dialog form");
  await relogin.locator('input[name="username"]').fill(username);
  await relogin.locator('input[name="password"]').fill("a-really-good-password-123!");
  await relogin.getByRole("button",{name:"Войти"}).click();
  await expect(page.locator(".hero h1")).toBeVisible();
});
