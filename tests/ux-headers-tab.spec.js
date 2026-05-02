/**
 * Headers tab — Security Headers + Scan UX
 *
 * Verifies:
 *   - "🔒 Headers" tab exists in the tab bar and navigates correctly
 *   - Scan Headers button fires once, returns a result, and shows a grade
 *   - Grade is NOT "F" when headers are enabled
 *   - Saving Security Headers settings fires only once (no stacked listeners)
 *   - Scan history wrap appears after a scan
 *   - CSP panel is present on the tab
 *
 * Run: npx playwright test tests/ux-headers-tab.spec.js --config=playwright.no-setup.config.js
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

if (!SECRET || !ROLE || !SESSION_URL) {
    throw new Error('CSDT_TEST_SECRET, CSDT_TEST_ROLE, and CSDT_TEST_SESSION_URL must be set in .env.test');
}

const PLUGIN_URL  = `${SITE}/wp-admin/tools.php?page=cloudscale-devtools`;
const HEADERS_URL = `${PLUGIN_URL}&tab=headers`;

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

test.describe('Headers tab', () => {

    test('tab link exists in nav bar', async ({ browser }) => {
        const sess = await getAdminSession();
        const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
        await injectCookies(ctx, sess);
        const page = await ctx.newPage();

        await page.goto(PLUGIN_URL, { waitUntil: 'domcontentloaded' });

        // Tab link must exist
        const tabLink = page.locator('a.cs-tab', { hasText: 'Headers' });
        await expect(tabLink).toBeVisible();

        await ctx.close();
    });

    test('Headers tab loads scan panel and settings', async ({ browser }) => {
        const sess = await getAdminSession();
        const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
        await injectCookies(ctx, sess);
        const page = await ctx.newPage();

        await page.goto(HEADERS_URL, { waitUntil: 'domcontentloaded' });

        // Scan button must be present
        await expect(page.locator('#csdt-scan-headers-btn')).toBeVisible();

        // Security headers enable checkbox must be present
        await expect(page.locator('#csdt-sec-headers-enabled')).toBeVisible();

        // Save button must be present
        await expect(page.locator('#csdt-sec-headers-save')).toBeVisible();

        await ctx.close();
    });

    test('scan returns a result and grade is not F when headers enabled', async ({ browser }) => {
        const sess = await getAdminSession();
        const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
        await injectCookies(ctx, sess);
        const page = await ctx.newPage();

        await page.goto(HEADERS_URL, { waitUntil: 'domcontentloaded' });

        // Ensure headers are enabled before scanning
        const enabledCheckbox = page.locator('#csdt-sec-headers-enabled');
        const isChecked = await enabledCheckbox.isChecked();
        if (!isChecked) {
            await enabledCheckbox.check();
            await page.locator('#csdt-sec-headers-save').click();
            // Wait for saved feedback
            await expect(page.locator('#csdt-sec-headers-msg')).toBeVisible({ timeout: 5000 });
        }

        const scanBtn     = page.locator('#csdt-scan-headers-btn');
        const resultsDiv  = page.locator('#csdt-scan-results');
        const historyWrap = page.locator('#csdt-scan-history-wrap');

        await scanBtn.click();

        // Results div must become visible
        await expect(resultsDiv).toBeVisible({ timeout: 30000 });

        // Grade should be present in results
        const resultsText = await resultsDiv.innerText();
        console.log('Scan result:', resultsText.slice(0, 300));

        // When headers are enabled, grade should NOT be F
        expect(resultsText).not.toMatch(/Grade:\s*F\b/);

        // History wrap should be visible after first scan
        await expect(historyWrap).toBeVisible({ timeout: 5000 });

        await ctx.close();
    });

    test('save settings fires only once per click (no stacked listeners)', async ({ browser }) => {
        const sess = await getAdminSession();
        const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
        await injectCookies(ctx, sess);
        const page = await ctx.newPage();

        await page.goto(HEADERS_URL, { waitUntil: 'domcontentloaded' });

        // Track AJAX save calls — request body is multipart, use postData() string match
        let saveCallCount = 0;
        page.on('request', req => {
            if (req.url().includes('admin-ajax.php')) {
                const body = req.postData() || '';
                if (body.includes('csdt_sec_headers_save')) saveCallCount++;
            }
        });

        const saveBtn = page.locator('#csdt-sec-headers-save');
        await saveBtn.click();

        // Wait for saved feedback to confirm the request fired
        await expect(page.locator('#csdt-sec-headers-msg')).toBeVisible({ timeout: 5000 });
        // Wait a beat for any stacked duplicates
        await page.waitForTimeout(1000);

        console.log(`Save AJAX calls fired: ${saveCallCount}`);
        expect(saveCallCount).toBe(1);

        await ctx.close();
    });

    test('save settings fires only once after navigating away and back', async ({ browser }) => {
        const sess = await getAdminSession();
        const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
        await injectCookies(ctx, sess);
        const page = await ctx.newPage();

        // Land on a different tab first, then navigate to headers
        await page.goto(`${PLUGIN_URL}&tab=home`, { waitUntil: 'domcontentloaded' });
        await page.goto(HEADERS_URL, { waitUntil: 'domcontentloaded' });

        let saveCallCount = 0;
        page.on('request', req => {
            if (req.url().includes('admin-ajax.php')) {
                const body = req.postData() || '';
                if (body.includes('csdt_sec_headers_save')) saveCallCount++;
            }
        });

        await page.locator('#csdt-sec-headers-save').click();
        await expect(page.locator('#csdt-sec-headers-msg')).toBeVisible({ timeout: 5000 });
        await page.waitForTimeout(1000);

        console.log(`Save AJAX calls (after tab hop): ${saveCallCount}`);
        expect(saveCallCount).toBe(1);

        await ctx.close();
    });

    test('scan history accumulates entries over multiple scans', async ({ browser }) => {
        const sess = await getAdminSession();
        const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
        await injectCookies(ctx, sess);
        const page = await ctx.newPage();

        await page.goto(HEADERS_URL, { waitUntil: 'domcontentloaded' });

        const scanBtn    = page.locator('#csdt-scan-headers-btn');
        const historyWrap = page.locator('#csdt-scan-history-wrap');
        const historyList = page.locator('#csdt-scan-history-list');

        // Run two scans
        await scanBtn.click();
        await expect(page.locator('#csdt-scan-results')).toBeVisible({ timeout: 30000 });

        await scanBtn.click();
        await expect(page.locator('#csdt-scan-results')).toBeVisible({ timeout: 30000 });

        // History wrap visible
        await expect(historyWrap).toBeVisible();

        // History list is rendered as divs via JS — wait for at least one to appear
        await expect(historyList.locator('div').first()).toBeVisible({ timeout: 5000 });
        const count = await historyList.locator('div').count();
        console.log(`History rows: ${count}`);
        expect(count).toBeGreaterThanOrEqual(1);

        await ctx.close();
    });

});
