// Minimal config — no global setup, for running single tests against live site.
const { defineConfig, devices } = require('@playwright/test');
module.exports = defineConfig({
    testDir: './tests',
    timeout: 30_000,
    retries: 0,
    workers: 1,
    use: {
        headless: true,
        ignoreHTTPSErrors: true,
        screenshot: 'only-on-failure',
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ],
});
