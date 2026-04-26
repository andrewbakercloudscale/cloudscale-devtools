/**
 * UX M2 — Unified notification settings panel.
 *
 * Verifies:
 *   - The global Notifications panel is present on the Security tab
 *   - ntfy URL, email override, and email checkbox inputs exist
 *   - Save Notification Settings shows ✅ Saved feedback
 *   - The Scheduled Scan section no longer contains per-scan ntfy/email rows
 *
 * Run: npx playwright test tests/ux-m2-notifications.spec.js
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

test.describe.configure({ mode: 'serial' });

test.describe('M2 — Unified notification settings', () => {

    test('Notifications panel is present with required inputs', async ({ browser }) => {
        const sess = await getAdminSession();
        const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
        await injectCookies(ctx, sess);
        const page = await ctx.newPage();

        await page.goto(`${PLUGIN_URL}&tab=security`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#cs-notify-save', { timeout: 15000 });

        await expect(page.locator('#cs-notify-email-enabled')).toBeVisible();
        await expect(page.locator('#cs-notify-ntfy-url')).toBeVisible();
        await expect(page.locator('#cs-notify-ntfy-token')).toBeVisible();

        await ctx.close();
    });

    test('Email override input is present', async ({ browser }) => {
        const sess = await getAdminSession();
        const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
        await injectCookies(ctx, sess);
        const page = await ctx.newPage();

        await page.goto(`${PLUGIN_URL}&tab=security`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#cs-notify-save', { timeout: 15000 });

        await expect(page.locator('#cs-notify-email')).toBeVisible();

        await ctx.close();
    });

    test('Save Notification Settings shows Saved feedback', async ({ browser }) => {
        const sess = await getAdminSession();
        const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
        await injectCookies(ctx, sess);
        const page = await ctx.newPage();

        await page.goto(`${PLUGIN_URL}&tab=security`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#cs-notify-save', { timeout: 15000 });

        await page.locator('#cs-notify-save').click();

        const savedMsg = page.locator('#cs-notify-saved');
        await expect(savedMsg).toBeVisible({ timeout: 5000 });

        const text = await savedMsg.textContent();
        expect(text).toContain('Saved');

        await ctx.close();
    });

    test('Scheduled scan section no longer has per-scan ntfy/email rows', async ({ browser }) => {
        const sess = await getAdminSession();
        const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
        await injectCookies(ctx, sess);
        const page = await ctx.newPage();

        await page.goto(`${PLUGIN_URL}&tab=security`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#cs-sched-save', { timeout: 15000 });

        await expect(page.locator('#cs-sched-email')).toHaveCount(0);
        await expect(page.locator('#cs-sched-ntfy-url')).toHaveCount(0);

        await ctx.close();
    });
});
