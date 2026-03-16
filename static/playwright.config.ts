import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: 'html',
    use: {
        baseURL: process.env.BASE_URL ?? 'http://localhost:8080',
        trace: 'on-first-retry',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    timeout: 15_000,
    webServer: process.env.BASE_URL
        ? undefined
        : {
              command: 'cargo run',
              cwd: '..',
              url: 'http://localhost:8080',
              reuseExistingServer: true,
              timeout: 120_000,
          },
});
