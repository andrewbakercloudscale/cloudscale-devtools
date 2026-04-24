/**
 * Login page — verify custom slug shows the form cleanly on GET with no errors.
 *
 * Checks:
 *   1. GET to the custom login slug renders the login form (no redirect to home).
 *   2. No "username/password is empty" errors appear before the form is submitted.
 *   3. Logging in with valid credentials succeeds (redirects to wp-admin).
 *
 * Run: WP_ADMIN_PASS=xxx npx playwright test tests/login-page.spec.js --headed
 */

const { test, expect } = require('@playwright/test');

const SITE        = process.env.WP_SITE        || 'https://andrewbaker.ninja';
const ADMIN_USER  = process.env.WP_ADMIN_USER  || 'andrew';
const ADMIN_PASS  = process.env.WP_ADMIN_PASS  || '';
const LOGIN_SLUG  = process.env.WP_LOGIN_SLUG  || 'cleanshirt';

const CUSTOM_LOGIN_URL = `${SITE}/${LOGIN_SLUG}`;

test( 'Login page: GET renders form with no immediate errors', async ( { page } ) => {
    // Fresh context — no cookies, no cache.
    await page.goto( CUSTOM_LOGIN_URL, { waitUntil: 'domcontentloaded' } );

    console.log( 'Landed on:', page.url() );

    // Take a screenshot so we can see what loaded.
    await page.screenshot( { path: 'test-results/login-get.png', fullPage: true } );

    // Must not have been redirected to home (which happens when hide-login blocks direct access).
    expect( page.url() ).toContain( LOGIN_SLUG );

    // Dump any error text visible on the page.
    const errorText = await page.locator( '#login_error, .login-error, div.error' ).allTextContents();
    console.log( 'Errors on fresh GET:', errorText );

    // The login form must be present.
    await expect( page.locator( '#loginform' ) ).toBeVisible( { timeout: 5000 } );

    // CRITICAL: no error messages should be visible before the user types anything.
    const errorVisible = await page.locator( '#login_error' ).isVisible();
    expect( errorVisible, 'Error box visible on fresh GET — form is auto-submitting or being processed server-side' ).toBe( false );
} );

test( 'Login page: submitting valid credentials redirects to wp-admin', async ( { page } ) => {
    if ( ! ADMIN_PASS ) {
        test.skip( 'WP_ADMIN_PASS not set' );
    }

    await page.goto( CUSTOM_LOGIN_URL, { waitUntil: 'domcontentloaded' } );

    // Capture the form action so we know where the POST goes.
    const formAction = await page.locator( '#loginform' ).getAttribute( 'action' );
    console.log( 'Form action:', formAction );

    await page.fill( '#user_login', ADMIN_USER );
    await page.fill( '#user_pass', ADMIN_PASS );

    await Promise.all( [
        page.waitForNavigation( { waitUntil: 'domcontentloaded', timeout: 30000 } ),
        page.click( '#wp-submit' ),
    ] );

    console.log( 'After submit, landed on:', page.url() );
    await page.screenshot( { path: 'test-results/login-post.png', fullPage: true } );

    // Should be in wp-admin or 2FA step — not back on the login page with errors.
    const isLoginPage = page.url().includes( 'wp-login.php' ) || page.url().includes( LOGIN_SLUG );
    if ( isLoginPage ) {
        const errorText = await page.locator( '#login_error' ).textContent().catch( () => 'no error element' );
        console.log( 'Still on login page. Error:', errorText );
    }
    expect( page.url() ).toContain( 'wp-admin' );
} );
