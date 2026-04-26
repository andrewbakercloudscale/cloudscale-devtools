/**
 * CSP Health Check — two phases:
 *   1. Discovery: runs with the production presets to verify the site is clean.
 *      Prints a grouped violation report so any new third-party domains are easy
 *      to spot. Fails if violations appear.
 *   2. (Optional) Raw scan: re-run with no allowlist to surface any NEW domains
 *      not yet in a preset. Prints only — does not fail.
 *
 * Run:  npx playwright test tests/csp-violation-rca.spec.js --headed --project=chromium
 */
// @ts-check
const { test, expect, request: playwrightRequest } = require('@playwright/test');
const path = require('path');

[ path.join(__dirname, '..', '.env.test'),
  path.join(__dirname, '..', '..', '.env.test'),
].forEach(p => { try { require('dotenv').config({ path: p }); } catch {} });

const SITE        = process.env.WP_SITE             || 'https://andrewbaker.ninja';
const SECRET      = process.env.CSDT_TEST_SECRET    || '';
const ROLE        = process.env.CSDT_TEST_ROLE       || '';
const SESSION_URL = process.env.CSDT_TEST_SESSION_URL || '';
const LOGOUT_URL  = process.env.CSDT_TEST_LOGOUT_URL  || '';
const ADMIN_TAB   = `${SITE}/wp-admin/tools.php?page=cloudscale-devtools&tab=security`;

// Services that are known to be used on this site and are covered by presets.
const PRODUCTION_SERVICES = [
    'google_adsense',
    'google_fonts',
    'google_analytics',
    'google_tag_manager',
    'cloudflare_insights',
    'recaptcha',
];

const PAGES_TO_BROWSE = ['/', '/blog/', '/posts/'];

test.setTimeout(180_000);

async function getAdminSession(ttl = 1800) {
    const ctx  = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
    const resp = await ctx.post(SESSION_URL, { data: { secret: SECRET, role: ROLE, ttl } });
    const body = await resp.json().catch(() => resp.text());
    await ctx.dispose();
    if (!resp.ok()) throw new Error(`test-session API: ${resp.status()} ${JSON.stringify(body)}`);
    return body;
}

async function injectCookies(ctx, sess) {
    await ctx.addCookies([
        { name: sess.secure_auth_cookie_name, value: sess.secure_auth_cookie,
          domain: sess.cookie_domain, path: '/', secure: true, httpOnly: true, sameSite: 'Lax' },
        { name: sess.logged_in_cookie_name, value: sess.logged_in_cookie,
          domain: sess.cookie_domain, path: '/', secure: true, httpOnly: false, sameSite: 'Lax' },
    ]);
}

async function wpAjax(page, action, extra = {}) {
    const nonce = await page.evaluate(() => {
        const el = document.querySelector('[data-nonce], #_csdt_nonce');
        if (el) return el.dataset.nonce || el.value;
        return typeof csdtVulnScan !== 'undefined' ? csdtVulnScan.nonce : null;
    });
    const body = new URLSearchParams({ action, nonce: nonce || '', ...extra });
    return page.evaluate(async ({ url, b }) => {
        const r = await fetch(url, { method: 'POST', body: new URLSearchParams(b) });
        return r.json();
    }, { url: `${SITE}/wp-admin/admin-ajax.php`, b: Object.fromEntries(body) });
}

async function browsePages(browser) {
    const ctx  = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await ctx.newPage();
    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push(e.message));

    for (const slug of PAGES_TO_BROWSE) {
        console.log(`  → ${SITE}${slug}`);
        try {
            await page.goto(`${SITE}${slug}`, { waitUntil: 'networkidle', timeout: 30_000 });
            await page.waitForTimeout(3_000);
        } catch (e) {
            console.warn(`  ! ${slug}: ${e.message}`);
        }
    }
    // Browse a single post.
    try {
        await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 20_000 });
        const postLink = await page.$('a[href*="/20"]');
        if (postLink) {
            const href = await postLink.getAttribute('href');
            console.log(`  → ${href} (single post)`);
            await page.goto(href, { waitUntil: 'networkidle', timeout: 30_000 });
            await page.waitForTimeout(3_000);
        }
    } catch {}

    await ctx.close();
    return pageErrors;
}

