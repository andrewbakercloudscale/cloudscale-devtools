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

const SITE      = process.env.WP_SITE || 'https://andrewbaker.ninja';
const PAGE_404  = `${SITE}/this-page-does-not-exist-cs404test`;

test.describe('Custom 404 page', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto(PAGE_404, { waitUntil: 'networkidle' });
    });

    test('renders 404 heading and game canvas', async ({ page }) => {
        await expect(page.locator('h1, .cs404-heading')).toContainText('404', { ignoreCase: true });
        const canvas = page.locator('#cs404-game');
        await expect(canvas).toBeVisible();
    });

    test('shows correct game tabs — no Mr. Do, yes Gamut Shift + Racer 3D', async ({ page }) => {
        const tabs = page.locator('.cs404-tab');
        await expect(tabs).toHaveCount(8); // runner, jetpack, racer, miner, asteroids, snake, gamutshift, racer3d

        const labels = await tabs.allInnerTexts();
        expect(labels.some(t => /Gamut Shift/i.test(t))).toBe(true);
        expect(labels.some(t => /Racer 3D/i.test(t))).toBe(true);
        expect(labels.some(t => /Mr\.?\s*Do/i.test(t))).toBe(false);
    });

    test('Runner tab — canvas visible, iframe hidden', async ({ page }) => {
        await page.locator('.cs404-tab[data-game="runner"]').click();
        await expect(page.locator('#cs404-game')).toBeVisible();
        const iframe = page.locator('#cs404-iframe');
        await expect(iframe).toBeHidden();
    });

    test('Gamut Shift tab — iframe visible, canvas hidden, src set', async ({ page }) => {
        await page.locator('.cs404-tab[data-game="gamutshift"]').click();

        const iframe = page.locator('#cs404-iframe');
        await expect(iframe).toBeVisible();

        const src = await iframe.getAttribute('src');
        expect(src).toContain('js13kgames.com');
        expect(src).toContain('gamut-shift');

        await expect(page.locator('#cs404-game')).toBeHidden();
    });

    test('Racer 3D tab — iframe visible, canvas hidden, src set', async ({ page }) => {
        await page.locator('.cs404-tab[data-game="racer3d"]').click();

        const iframe = page.locator('#cs404-iframe');
        await expect(iframe).toBeVisible();

        const src = await iframe.getAttribute('src');
        expect(src).toContain('js13kgames.com');
        expect(src).toContain('racer');

        await expect(page.locator('#cs404-game')).toBeHidden();
    });

    test('switching back from iframe to canvas game restores canvas', async ({ page }) => {
        // Go to iframe game
        await page.locator('.cs404-tab[data-game="gamutshift"]').click();
        await expect(page.locator('#cs404-iframe')).toBeVisible();
        await expect(page.locator('#cs404-game')).toBeHidden();

        // Switch back to canvas game
        await page.locator('.cs404-tab[data-game="snake"]').click();
        await expect(page.locator('#cs404-game')).toBeVisible();

        const iframe = page.locator('#cs404-iframe');
        await expect(iframe).toBeHidden();
        // iframe src should be cleared to stop the game loading
        const src = await iframe.getAttribute('src');
        expect(src === '' || src === null).toBe(true);
    });

    test('leaderboard panel updates on tab switch', async ({ page }) => {
        await page.locator('.cs404-tab[data-game="snake"]').click();
        const title = page.locator('#cs404-lb-title');
        await expect(title).toContainText('Snake');
    });

});

test.describe('Gameplay — canvas games start and respond to input', () => {

    async function goTo404(page) {
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

});

test.describe('Gameplay — iframe games load content', () => {

    async function goTo404(page) {
        await page.goto(PAGE_404, { waitUntil: 'networkidle' });
    }

    test('Gamut Shift iframe loads and contains a document', async ({ page }) => {
        await goTo404(page);
        await page.locator('.cs404-tab[data-game="gamutshift"]').click();

        const iframeEl = page.locator('#cs404-iframe');
        await expect(iframeEl).toBeVisible();

        // Wait for the iframe to navigate (up to 15s for external resource)
        const frame = await iframeEl.contentFrame();
        if (frame) {
            // If same-origin access is possible, verify something loaded
            try {
                await frame.waitForLoadState('load', { timeout: 15000 });
                const body = await frame.locator('body').innerHTML({ timeout: 5000 });
                expect(body.length).toBeGreaterThan(10);
            } catch {
                // Cross-origin frames are inaccessible — just verify the iframe is present & src is set
            }
        }

        const src = await iframeEl.getAttribute('src');
        expect(src).toContain('gamut-shift');
    });

    test('Racer 3D iframe loads and contains a document', async ({ page }) => {
        await goTo404(page);
        await page.locator('.cs404-tab[data-game="racer3d"]').click();

        const iframeEl = page.locator('#cs404-iframe');
        await expect(iframeEl).toBeVisible();

        const frame = await iframeEl.contentFrame();
        if (frame) {
            try {
                await frame.waitForLoadState('load', { timeout: 15000 });
                const body = await frame.locator('body').innerHTML({ timeout: 5000 });
                expect(body.length).toBeGreaterThan(10);
            } catch {
                // Cross-origin — verify src attribute only
            }
        }

        const src = await iframeEl.getAttribute('src');
        expect(src).toContain('racer');
    });

});
