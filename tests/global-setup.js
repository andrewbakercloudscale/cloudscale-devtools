/**
 * Playwright global setup — resets WordPress test state before the suite runs.
 * Ensures no leftover Hide Login / 2FA settings from a previous partial run.
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
    wpCli('option update cs_devtools_login_hide_enabled 0');
    wpCli('option delete cs_devtools_login_slug');
    wpCli('option update cs_devtools_2fa_method off');
    // Clear any test-user 2FA state.
    wpCli('user meta delete cs_devtools_test cs_devtools_totp_secret');
    wpCli('user meta delete cs_devtools_test cs_devtools_totp_enabled');
    wpCli('user meta delete cs_devtools_test cs_devtools_2fa_email_enabled');
    wpCli('user meta delete cs_devtools_test cs_devtools_email_verify_pending');
    wpCli('user meta delete cs_devtools_test cs_devtools_passkeys');
    console.log('[setup] Done.\n');
};
