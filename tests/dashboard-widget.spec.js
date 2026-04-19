/**
 * Dashboard Widget — Playwright test
 * Verifies the security summary widget shows a single "View Cyber and Devtools"
 * button with gradient styling, and no "Run Security Scan" or "Open Plugin" buttons.
 *
 * Run:  npx playwright test tests/dashboard-widget.spec.js --headed
 */

const { test, expect } = require('@playwright/test');
const { execSync: exec } = require('child_process');
const path = require('path');
const fs   = require('fs');

const SITE       = process.env.WP_SITE        || 'https://andrewbaker.ninja';
const LOGIN_SLUG = process.env.WP_LOGIN_SLUG  || 'wp-login.php';
const AUTH_FILE  = path.join(__dirname, '.auth', 'dw-test-admin.json');

// Placeholder so test.use({ storageState }) doesn't fail before beforeAll runs
fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
if (!fs.existsSync(AUTH_FILE)) {
    fs.writeFileSync(AUTH_FILE, JSON.stringify({ cookies: [], origins: [] }));
}

const WP_CLI = 'docker exec pi_wordpress php /var/www/html/wp-cli.phar';
const SSH    = 'ssh pi@andrew-pi-5.local';

function wpCli(cmd) {
    try {
        return exec(`${SSH} "${WP_CLI} ${cmd} --allow-root 2>/dev/null"`, { stdio: 'pipe' }).toString().trim();
    } catch {
        return '';
    }
}

test.describe.configure({ mode: 'serial' });

test.describe('Dashboard security widget', () => {

    test.beforeAll(async ({ browser }) => {
        wpCli('user delete dw_test_admin --yes');
        wpCli('user create dw_test_admin dw_test@example.com --role=administrator --user_pass=DWTest2026!');

        // Login once and save auth state so WP 2FA only triggers once
        fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
        const ctx  = await browser.newContext();
        const page = await ctx.newPage();
        await page.goto(`${SITE}/${LOGIN_SLUG}`);
        await page.fill('#user_login', 'dw_test_admin');
        await page.fill('#user_pass',  'DWTest2026!');
        await page.click('#wp-submit');
        await page.waitForURL('**/wp-admin/**', { timeout: 15000 });
        await ctx.storageState({ path: AUTH_FILE });
        await ctx.close();
    });

    test.afterAll(() => {
        wpCli('user delete dw_test_admin --yes');
        try { fs.unlinkSync(AUTH_FILE); } catch {}
    });

    // Reuse saved auth cookies — avoids triggering 2FA on every test
    test.use({ storageState: AUTH_FILE });

    test('widget has exactly one button — View Cyber and Devtools', async ({ page }) => {
        await page.goto(`${SITE}/wp-admin/`);
        await page.waitForLoadState('networkidle');

        const widget = page.locator('#csdt_security_summary');
        await expect(widget).toBeVisible();

        await widget.screenshot({ path: 'tests/screenshots/dashboard-widget.png' });

        // Debug: dump widget HTML
        const widgetHTML = await widget.innerHTML();
        const actionsMatch = widgetHTML.match(/.{200}cs-dw-actions.{500}/s);
        console.log('ACTIONS CONTEXT:', actionsMatch ? actionsMatch[0] : 'NOT FOUND');
        const allAnchors = await widget.locator('a').all();
        for (let i = 0; i < allAnchors.length; i++) {
            const html = await allAnchors[i].evaluate(el => el.outerHTML);
            console.log(`ANCHOR[${i}]:`, html.substring(0, 300));
        }

        // ── Assertions ──────────────────────────────────────────────
        const actions = widget.locator('.cs-dw-actions');
        await expect(actions).toBeVisible();

        // Only one anchor inside actions
        const buttons = actions.locator('a');
        await expect(buttons).toHaveCount(1);

        // Correct label
        await expect(buttons.first()).toHaveText('View Cyber and Devtools');

        // Gradient background
        const bg = await buttons.first().evaluate(el => getComputedStyle(el).background || el.style.background);
        console.log('Button background:', bg);
        expect(bg).toContain('linear-gradient');

        // Must NOT contain old buttons
        await expect(widget.locator('text=Run Security Scan')).toHaveCount(0);
        await expect(widget.locator('text=Open Plugin')).toHaveCount(0);
    });

    test('button navigates to plugin page', async ({ page }) => {
        await page.goto(`${SITE}/wp-admin/`);
        await page.waitForLoadState('networkidle');

        const btn = page.locator('#csdt_security_summary .cs-dw-actions a').first();
        await btn.click();
        await page.waitForURL('**/tools.php?page=cloudscale-devtools**', { timeout: 10000 });
    });
});
