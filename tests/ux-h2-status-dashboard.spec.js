/**
 * UX H2 — Home tab rebuilt as a status dashboard.
 *
 * Verifies:
 *   - Home tab shows the 3-column status grid (no long essay)
 *   - All 6 status cards are present with expected labels
 *   - The old 4-paragraph intro essay is gone
 *
 * Run: npx playwright test tests/ux-h2-status-dashboard.spec.js
 */

const { test, expect, request: playwrightRequest } = require('@playwright/test');
const path = require('path');

[
    path.join(__dirname, '..', '.env.test'),
    path.join(__dirname, '..', '..', '.env.test'),
].forEach(p => { try { require('dotenv').config({ path: p }); } catch {} });

const SITE        = process.env.WP_SITE              || 'https://your-wordpress-site.example.com';
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

test('Home tab shows status dashboard with all 6 cards', async ({ browser }) => {
    const sess = await getAdminSession();
    const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
    await injectCookies(ctx, sess);
    const page = await ctx.newPage();

    await page.goto(`${PLUGIN_URL}&tab=home`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#cs-panel-home', { timeout: 15000 });

    const panel = page.locator('#cs-panel-home');

    // All 6 status card labels must be present (use first() as some labels appear in links too)
    await expect(panel.locator('text=AI CYBER SCAN').first()).toBeVisible();
    await expect(panel.locator('text=THREAT MONITOR').first()).toBeVisible();
    await expect(panel.locator('text=SMTP MAIL').first()).toBeVisible();
    await expect(panel.locator('text=LOGIN SECURITY').first()).toBeVisible();
    await expect(panel.locator('text=UPTIME MONITOR').first()).toBeVisible();
    await expect(panel.locator('text=SCHEDULED SCAN').first()).toBeVisible();

    await ctx.close();
});

test('Home tab does not show the old essay intro', async ({ browser }) => {
    const sess = await getAdminSession();
    const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
    await injectCookies(ctx, sess);
    const page = await ctx.newPage();

    await page.goto(`${PLUGIN_URL}&tab=home`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#cs-panel-home', { timeout: 15000 });

    // The essay's distinctive first sentence is gone
    await expect(page.locator('text=WordPress powers over 40% of the internet')).toHaveCount(0);

    await ctx.close();
});

test('Home tab Quick Fixes section is still present', async ({ browser }) => {
    const sess = await getAdminSession();
    const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
    await injectCookies(ctx, sess);
    const page = await ctx.newPage();

    await page.goto(`${PLUGIN_URL}&tab=home`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#cs-panel-home', { timeout: 15000 });

    await expect(page.locator('#cs-quick-fixes-panel')).toBeVisible();

    await ctx.close();
});
