/**
 * Playwright global setup — resets WordPress test state before the suite runs.
 * Ensures no leftover Hide Login settings from a previous partial run.
 *
 * IMPORTANT: This setup does NOT disable 2FA. 2FA state must NEVER be touched
 * by automated tooling. Tests that need to verify 2FA features must be run
 * interactively by a human who can enter the 2FA code.
 * See: setup-playwright-test-account.sh for the correct automated test pattern.
 */
const { execSync } = require('child_process');

const WP_CLI = 'docker exec pi_wordpress php /var/www/html/wp-cli.phar';
const SSH     = 'ssh pi@andrew-pi-5.local';

function wpCli(cmd) {
    try {
        execSync(`${SSH} "${WP_CLI} ${cmd} --allow-root 2>/dev/null"`, { stdio: 'pipe' });
    } catch {
        // Best-effort — option may not exist yet.
    }
}

module.exports = async function globalSetup() {
    console.log('\n[setup] Resetting WordPress login-security test state...');
    // DO NOT touch csdt_devtools_login_hide_enabled or csdt_devtools_login_slug —
    // those are live production settings. Changing them here breaks the site.
    // Tests use WP_LOGIN_SLUG env var to locate the login page.

    // Clear any test-user login-security state (not 2FA)
    wpCli('user meta delete cs_devtools_test csdt_devtools_totp_secret');
    wpCli('user meta delete cs_devtools_test csdt_devtools_totp_enabled');
    wpCli('user meta delete cs_devtools_test csdt_devtools_2fa_email_enabled');
    wpCli('user meta delete cs_devtools_test csdt_devtools_email_verify_pending');
    wpCli('user meta delete cs_devtools_test csdt_devtools_passkeys');
    console.log('[setup] Done.\n');
};
