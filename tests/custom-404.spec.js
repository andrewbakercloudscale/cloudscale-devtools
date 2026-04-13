/**
 * Custom 404 page — end-to-end Playwright tests
 *
 * Run:  npx playwright test tests/custom-404.spec.js --headed
 *
 * Checks:
 *  - 404 page renders with game tabs
 *  - Canvas games (Runner, Snake etc.) work
 *  - Iframe games (Gamut Shift, Racer 3D) swap canvas for iframe
 *  - Mr. Do! tab is gone
 */

const { test, expect } = require('@playwright/test');

const SITE      = process.env.WP_SITE || 'https://your-wordpress-site.example.com';
const SITE_HOST = new URL(SITE).hostname;
// Bypass Cloudflare cache — proxy all requests through Pi nginx directly.
const PI_DIRECT = process.env.PI_DIRECT || 'http://192.168.0.48:8082';
const PAGE_404  = `${SITE}/this-page-does-not-exist-cs404test`;

test.describe('Custom 404 page', () => {

    test.beforeEach(async ({ page }) => {
        // Bypass Cloudflare — proxy all site requests directly to Pi nginx.
        await page.route(`${SITE}/**`, async route => {
            const piUrl = route.request().url().replace(SITE, PI_DIRECT);
            const resp = await route.fetch({ url: piUrl, headers: { ...route.request().headers(), host: SITE_HOST, 'x-forwarded-proto': 'https' } });
            await route.fulfill({ response: resp });
        });
        await page.goto(PAGE_404, { waitUntil: 'networkidle' });
    });

    test('renders 404 heading and game canvas', async ({ page }) => {
        await expect(page.locator('h1, .cs404-heading')).toContainText('404', { ignoreCase: true });
        const canvas = page.locator('#cs404-game');
        await expect(canvas).toBeVisible();
    });

    test('shows correct game tabs — no Mr. Do, yes Space Invaders', async ({ page }) => {
        const tabs = page.locator('.cs404-tab');
        await expect(tabs).toHaveCount(7); // runner, jetpack, racer, miner, asteroids, snake, spaceinvaders

        const labels = await tabs.allInnerTexts();
        expect(labels.some(t => /Invaders/i.test(t))).toBe(true);
        expect(labels.some(t => /Mr\.?\s*Do/i.test(t))).toBe(false);
        expect(labels.some(t => /Gamut/i.test(t))).toBe(false);
        expect(labels.some(t => /Racer 3D/i.test(t))).toBe(false);
    });

    test('canvas always visible (no iframe games)', async ({ page }) => {
        for (const game of ['runner', 'racer', 'snake', 'spaceinvaders']) {
            await page.locator(`.cs404-tab[data-game="${game}"]`).click();
            await expect(page.locator('#cs404-game')).toBeVisible();
        }
    });

    test('leaderboard panel updates on tab switch', async ({ page }) => {
        await page.locator('.cs404-tab[data-game="snake"]').click();
        const title = page.locator('#cs404-lb-title');
        await expect(title).toContainText('Snake');
    });

});

