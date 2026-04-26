/**
 * UX C1 — AI Settings moved from Home tab to Security tab.
 *
 * Verifies:
 *   - Home tab shows status card, not the AI settings form
 *   - Security tab shows AI settings form and the AI Cyber Audit panel
 *
 * Authentication: test-session API — no new WP users created.
 * Requires .env.test with CSDT_TEST_SECRET, CSDT_TEST_ROLE, CSDT_TEST_SESSION_URL.
 *
 * Run: npx playwright test tests/ux-c1-ai-settings-moved.spec.js
 */

const { test, expect, request: playwrightRequest } = require('@playwright/test');
const path = require('path');

[
    path.join(__dirname, '..', '.env.test'),
    path.join(__dirname, '..', '..', '.env.test'),
].forEach(p => { try { require('dotenv').config({ path: p }); } catch {} });

const SITE        = process.env.WP_SITE             || 'https://andrewbaker.ninja';
const SECRET      = process.env.CSDT_TEST_SECRET    || '';
const ROLE        = process.env.CSDT_TEST_ROLE       || '';
const SESSION_URL = process.env.CSDT_TEST_SESSION_URL || '';
const LOGOUT_URL  = process.env.CSDT_TEST_LOGOUT_URL  || '';

if (!SECRET || !ROLE || !SESSION_URL) {
    throw new Error('CSDT_TEST_SECRET, CSDT_TEST_ROLE, and CSDT_TEST_SESSION_URL must be set in .env.test');
}

const PLUGIN_URL = `${SITE}/wp-admin/tools.php?page=cloudscale-devtools`;

async function getAdminSession(ttl = 900) {
    const ctx  = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
    const resp = await ctx.post(SESSION_URL, { data: { secret: SECRET, role: ROLE, ttl } });
    const body = await resp.json().catch(() => resp.text());
    await ctx.dispose();
    if (!resp.ok()) throw new Error(`test-session API: ${resp.status()} ${JSON.stringify(body)}`);
    return body;
}

async function injectCookies(ctx, sess) {
    await ctx.addCookies([
        { name: sess.secure_auth_cookie_name, value: sess.secure_auth_cookie,  domain: sess.cookie_domain, path: '/', secure: true,  httpOnly: true,  sameSite: 'Lax' },
        { name: sess.logged_in_cookie_name,   value: sess.logged_in_cookie,    domain: sess.cookie_domain, path: '/', secure: true,  httpOnly: false, sameSite: 'Lax' },
    ]);
}

async function logoutTestUser() {
    if (!LOGOUT_URL) return;
    try {
        const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
        await ctx.post(LOGOUT_URL, { data: { secret: SECRET, role: ROLE } });
        await ctx.dispose();
    } catch {}
}

test.describe.configure({ mode: 'serial' });

test.describe('C1 — AI Settings location', () => {

    test.afterAll(async () => {
        await logoutTestUser();
    });

    test('Home tab — AI settings form absent, status card present', async ({ browser }) => {
        const sess = await getAdminSession();
        const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
        await injectCookies(ctx, sess);
        const page = await ctx.newPage();

        await page.goto(`${PLUGIN_URL}&tab=home`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.cs-section-header, #cs-panel-home', { timeout: 15000 });

        // AI settings form elements must NOT be on Home tab
        await expect(page.locator('#cs-sec-provider')).toHaveCount(0);
        await expect(page.locator('#cs-sec-api-key')).toHaveCount(0);
        await expect(page.locator('#cs-sec-save')).toHaveCount(0);
        await expect(page.locator('#cs-sched-enabled')).toHaveCount(0);

        // Status dashboard must show the AI Cyber Scan card (H2 replaced single card with 6-card grid)
        await expect(page.locator('#cs-panel-home').locator('text=AI CYBER SCAN').first()).toBeVisible();

        await ctx.close();
    });

    test('Security tab — AI settings form present', async ({ browser }) => {
        const sess = await getAdminSession();
        const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
        await injectCookies(ctx, sess);
        const page = await ctx.newPage();

        await page.goto(`${PLUGIN_URL}&tab=security`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.cs-section-header', { timeout: 15000 });

        await expect(page.locator('#cs-panel-ai-settings')).toBeVisible();
        await expect(page.locator('#cs-sec-provider')).toBeVisible();
        await expect(page.locator('#cs-sec-api-key')).toBeVisible();
        await expect(page.locator('#cs-sec-save')).toBeVisible();
        await expect(page.locator('#cs-sched-enabled')).toBeVisible();
        await expect(page.locator('#cs-panel-ai-cyber-audit')).toBeVisible();

        await ctx.close();
    });

    test('Security tab intro — no reference to Home tab for configuration', async ({ browser }) => {
        const sess = await getAdminSession();
        const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
        await injectCookies(ctx, sess);
        const page = await ctx.newPage();

        await page.goto(`${PLUGIN_URL}&tab=security`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.cs-tab-intro', { timeout: 15000 });

        const introText = await page.locator('.cs-tab-intro').first().textContent();
        expect(introText).not.toContain('Home tab');

        await ctx.close();
    });
});