function printViolationReport(violations, pageErrors, label) {
    console.log('\n════════════════════════════════════════════════════════');
    console.log(`  CSP VIOLATION REPORT — ${label}`);
    console.log('════════════════════════════════════════════════════════');

    if (!violations.length) {
        console.log('  No violations recorded.');
    } else {
        const grouped = {};
        violations.forEach(v => {
            const key = `${v.directive} | ${v.blocked}`;
            if (!grouped[key]) grouped[key] = { directive: v.directive, blocked: v.blocked, pages: new Set(), count: 0 };
            grouped[key].count++;
            if (v.page) grouped[key].pages.add(v.page.replace(/^https?:\/\/[^/]+/, ''));
        });
        const sorted = Object.values(grouped).sort((a, b) => b.count - a.count);
        console.log(`  Total violations: ${violations.length} across ${sorted.length} unique blocked URIs\n`);
        sorted.forEach((g, i) => {
            console.log(`  ${i + 1}. [${g.directive}]`);
            console.log(`     Blocked:  ${g.blocked || '(inline/eval)'}`);
            console.log(`     Count:    ${g.count}`);
            console.log(`     Pages:    ${[...g.pages].slice(0, 3).join(', ') || '/'}`);
            console.log();
        });
    }
    if (pageErrors.length) {
        console.log('  Browser JS errors:');
        [...new Set(pageErrors)].forEach(e => console.log(`    • ${e}`));
    }
    console.log('════════════════════════════════════════════════════════\n');
}

test.afterAll(async () => {
    if (!LOGOUT_URL) return;
    try {
        const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
        await ctx.post(LOGOUT_URL, { data: { secret: SECRET, role: ROLE } });
        await ctx.dispose();
    } catch {}
});

test('CSP health check — production presets produce zero violations', async ({ browser }) => {
    const sess     = await getAdminSession();
    const adminCtx = await browser.newContext({ ignoreHTTPSErrors: true });
    await injectCookies(adminCtx, sess);
    const adminPage = await adminCtx.newPage();

    await adminPage.goto(ADMIN_TAB, { waitUntil: 'domcontentloaded' });
    await adminPage.waitForSelector('#cs-csp-enabled', { timeout: 15_000 });

    // ── Phase 1: verify with production presets ──────────────────────────
    console.log('\n[HEALTH] Enabling CSP report-only with production presets…');
    await wpAjax(adminPage, 'csdt_devtools_csp_violations_clear');
    await wpAjax(adminPage, 'csdt_devtools_csp_save', {
        enabled:           '1',
        mode:              'report_only',
        reporting_enabled: '1',
        services:          JSON.stringify(PRODUCTION_SERVICES),
        custom:            '',
    });

    console.log('[HEALTH] Browsing as visitor…');
    const pageErrors1 = await browsePages(browser);
    await adminPage.waitForTimeout(2_000);

    const resp1 = await wpAjax(adminPage, 'csdt_devtools_csp_violations_get');
    const violations1 = resp1?.data || [];
    printViolationReport(violations1, pageErrors1, 'with production presets');

    // ── Phase 2: raw scan with no allowlist (informational only) ─────────
    console.log('[DISCOVERY] Scanning with empty allowlist to surface unknown domains…');
    await wpAjax(adminPage, 'csdt_devtools_csp_violations_clear');
    await wpAjax(adminPage, 'csdt_devtools_csp_save', {
        enabled:           '1',
        mode:              'report_only',
        reporting_enabled: '1',
        services:          JSON.stringify([]),
        custom:            '',
    });

    console.log('[DISCOVERY] Browsing as visitor…');
    const pageErrors2 = await browsePages(browser);
    await adminPage.waitForTimeout(2_000);

    const resp2 = await wpAjax(adminPage, 'csdt_devtools_csp_violations_get');
    const violations2 = resp2?.data || [];
    printViolationReport(violations2, pageErrors2, 'raw scan (empty allowlist)');

    // ── Restore to production settings ───────────────────────────────────
    await wpAjax(adminPage, 'csdt_devtools_csp_violations_clear');
    await wpAjax(adminPage, 'csdt_devtools_csp_save', {
        enabled:           '1',
        mode:              'report_only',
        reporting_enabled: '1',
        services:          JSON.stringify(PRODUCTION_SERVICES),
        custom:            '',
    });
    console.log('[HEALTH] Restored to production settings (report_only, logging on).');

    await adminPage.close();
    await adminCtx.close();

    // ── Assert: production presets must produce zero violations ──────────
    const unexpected = violations1.filter(v =>
        v.blocked !== 'inline' && v.blocked !== 'eval' && v.blocked !== ''
    );
    expect(
        unexpected.length,
        `${unexpected.length} violation(s) not covered by production presets — see console output above`
    ).toBe(0);
});
