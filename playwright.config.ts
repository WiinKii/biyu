import { defineConfig, devices } from '@playwright/test';

const PORT = 8787;

/**
 * E2E against the real local stack: the built PWA served as Workers Static Assets and the API
 * Worker with local D1, both through `wrangler dev` (ROADMAP fase 0, TESTING §1 and §8).
 */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'off',
    locale: 'es-VE',
    timezoneId: 'America/Caracas',
  },
  projects: [
    {
      name: 'mobile-390-light',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        colorScheme: 'light',
      },
    },
    {
      name: 'mobile-375-dark',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
        colorScheme: 'dark',
      },
    },
    {
      name: 'tablet-768-dark',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
        colorScheme: 'dark',
      },
    },
    {
      name: 'desktop-1440-light',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        colorScheme: 'light',
      },
    },
  ],
  webServer: {
    command: `pnpm --filter @biyu/web build && pnpm --filter @biyu/api exec wrangler dev --ip 127.0.0.1 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/api/v1/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
