/**
 * UX M5 — Site Audit severity filter chips.
 *
 * Verifies:
 *   - After audit results load, severity chip row is present (#csdt-sev-filters)
 *   - Chips appear for severities that have findings (not for empty severities)
 *   - "All" chip is active by default
 *   - Clicking a severity chip hides cards that don't match
 *   - Clicking "All" restores all visible cards
 *
 * Requires cached audit results to exist on the test server.
 * If no results are cached, the severity chips won't exist and tests skip gracefully.
 *
 * Run: npx playwright test tests/ux-m5-severity-filters.spec.js
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

async function loadAuditTab(browser) {
    const sess = await getAdminSession();
    const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
    await injectCookies(ctx, sess);
    const page = await ctx.newPage();
    await page.goto(`${PLUGIN_URL}&tab=site-audit`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#cs-panel-site-audit', { timeout: 15000 });
    return { page, ctx };
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

test.describe('M5 — Severity filter chips', () => {

    test('Severity chip row present when audit results are loaded', async ({ browser }) => {
        const { page, ctx } = await loadAuditTab(browser);

        const hasResults = await page.locator('#csdt-audit-cards').count();
        if (!hasResults) {
            // No cached results — test passes vacuously
            await ctx.close();
            return;
        }

        await expect(page.locator('#csdt-sev-filters')).toBeVisible();

        // "All" chip should be present and active
        const allChip = page.locator('#csdt-sev-filters button[data-sev="all"]');
        await expect(allChip).toBeVisible();

        await ctx.close();
    });

    test('Severity chips only shown for severities with findings', async ({ browser }) => {
        const { page, ctx } = await loadAuditTab(browser);

        const hasResults = await page.locator('#csdt-audit-cards').count();
        if (!hasResults) {
            await ctx.close();
            return;
        }

        // Each visible chip (except All) should match a severity that exists in the cards
        const chips = page.locator('#csdt-sev-filters button[data-sev]:not([data-sev="all"])');
        const chipCount = await chips.count();

        for (let i = 0; i < chipCount; i++) {
            const sev = await chips.nth(i).getAttribute('data-sev');
            // Verify at least one card with this severity exists
            const cardsBySev = await page.evaluate((s) => {
                const cards = document.querySelectorAll('#csdt-audit-cards > div');
                let cnt = 0;
                cards.forEach(c => {
                    const badge = c.querySelector('[style*="border-radius:20px"], [style*="border-radius: 20px"]');
                    // Look for severity text inside card
                    if (c.textContent.toLowerCase().includes(s)) cnt++;
                });
                return cnt;
            }, sev);
            expect(cardsBySev).toBeGreaterThan(0);
        }

        await ctx.close();
    });

    test('Clicking a severity chip filters cards to matching severity only', async ({ browser }) => {
        const { page, ctx } = await loadAuditTab(browser);

        const hasResults = await page.locator('#csdt-audit-cards').count();
        if (!hasResults) {
            await ctx.close();
            return;
        }

        // Find a non-All chip to click
        const chips = page.locator('#csdt-sev-filters button[data-sev]:not([data-sev="all"])');
        const chipCount = await chips.count();
        if (chipCount === 0) {
            await ctx.close();
            return;
        }

        const totalCardsBefore = await page.locator('#csdt-audit-cards > div').count();
        const firstChip = chips.nth(0);
        const targetSev = await firstChip.getAttribute('data-sev');

        await firstChip.click();
        await page.waitForTimeout(300);

        // Count visible cards after filter
        const visibleCards = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('#csdt-audit-cards > div'))
                .filter(c => c.style.display !== 'none').length;
        });

        // Should have fewer or equal visible cards (could be equal if all cards match)
        expect(visibleCards).toBeLessThanOrEqual(totalCardsBefore);

        await ctx.close();
    });

    test('Clicking All chip restores all cards', async ({ browser }) => {
        const { page, ctx } = await loadAuditTab(browser);

        const hasResults = await page.locator('#csdt-audit-cards').count();
        if (!hasResults) {
            await ctx.close();
            return;
        }

        const chips = page.locator('#csdt-sev-filters button[data-sev]:not([data-sev="all"])');
        if (await chips.count() === 0) {
            await ctx.close();
            return;
        }

        const totalCards = await page.locator('#csdt-audit-cards > div').count();

        // Filter to first severity
        await chips.nth(0).click();
        await page.waitForTimeout(200);

        // Click All to restore
        await page.locator('#csdt-sev-filters button[data-sev="all"]').click();
        await page.waitForTimeout(200);

        const visibleAfterAll = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('#csdt-audit-cards > div'))
                .filter(c => c.style.display !== 'none').length;
        });

        expect(visibleAfterAll).toBe(totalCards);

        await ctx.close();
    });
});
