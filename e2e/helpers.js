import { expect } from "@playwright/test";

export async function loginAsOwner(page) {
  const response = await page.request.post("/api/auth/login", {
    data: { username: "learner", password: "e2e-test-only", remember: true },
    headers: { "X-Workspace": "1" },
  });
  expect(response.status()).toBe(200);
  const me = await page.request.get("/api/auth/me");
  expect((await me.json()).user.username).toBe("learner");
}
