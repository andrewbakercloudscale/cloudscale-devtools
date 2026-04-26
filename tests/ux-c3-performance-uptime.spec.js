/**
 * UX C3 — "Optimizer" renamed to "Performance"; Uptime Monitor moved to Diagnostics.
 *
 * Verifies:
 *   - Tab bar shows "Performance" not "Optimizer"
 *   - Performance tab (?tab=optimizer) no longer contains #cs-panel-uptime-monitor
 *   - Diagnostics tab (?tab=debug) now contains #cs-panel-uptime-monitor
 *
 * Run: npx playwright test tests/ux-c3-performance-uptime.spec.js
 */

const { test, expect, request: playwrightRequest } = require('@playwright/test');
const path = require('path');

[
    path.join(__dirname, '..', '.env.test'),
    path.join(__dirname, '..', '..', '.env.test'),
].forEach(p => { try { require('dotenv').config({ path: p }); } catch {} });

const SITE        = process.env.WP_SITE              || 'https://andrewbaker.ninja';
const SECRET      = process.env.CSDT_TEST_SECRET     || '';
const ROLE        = process.env.CSDT_TEST_ROLE        || '';
const SESSION_URL = process.env.CSDT_TEST_SESSION_URL || '';
const LOGOUT_URL  = process.env.CSDT_TEST_LOGOUT_URL  || '';

if (!SECRET || !ROLE || !SESSION_URL) {
    throw new Error('CSDT_TEST_SECRET, CSDT_TEST_ROLE, and CSDT_TEST_SESSION_URL must be set in .env.test');
}

const PLUGIN_URL = `${SITE}/wp-admin/tools.php?page=cloudscale-devtools`;

async function getAdminSession() {
    const ctx  = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
    const resp = await ctx.post(SESSION_URL, { data: { secret: SECRET, role: ROLE, ttl: 900 } });
    const body = await resp.json().catch(() => resp.text());
    await ctx.dispose();
    if (!resp.ok()) throw new Error(`test-session API: ${resp.status()}`);
    return body;
}

async function injectCookies(ctx, sess) {
    await ctx.addCookies([
        { name: sess.secure_auth_cookie_name, value: sess.secure_auth_cookie,  domain: sess.cookie_domain, path: '/', secure: true,  httpOnly: true,  sameSite: 'Lax' },
        { name: sess.logged_in_cookie_name,   value: sess.logged_in_cookie,    domain: sess.cookie_domain, path: '/', secure: true,  httpOnly: false, sameSite: 'Lax' },
    ]);
}

test.afterAll(async () => {
    if (!LOGOUT_URL) return;
    try {
        const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
        await ctx.post(LOGOUT_URL, { data: { secret: SECRET, role: ROLE } });
        await ctx.dispose();
    } catch {}
});

test('Tab bar shows "Performance" not "Optimizer"', async ({ browser }) => {
    const sess = await getAdminSession();
    const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
    await injectCookies(ctx, sess);
    const page = await ctx.newPage();

    await page.goto(`${PLUGIN_URL}&tab=home`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#cs-tab-bar', { timeout: 15000 });

    const tabBar = page.locator('#cs-tab-bar');
    await expect(tabBar.locator('text=Performance')).toBeVisible();
    await expect(tabBar.locator('text=Optimizer')).toHaveCount(0);

    await ctx.close();
});

test('Performance tab — Uptime Monitor is gone', async ({ browser }) => {
    const sess = await getAdminSession();
    const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
    await injectCookies(ctx, sess);
    const page = await ctx.newPage();

    await page.goto(`${PLUGIN_URL}&tab=optimizer`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.cs-section-header', { timeout: 15000 });

    await expect(page.locator('#cs-panel-uptime-monitor')).toHaveCount(0);
    await expect(page.locator('#cs-panel-plugin-stack')).toBeVisible();

    await ctx.close();
});

test('Diagnostics tab — Uptime Monitor is present', async ({ browser }) => {
    const sess = await getAdminSession();
    const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
    await injectCookies(ctx, sess);
    const page = await ctx.newPage();

    await page.goto(`${PLUGIN_URL}&tab=debug`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.cs-section-header', { timeout: 15000 });

    await expect(page.locator('#cs-panel-uptime-monitor')).toBeVisible();

    await ctx.close();
});
