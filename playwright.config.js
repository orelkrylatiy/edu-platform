import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:8000",
    httpCredentials: { username: "learner", password: "e2e-test-only" },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "python -m uvicorn server.app:app --host 127.0.0.1 --port 8000",
    url: "http://127.0.0.1:8000/health",
    env: {
      WORKSPACE_PASSWORD: "e2e-test-only",
      WORKSPACE_DB: "data/e2e-test.sqlite3",
    },
    reuseExistingServer: false,
  },
});
