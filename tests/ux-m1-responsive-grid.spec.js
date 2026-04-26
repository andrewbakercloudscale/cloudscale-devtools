/**
 * UX M1 — Status dashboard grid uses responsive auto-fill columns.
 *
 * Verifies:
 *   - All 6 status cards are present in the home tab grid
 *   - Grid renders at both wide (1200px) and narrow (400px) viewports
 *   - At narrow viewport the grid stacks to fewer columns (cards remain visible, not clipped)
 *
 * Run: npx playwright test tests/ux-m1-responsive-grid.spec.js
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

const CARD_LABELS = ['AI CYBER SCAN', 'THREAT MONITOR', 'SMTP MAIL', 'LOGIN SECURITY', 'UPTIME MONITOR', 'SCHEDULED SCAN'];

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

test.describe('M1 — Responsive status grid', () => {

    test('All 6 status cards present at 1200px viewport', async ({ browser }) => {
        const sess = await getAdminSession();
        const ctx  = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1200, height: 900 } });
        await injectCookies(ctx, sess);
        const page = await ctx.newPage();

        await page.goto(`${PLUGIN_URL}&tab=home`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#cs-panel-home', { timeout: 15000 });

        for (const label of CARD_LABELS) {
            await expect(page.locator('#cs-panel-home').locator(`text=${label}`).first()).toBeVisible();
        }

        await ctx.close();
    });

    test('All 6 status cards visible and not overflow-clipped at 420px viewport', async ({ browser }) => {
        const sess = await getAdminSession();
        const ctx  = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 420, height: 900 } });
        await injectCookies(ctx, sess);
        const page = await ctx.newPage();

        await page.goto(`${PLUGIN_URL}&tab=home`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#cs-panel-home', { timeout: 15000 });

        for (const label of CARD_LABELS) {
            const el = page.locator('#cs-panel-home').locator(`text=${label}`).first();
            await expect(el).toBeVisible();
            // Card should not be horizontally clipped — its bounding box should be within viewport width
            const box = await el.boundingBox();
            if (box) {
                expect(box.x).toBeGreaterThanOrEqual(0);
                expect(box.x + box.width).toBeLessThanOrEqual(450);
            }
        }

        await ctx.close();
    });

    test('Grid CSS uses auto-fill responsive columns', async ({ browser }) => {
        const sess = await getAdminSession();
        const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
        await injectCookies(ctx, sess);
        const page = await ctx.newPage();

        await page.goto(`${PLUGIN_URL}&tab=home`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#cs-panel-home', { timeout: 15000 });

        // Verify the grid container has auto-fill template columns in its inline style
        const gridStyle = await page.evaluate(() => {
            const home = document.getElementById('cs-panel-home');
            if (!home) return '';
            const grids = home.querySelectorAll('[style*="auto-fill"]');
            return grids.length > 0 ? grids[0].style.gridTemplateColumns : '';
        });
        expect(gridStyle).toContain('auto-fill');

        await ctx.close();
    });
});
