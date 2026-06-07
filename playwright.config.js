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
      ADMIN_PASSWORD_HASH: "pbkdf2_sha256$210000$etoCnXa4sQbt3vaKxDgp1Q$flEuaSKF6HquI5Iem5dKCbCc7oMmNleZ3D0n1IWwGRc",
      ADMIN_SESSION_SECRET: "test-admin-session-secret",
    },
  },
});