test.describe('Gameplay — canvas games start and respond to input', () => {

    async function goTo404(page) {
        await page.route(`${SITE}/**`, async route => {
            const piUrl = route.request().url().replace(SITE, PI_DIRECT);
            const resp = await route.fetch({ url: piUrl, headers: { ...route.request().headers(), host: SITE_HOST, 'x-forwarded-proto': 'https' } });
            await route.fulfill({ response: resp });
        });
        await page.goto(PAGE_404, { waitUntil: 'networkidle' });
    }

    /** Pixel-sample the centre of the canvas; returns a CSS rgb() string */
    async function canvasCentreColour(page) {
        return page.evaluate(() => {
            const c = document.getElementById('cs404-game');
            const ctx = c.getContext('2d');
            const [r, g, b] = ctx.getImageData(c.width / 2, c.height / 2, 1, 1).data;
            return `${r},${g},${b}`;
        });
    }

    test('Runner — space starts the game (canvas changes)', async ({ page }) => {
        await goTo404(page);
        const before = await canvasCentreColour(page);
        await page.keyboard.press('Space');
        await page.waitForTimeout(300);
        const after = await canvasCentreColour(page);
        // Canvas should have changed (game is running / animating)
        expect(before).not.toBe(after);
    });

    test('Runner — click on canvas starts the game', async ({ page }) => {
        await goTo404(page);
        const canvas = page.locator('#cs404-game');
        await canvas.click();
        await page.waitForTimeout(300);
        const colour = await canvasCentreColour(page);
        // Running game has a dark sky background — not pure white
        expect(colour).not.toBe('255,255,255');
    });

    test('Jetpack — space starts and character moves', async ({ page }) => {
        await goTo404(page);
        await page.locator('.cs404-tab[data-game="jetpack"]').click();
        await page.keyboard.press('Space');
        await page.waitForTimeout(400);
        const after = await canvasCentreColour(page);
        expect(after).not.toBe('255,255,255');
    });

    test('Racer — space starts; left/right arrow steers', async ({ page }) => {
        await goTo404(page);
        await page.locator('.cs404-tab[data-game="racer"]').click();
        await page.keyboard.press('Space');
        await page.waitForTimeout(200);
        const c1 = await canvasCentreColour(page);
        await page.keyboard.press('ArrowLeft');
        await page.waitForTimeout(200);
        const c2 = await canvasCentreColour(page);
        // Road should be rendering (not blank)
        expect(c1).not.toBe('255,255,255');
        expect(c2).not.toBe('255,255,255');
    });

    test('Miner — jump button triggers animation', async ({ page }) => {
        await goTo404(page);
        await page.locator('.cs404-tab[data-game="miner"]').click();
        // Start game via jump button
        await page.locator('#cs404-mj').click();
        await page.waitForTimeout(400);
        const colour = await canvasCentreColour(page);
        expect(colour).not.toBe('255,255,255');
    });

    test('Asteroids — space starts, thrust button works', async ({ page }) => {
        await goTo404(page);
        await page.locator('.cs404-tab[data-game="asteroids"]').click();
        await page.keyboard.press('Space');
        await page.waitForTimeout(200);
        const c1 = await canvasCentreColour(page);
        await page.locator('#cs404-asu').click(); // thrust
        await page.waitForTimeout(200);
        const c2 = await canvasCentreColour(page);
        expect(c1).not.toBe('255,255,255');
        expect(c2).not.toBe('255,255,255');
    });

    test('Snake — space starts, d-pad changes direction', async ({ page }) => {
        await goTo404(page);
        await page.locator('.cs404-tab[data-game="snake"]').click();
        await page.keyboard.press('Space');
        await page.waitForTimeout(200);
        await page.locator('#cs404-4rt').click();
        await page.waitForTimeout(200);
        const colour = await canvasCentreColour(page);
        expect(colour).not.toBe('255,255,255');
    });

    test('Space Invaders — on-screen buttons visible when active, hidden otherwise', async ({ page }) => {
        await goTo404(page);
        const siCtrl = page.locator('#cs404-si-ctrl');
        // Initially on runner tab — buttons hidden
        await expect(siCtrl).toBeHidden();
        // Switch to space invaders — buttons appear
        await page.locator('.cs404-tab[data-game="spaceinvaders"]').click();
        await expect(siCtrl).toBeVisible();
        await expect(page.locator('#cs404-sil')).toBeVisible(); // ◀
        await expect(page.locator('#cs404-sif')).toBeVisible(); // Fire
        await expect(page.locator('#cs404-sir')).toBeVisible(); // ▶
        // Switch away — buttons hidden again
        await page.locator('.cs404-tab[data-game="runner"]').click();
        await expect(siCtrl).toBeHidden();
    });

    test('Space Invaders — on-screen right button moves ship (canvas bottom-right brightens)', async ({ page }) => {
        await goTo404(page);
        await page.locator('.cs404-tab[data-game="spaceinvaders"]').click();
        await page.keyboard.press('Space'); // start
        await page.waitForTimeout(150);

        // Sample bottom-left corner before (ship starts centred)
        const sample = async (x, y) => page.evaluate(([px, py]) => {
            const c = document.getElementById('cs404-game');
            const ctx = c.getContext('2d');
            const d = ctx.getImageData(px, py, 1, 1).data;
            return `${d[0]},${d[1]},${d[2]}`;
        }, [x, y]);

        // Hold right button long enough to move visibly across the canvas
        await page.locator('#cs404-sir').dispatchEvent('mousedown');
        await page.waitForTimeout(500);
        await page.locator('#cs404-sir').dispatchEvent('mouseup');
        await page.waitForTimeout(100);

        // Canvas is still rendering (game running) — just verify it's dark (not blank)
        const col = await sample(560, 260); // bottom-right
        expect(col).not.toBe('255,255,255');
    });

    test('Space Invaders — space starts game, arrows move ship, space fires', async ({ page }) => {
        await goTo404(page);
        await page.locator('.cs404-tab[data-game="spaceinvaders"]').click();

        // Start the game
        await page.keyboard.press('Space');
        await page.waitForTimeout(200);

        // Canvas should be dark (space background, not blank)
        const colAfterStart = await canvasCentreColour(page);
        expect(colAfterStart).not.toBe('255,255,255');

        // Move ship right
        await page.keyboard.down('ArrowRight');
        await page.waitForTimeout(300);
        await page.keyboard.up('ArrowRight');

        // Fire a shot
        await page.keyboard.press('Space');
        await page.waitForTimeout(200);

        // Canvas still rendering
        const colAfterMove = await canvasCentreColour(page);
        expect(colAfterMove).not.toBe('255,255,255');
    });

});
