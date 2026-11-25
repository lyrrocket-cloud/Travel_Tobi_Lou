import { defineConfig, devices } from '@playwright/test';

/**
 * E2E 测试配置：
 * - 复用已运行的 dev server（http://localhost:3000），不自动拉起。
 * - 每个测试使用全新 context，localStorage 为空，模拟"无缓存首次打开分享链接"。
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    actionTimeout: 15_000,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
});
