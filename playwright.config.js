const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: "http://127.0.0.1:4210",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm start",
    url: "http://127.0.0.1:4210",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      PORT: "4210",
      MONGODB_URI: process.env.MONGODB_URI || "",
      MONGODB_DB: process.env.MONGODB_DB || "aircomplain",
      ADMIN_TOKEN: "test-admin-token",
    },
  },
});
