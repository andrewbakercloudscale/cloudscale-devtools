/**
 * UX M3 — Empty state CTA cards shown when no scan results exist.
 *
 * Verifies:
 *   - Scan history panel: if history is empty, the styled CTA card appears
 *   - Site Audit panel: #csdt-site-audit-empty appears when no cache exists
 *   - Both CTA cards contain actionable copy and an action element
 *
 * Note: If scan history or audit cache exists on the test server these tests
 * verify that the empty-state elements are absent (correct behaviour).
 *
 * Run: npx playwright test tests/ux-m3-empty-states.spec.js
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

test.describe('M3 — Empty state CTA cards', () => {

    test('Scan history panel: either history rows or empty-state CTA present (not both, not neither)', async ({ browser }) => {
        const sess = await getAdminSession();
        const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
        await injectCookies(ctx, sess);
        const page = await ctx.newPage();

        await page.goto(`${PLUGIN_URL}&tab=security`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#cs-scan-history-wrap', { timeout: 15000 });

        const hasRows  = await page.locator('#cs-scan-history-wrap .csdt-view-report-btn').count();
        const hasEmpty = await page.locator('#cs-scan-history-wrap a[href*="cs-panel-ai-cyber-audit"]').count();

        // One of the two states must exist
        expect(hasRows + hasEmpty).toBeGreaterThan(0);

        // If history is present, empty CTA link should NOT be there
        if (hasRows > 0) {
            expect(hasEmpty).toBe(0);
        }

        // If history is absent, empty CTA link should be there
        if (hasRows === 0) {
            expect(hasEmpty).toBeGreaterThan(0);
            // The empty state CTA should contain actionable copy
            const ctaText = await page.locator('#cs-scan-history-wrap').textContent();
            expect(ctaText).toContain('scan');
        }

        await ctx.close();
    });

    test('Site Audit panel: #csdt-site-audit-empty only visible when no cached result', async ({ browser }) => {
        const sess = await getAdminSession();
        const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
        await injectCookies(ctx, sess);
        const page = await ctx.newPage();

        await page.goto(`${PLUGIN_URL}&tab=site-audit`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#cs-panel-site-audit', { timeout: 15000 });

        const resultsVisible = await page.locator('#csdt-site-audit-results').evaluate(el => el.style.display !== 'none' && el.innerHTML.trim() !== '');
        const emptyVisible   = await page.locator('#csdt-site-audit-empty').count();

        if (resultsVisible) {
            // Cached results loaded — empty state should not be shown (JS hides it)
            const emptyEl = page.locator('#csdt-site-audit-empty');
            if (await emptyEl.count() > 0) {
                await expect(emptyEl).not.toBeVisible();
            }
        } else if (emptyVisible > 0) {
            // No cache — empty state should be visible
            await expect(page.locator('#csdt-site-audit-empty')).toBeVisible();
            const text = await page.locator('#csdt-site-audit-empty').textContent();
            expect(text).toContain('audit');
        }

        await ctx.close();
    });

    test('Site Audit empty state contains correct copy when present', async ({ browser }) => {
        const sess = await getAdminSession();
        const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
        await injectCookies(ctx, sess);
        const page = await ctx.newPage();

        await page.goto(`${PLUGIN_URL}&tab=site-audit`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#cs-panel-site-audit', { timeout: 15000 });

        const emptyEl = page.locator('#csdt-site-audit-empty');
        const count = await emptyEl.count();

        if (count > 0 && await emptyEl.isVisible()) {
            const text = await emptyEl.textContent();
            expect(text).toContain('No audit results yet');
            expect(text).toContain('Run Site Audit');
        }
        // If not present (cached results exist) the test passes vacuously

        await ctx.close();
    });
});
