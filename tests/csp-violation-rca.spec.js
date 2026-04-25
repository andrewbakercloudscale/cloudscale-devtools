/**
 * CSP Violation RCA — enables violation reporting, browses key pages as a
 * visitor, then reads the violation log to surface root causes.
 *
 * Run:  npx playwright test tests/csp-violation-rca.spec.js --headed --project=chromium
 */
// @ts-check
const { test, expect, request: playwrightRequest } = require('@playwright/test');
const path = require('path');

[ path.join(__dirname, '..', '.env.test'),
  path.join(__dirname, '..', '..', '.env.test'),
].forEach(p => { try { require('dotenv').config({ path: p }); } catch {} });

const SITE        = process.env.WP_SITE             || 'https://your-wordpress-site.example.com';
const SECRET      = process.env.CSDT_TEST_SECRET    || '';
const ROLE        = process.env.CSDT_TEST_ROLE       || '';
const SESSION_URL = process.env.CSDT_TEST_SESSION_URL || '';
const LOGOUT_URL  = process.env.CSDT_TEST_LOGOUT_URL  || '';
const ADMIN_TAB   = `${SITE}/wp-admin/tools.php?page=cloudscale-devtools&tab=security`;
const NONCE_URL   = `${SITE}/wp-admin/tools.php?page=cloudscale-devtools`;

const PAGES_TO_BROWSE = [
    '/',
    '/blog/',
    '/posts/',
];

test.setTimeout(120_000);

async function getAdminSession(ttl = 1200) {
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
        // csdtVulnScan is inlined on the page
        return typeof csdtVulnScan !== 'undefined' ? csdtVulnScan.nonce : null;
    });

    const body = new URLSearchParams({ action, nonce: nonce || '', ...extra });
    return page.evaluate(async ({ url, b }) => {
        const r = await fetch(url, { method: 'POST', body: new URLSearchParams(b) });
        return r.json();
    }, { url: `${SITE}/wp-admin/admin-ajax.php`, b: Object.fromEntries(body) });
}

test.afterAll(async () => {
    if (!LOGOUT_URL) return;
    try {
        const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
        await ctx.post(LOGOUT_URL, { data: { secret: SECRET, role: ROLE } });
        await ctx.dispose();
    } catch {}
});

test('CSP violation RCA', async ({ browser }) => {
    // ── 1. Admin context: enable CSP report-only + logging, clear old log ──
    console.log('\n[RCA] Step 1: enabling CSP report-only + violation logging…');
    const sess    = await getAdminSession();
    const adminCtx = await browser.newContext({ ignoreHTTPSErrors: true });
    await injectCookies(adminCtx, sess);
    const adminPage = await adminCtx.newPage();

    await adminPage.goto(ADMIN_TAB, { waitUntil: 'domcontentloaded' });
    await adminPage.waitForSelector('#cs-csp-enabled', { timeout: 15_000 });

    // Clear the existing violation log before the browse.
    const clearResp = await wpAjax(adminPage, 'csdt_devtools_csp_violations_clear');
    console.log('[RCA] Violation log cleared:', clearResp?.success ? 'OK' : JSON.stringify(clearResp));

    // Enable CSP + report-only + logging via AJAX so we don't fight the UI state.
    const saveResp = await wpAjax(adminPage, 'csdt_devtools_csp_save', {
        enabled:           '1',
        mode:              'report_only',
        reporting_enabled: '1',
        services:          JSON.stringify([]),   // no allowlist — capture everything
        custom:            '',
    });
    console.log('[RCA] CSP settings saved:', saveResp?.success ? 'OK' : JSON.stringify(saveResp));

    // ── 2. Visitor context: browse key pages so the browser sends violation reports ──
    console.log('\n[RCA] Step 2: browsing site as visitor…');
    const visitorCtx  = await browser.newContext({ ignoreHTTPSErrors: true });
    const visitorPage = await visitorCtx.newPage();

    // Collect browser-side pageerrors too (cross-origin errors show up here).
    const pageErrors = [];
    visitorPage.on('pageerror', e => pageErrors.push(e.message));

    for (const slug of PAGES_TO_BROWSE) {
        console.log(`  → ${SITE}${slug}`);
        try {
            await visitorPage.goto(`${SITE}${slug}`, { waitUntil: 'networkidle', timeout: 30_000 });
            // Linger 3 s so the browser finishes sending CSP reports.
            await visitorPage.waitForTimeout(3_000);
        } catch (e) {
            console.warn(`  ! ${slug}: ${e.message}`);
        }
    }

    // Browse a single post if one exists.
    try {
        await visitorPage.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 20_000 });
        const postLink = await visitorPage.$('a[href*="/20"]'); // year-based permalink
        if (postLink) {
            const href = await postLink.getAttribute('href');
            console.log(`  → ${href} (single post)`);
            await visitorPage.goto(href, { waitUntil: 'networkidle', timeout: 30_000 });
            await visitorPage.waitForTimeout(3_000);
        }
    } catch {}

    await visitorCtx.close();

    // Give the server a moment to flush any in-flight violation POST bodies.
    await adminPage.waitForTimeout(2_000);

    // ── 3. Admin context: read the violation log ─────────────────────────
    console.log('\n[RCA] Step 3: reading violation log…');
    const violResp = await wpAjax(adminPage, 'csdt_devtools_csp_violations_get');
    const violations = violResp?.data || [];

    // ── 4. Restore CSP to its previous state (enforce, reporting off) ────
    await wpAjax(adminPage, 'csdt_devtools_csp_save', {
        enabled:           '1',
        mode:              'enforce',
        reporting_enabled: '0',
        services:          JSON.stringify(['google_adsense']),
        custom:            '',
    });
    console.log('[RCA] CSP restored to enforce mode, reporting off.');

    await adminPage.close();
    await adminCtx.close();

    // ── 5. Report ─────────────────────────────────────────────────────────
    console.log('\n════════════════════════════════════════════════════════');
    console.log('  CSP VIOLATION REPORT');
    console.log('════════════════════════════════════════════════════════');

    if (!violations.length) {
        console.log('  No violations recorded — allowlist may already cover everything.');
    } else {
        // Group by blocked URI to find the most frequent offenders.
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
        console.log('  Browser JS errors captured:');
        [...new Set(pageErrors)].forEach(e => console.log(`    • ${e}`));
    }

    console.log('════════════════════════════════════════════════════════\n');

    // Fail the test only if there are unexpected violations (not 'inline'/'eval'
    // which are expected with Google AdSense and analytics scripts).
    const unexpected = violations.filter(v =>
        v.blocked !== 'inline' && v.blocked !== 'eval' && v.blocked !== ''
    );
    expect(unexpected.length, `${unexpected.length} unexpected violations — see console output above`).toBe(0);
});
