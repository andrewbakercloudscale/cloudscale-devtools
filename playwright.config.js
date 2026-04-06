// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
    testDir:   './tests',
    globalSetup: './tests/global-setup.js',
    timeout:   60_000,
    retries:   0,
    workers:   1,          // serial — tests share WP state
    use: {
        headless:          false,
        ignoreHTTPSErrors: true,
        screenshot:        'only-on-failure',
        video:             'retain-on-failure',
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ],
});
