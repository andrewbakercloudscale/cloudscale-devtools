/**
 * Frontend — Generate Featured Image button (admin-only pill on single posts)
 *
 * Verifies:
 *   - The "🎨 Generate Featured Image" pill appears on a single post page when admin is logged in
 *   - The pill does NOT appear when not logged in
 *   - Clicking the pill opens the generate modal
 *   - The modal has style/quality controls and a Generate button
 *   - The modal closes on Cancel (Escape + button)
 *
 * Run: npx playwright test tests/ux-frontend-gen-image.spec.js --config=playwright.no-setup.config.js
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

async function getFirstPostUrl() {
    const ctx  = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
    const resp = await ctx.get( `${SITE}/wp-json/wp/v2/posts?per_page=1&_fields=link`, { timeout: 15000 } );
    const body = await resp.json().catch(() => []);
    await ctx.dispose();
    if ( ! Array.isArray(body) || ! body[0] ) throw new Error('Could not fetch first post from REST API');
    return body[0].link;
}

test.describe('Frontend — Generate Featured Image button', () => {

    test('pill appears on single post page for admin', async ({ browser }) => {
        const sess = await getAdminSession();
        const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
        await injectCookies(ctx, sess);
        const page = await ctx.newPage();

        const postUrl = await getFirstPostUrl();
        console.log('Testing on:', postUrl);
        expect(postUrl).toBeTruthy();

        await page.goto(postUrl, { waitUntil: 'domcontentloaded' });

        const pill = page.locator('.csdt-gen-img-pill');
        await expect(pill).toBeVisible({ timeout: 8000 });
        await expect(pill).toContainText('Generate Featured Image');

        await ctx.close();
    });

    test('pill does NOT appear when not logged in', async ({ browser }) => {
        const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
        const page = await ctx.newPage();

        const postUrl = await getFirstPostUrl();
        await page.goto(postUrl, { waitUntil: 'domcontentloaded' });

        const pill = page.locator('.csdt-gen-img-pill');
        await expect(pill).toHaveCount(0);

        await ctx.close();
    });

    test('clicking pill opens modal with controls', async ({ browser }) => {
        const sess = await getAdminSession();
        const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
        await injectCookies(ctx, sess);
        const page = await ctx.newPage();

        const postUrl = await getFirstPostUrl();
        await page.goto(postUrl, { waitUntil: 'domcontentloaded' });

        const pill = page.locator('.csdt-gen-img-pill');
        await expect(pill).toBeVisible({ timeout: 8000 });
        await pill.click();

        // Modal background must be visible
        const modalBg = page.locator('.csdt-gen-modal-bg');
        await expect(modalBg).toBeVisible({ timeout: 3000 });

        // Style and quality selects must exist; no dual-option checkbox
        await expect(page.locator('#csdt-gen-style')).toBeVisible();
        await expect(page.locator('#csdt-gen-quality')).toBeVisible();
        await expect(page.locator('#csdt-gen-dual')).toHaveCount(0);

        // Quality must default to Standard
        await expect(page.locator('#csdt-gen-quality')).toHaveValue('standard');

        // Generate, Save, Cancel buttons
        await expect(page.locator('#csdt-gen-regen')).toBeVisible();
        await expect(page.locator('#csdt-gen-cancel')).toBeVisible();
        await expect(page.locator('#csdt-gen-save')).toBeVisible();

        // Save should be disabled until an image is generated
        await expect(page.locator('#csdt-gen-save')).toBeDisabled();

        await ctx.close();
    });

    test('Cancel button closes modal', async ({ browser }) => {
        const sess = await getAdminSession();
        const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
        await injectCookies(ctx, sess);
        const page = await ctx.newPage();

        const postUrl = await getFirstPostUrl();
        await page.goto(postUrl, { waitUntil: 'domcontentloaded' });

        await page.locator('.csdt-gen-img-pill').click();
        await expect(page.locator('.csdt-gen-modal-bg')).toBeVisible({ timeout: 3000 });

        await page.locator('#csdt-gen-cancel').click();
        await expect(page.locator('.csdt-gen-modal-bg')).toBeHidden({ timeout: 3000 });

        await ctx.close();
    });

    test('Escape key closes modal', async ({ browser }) => {
        const sess = await getAdminSession();
        const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
        await injectCookies(ctx, sess);
        const page = await ctx.newPage();

        const postUrl = await getFirstPostUrl();
        await page.goto(postUrl, { waitUntil: 'domcontentloaded' });

        await page.locator('.csdt-gen-img-pill').click();
        await expect(page.locator('.csdt-gen-modal-bg')).toBeVisible({ timeout: 3000 });

        await page.keyboard.press('Escape');
        await expect(page.locator('.csdt-gen-modal-bg')).toBeHidden({ timeout: 3000 });

        await ctx.close();
    });

    test('pill is positioned above or near the post content (not at bottom of page)', async ({ browser }) => {
        const sess = await getAdminSession();
        const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
        await injectCookies(ctx, sess);
        const page = await ctx.newPage();

        const postUrl = await getFirstPostUrl();
        await page.goto(postUrl, { waitUntil: 'domcontentloaded' });

        const pill = page.locator('.csdt-gen-img-pill');
        await expect(pill).toBeVisible({ timeout: 8000 });

        const pillBox   = await pill.boundingBox();
        const pageHeight = await page.evaluate(() => document.body.scrollHeight);
        console.log(`Pill Y: ${pillBox.y}, page height: ${pageHeight}`);

        // Pill should be in the top 60% of the page
        expect(pillBox.y).toBeLessThan(pageHeight * 0.6);

        await ctx.close();
    });

});
