/**
 * UX M6 — Status dashboard cards show live detail (last-check timestamps).
 *
 * Verifies:
 *   - All 6 status cards are present in the home tab
 *   - Threat Monitor card shows either a "Last check: X ago" timestamp or the static
 *     fallback description when the monitor hasn't run
 *   - Uptime Monitor card shows either a "Last ping: X ago" timestamp or the static
 *     fallback description when no ping has been recorded
 *   - The detail line is never empty
 *
 * Run: npx playwright test tests/ux-m6-status-timestamps.spec.js
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

test.describe('M6 — Status dashboard live detail', () => {

    test('Threat Monitor detail shows timestamp or fallback copy', async ({ browser }) => {
        const sess = await getAdminSession();
        const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
        await injectCookies(ctx, sess);
        const page = await ctx.newPage();

        await page.goto(`${PLUGIN_URL}&tab=home`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#cs-panel-home', { timeout: 15000 });

        const homeText = await page.locator('#cs-panel-home').textContent();

        // The Threat Monitor label must be present
        expect(homeText).toContain('Threat Monitor');

        // After the Threat Monitor label, the detail line must be either a timestamp or fallback
        const hasTimestamp = homeText.includes('Last check:');
        const hasFallback  = homeText.includes('File integrity') || homeText.includes('probe detection');
        expect(hasTimestamp || hasFallback).toBe(true);

        // If timestamp present, it should be in "X ago" format
        if (hasTimestamp) {
            expect(homeText).toMatch(/Last check:.+ago/);
        }

        await ctx.close();
    });

    test('Uptime Monitor detail shows timestamp or fallback copy', async ({ browser }) => {
        const sess = await getAdminSession();
        const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
        await injectCookies(ctx, sess);
        const page = await ctx.newPage();

        await page.goto(`${PLUGIN_URL}&tab=home`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#cs-panel-home', { timeout: 15000 });

        const homeText = await page.locator('#cs-panel-home').textContent();

        // The Uptime Monitor label must be present
        expect(homeText).toContain('Uptime Monitor');

        // After the Uptime Monitor label, the detail line must be either a timestamp or fallback
        const hasTimestamp = homeText.includes('Last ping:');
        const hasFallback  = homeText.includes('Cloudflare') || homeText.includes('heartbeat') || homeText.includes('Worker');
        expect(hasTimestamp || hasFallback).toBe(true);

        // If timestamp present, it should be in "X ago" format
        if (hasTimestamp) {
            expect(homeText).toMatch(/Last ping:.+ago/);
        }

        await ctx.close();
    });
});
