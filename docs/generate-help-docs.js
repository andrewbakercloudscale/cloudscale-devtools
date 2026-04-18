'use strict';
const helpLib = require('/Users/cp363412/Desktop/github/shared-help-docs/help-lib.js');

helpLib.run({
    baseUrl:    process.env.WP_BASE_URL,
    cookies:    process.env.WP_COOKIES,
    restUser:   process.env.WP_REST_USER,
    restPass:   process.env.WP_REST_PASS,
    docsDir:    process.env.WP_DOCS_DIR,

    pluginName: 'CloudScale Cyber and Devtools',
    pluginDesc: 'AI-powered WordPress security auditing, one-click hardening, server log viewer, syntax-highlighted code blocks, SQL tool, login security (2FA, passkeys, hide login), and a site performance monitor. Everything runs on your server — no external APIs required except your own AI key.',
    pageTitle:  'CloudScale Cyber and Devtools',
    pageSlug:   'cloudscale-devtools-help',
    downloadUrl: 'https://andrewninjawordpress.s3.af-south-1.amazonaws.com/cloudscale-devtools.zip',
    repoUrl:     'https://github.com/andrewbakercloudscale/cloudscale-cyber-devtools',
    adminUrl:   `${process.env.WP_BASE_URL}/wp-admin/tools.php?page=cloudscale-devtools`,

    pluginFile: `${__dirname}/../cs-code-block.php`,

    sections: [
        { id: 'security',   label: 'AI Cyber Audit',        file: 'panel-security.png',    tabSelector: 'a[href*="tab=security"]', elementSelector: '#cs-panel-security' },
        { id: 'server-logs',label: 'Server Logs',           file: 'panel-server-logs.png', tabSelector: 'a[href*="tab=security"]', elementSelector: '#cs-panel-server-logs' },
        { id: 'hide-login', label: 'Hide Login URL',        file: 'panel-hide-login.png',  tabSelector: 'a[href*="tab=login"]', elementSelector: '#cs-panel-hide-login' },
        { id: '2fa',        label: 'Two-Factor Auth',       file: 'panel-2fa.png',         tabSelector: 'a[href*="tab=login"]', elementSelector: '#cs-panel-2fa' },
        { id: 'passkeys',   label: 'Passkeys (WebAuthn)',   file: 'panel-passkeys.png',    tabSelector: 'a[href*="tab=login"]', elementSelector: '#cs-panel-passkeys' },
        { id: 'code-block', label: 'Code Block Overview',   file: 'panel-code-block.png',  tabSelector: 'a[href*="tab=migrate"]', elementSelector: '#cs-panel-code-settings' },
        { id: 'migrator',   label: 'Code Block Migrator',   file: 'panel-migrator.png',    tabSelector: 'a[href*="tab=migrate"]', elementSelector: '#cs-panel-migrator' },
        { id: 'sql-tool',   label: 'SQL Query Tool',        file: 'panel-sql-tool.png',    tabSelector: 'a[href*="tab=sql"]', elementSelector: '#cs-panel-sql' },
    ],

    docs: {
        'security': `
<div style="background:#fff5f5;border-left:4px solid #c0392b;padding:18px 22px;border-radius:0 8px 8px 0;margin-bottom:28px;">
<h2 style="margin:0 0 10px;font-size:1.3em;color:#0f172a;background:transparent!important;padding:0!important;border:none!important;">🛡️ AI Cyber Audit</h2>
<p style="margin:0 0 10px;">The centrepiece of CloudScale Cyber and Devtools. Connects to <strong>Anthropic Claude</strong> or <strong>Google Gemini</strong> to analyse your WordPress installation and deliver a scored, prioritised security report in under 60 seconds — the kind of analysis that would normally cost hundreds of dollars from a security consultant.</p>
<p style="margin:0;"><strong>Completely free.</strong> You supply your own API key. A free Gemini tier is available with no credit card required.</p>
</div>
<p><strong>Standard Scan</strong> checks your WordPress core settings, active plugins and themes, user accounts, file permissions, and wp-config.php hardening constants. Results are sent to an AI model which prioritises findings by severity and gives you specific remediation steps.</p>
<p><strong>Deep Dive Scan</strong> extends the standard scan with:</p>
<ul>
<li>Static PHP code analysis of all active plugins — flags <code>eval</code>, shell functions, obfuscation patterns, and suspicious code</li>
<li>Live HTTP probes — open directory listing, weak TLS protocols, CORS headers, server version header leaks</li>
<li>DNS checks — SPF strictness, DMARC policy strength, DKIM selector probes (all gated on MX record presence so non-email domains don't get false positives)</li>
<li>CSP quality analysis — flags <code>unsafe-inline</code>, <code>unsafe-eval</code>, wildcard sources, missing <code>default-src</code></li>
<li>HSTS quality — validates <code>max-age ≥ 31536000</code> and <code>includeSubDomains</code></li>
<li>PHP end-of-life status, inactive plugins on disk, WordPress auto-update settings, and <code>display_errors</code> exposure</li>
<li>AI Code Triage — the top 10 highest-risk static findings are sent to AI with surrounding code context; each is classified as Confirmed / False Positive / Needs Context before the main audit</li>
</ul>
<p><strong>Quick Fixes</strong> are one-click automated remediations shown at the top of the panel. Each fix shows its current status — green tick means done, grey means it still needs attention.</p>
<p><strong>Scan History</strong> saves the last 10 results automatically. Click any entry to reload the full report — useful for tracking your security posture over time.</p>
<p><strong>Scheduled Scans</strong> run automatically on a daily or weekly schedule. Enable email alerts to receive the AI summary in your inbox when a scan completes.</p>
<p><strong>AI Providers:</strong></p>
<ul>
<li><strong>Anthropic Claude</strong> (recommended) — get your key at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com/settings/keys</a>. Models: claude-sonnet-4-6 (fast) · claude-opus-4-7 (most capable)</li>
<li><strong>Google Gemini</strong> (free tier available) — get your key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener">aistudio.google.com/app/apikey</a>. Models: gemini-2.0-flash (free tier) · gemini-2.5-pro (most capable)</li>
</ul>`,

        'server-logs': `
<p>The <strong>Server Logs</strong> viewer lets you read PHP error logs, WordPress debug logs, and web server access/error logs directly in the browser — no SSH access required.</p>
<p><strong>Features:</strong></p>
<ul>
<li><strong>Source picker</strong> — lists all available log sources with availability indicators: readable, not found, permission denied, or empty. Switch between sources with a single click.</li>
<li><strong>Live search</strong> — filter log entries in real time as you type. Matches are highlighted.</li>
<li><strong>Severity filter</strong> — filter by log level from Emergency down to Debug. Useful for cutting through noise on busy sites.</li>
<li><strong>Configurable line count</strong> — choose how many lines to load (50 to 5,000).</li>
<li><strong>Auto-refresh tail mode</strong> — refreshes the log every 30 seconds, showing new entries at the bottom. Useful for watching errors in real time while reproducing a bug.</li>
<li><strong>Custom log paths</strong> — add any additional log file paths (e.g. Nginx error log, custom application log). Custom paths persist across sessions.</li>
<li><strong>One-click PHP error log setup</strong> — if PHP error logging is not configured, a button appears to enable it automatically by writing the required <code>php.ini</code> directives.</li>
</ul>
<p><strong>Access:</strong> Restricted to users with the <code>manage_options</code> capability (Administrators only). Log content is read-only — no write operations are possible from this panel.</p>`,

        'hide-login': `
<p>The <strong>Hide Login URL</strong> feature moves your WordPress login page away from the default <code>/wp-login.php</code> address to a secret URL of your choosing. Bots and automated scanners that probe <code>/wp-login.php</code> receive a 404 response — they never see the login form, which eliminates the vast majority of brute-force and credential-stuffing traffic.</p>
<p><strong>How it works:</strong></p>
<ul>
<li>When enabled, a custom WordPress <code>init</code> hook (priority 1) intercepts requests to your chosen slug and serves <code>wp-login.php</code> transparently, so the login form loads correctly at the new URL without any redirect.</li>
<li>Direct requests to <code>/wp-login.php</code> are blocked by a <code>login_init</code> hook and return a 404.</li>
<li>The <code>wp_login_url()</code>, <code>logout_url()</code>, and <code>lostpassword_url()</code> filters are overridden to always produce your custom URL, so all internal WordPress links (password reset emails, "Back to login" links) continue to work correctly.</li>
</ul>
<p><strong>Setup:</strong></p>
<ol>
<li>Toggle <em>Enable Hide Login</em> on.</li>
<li>Enter a slug in <em>Custom Login Path</em> — letters, numbers, and hyphens only (e.g. <code>my-secret-login</code>). Avoid obvious words like <code>login</code>, <code>admin</code>, or <code>dashboard</code>.</li>
<li>Click <em>Save Hide Login Settings</em>.</li>
<li><strong>Immediately note the new URL</strong> shown after saving. If you lose it, you can recover access via WP-CLI: <code>wp option get csdt_devtools_login_slug</code>.</li>
</ol>
<p><strong>Compatibility:</strong> WP-CLI, XMLRPC, REST API, and WP Cron are unaffected — they bypass the login URL check entirely.</p>`,

        '2fa': `
<p><strong>Two-Factor Authentication (2FA)</strong> requires users to prove their identity with a second factor — a one-time code — in addition to their password. Even if a password is compromised, an attacker cannot log in without also having access to the second factor.</p>
<p><strong>Available methods:</strong></p>
<ul>
<li><strong>Email code</strong> — after a successful password login, a 6-digit code is emailed to the user's account address. The code expires after 10 minutes. No app required.</li>
<li><strong>Authenticator app (TOTP)</strong> — uses the industry-standard Time-based One-Time Password algorithm (RFC 6238). Users scan a QR code with Google Authenticator, Authy, 1Password, or any compatible app. Works completely offline.</li>
<li><strong>Passkey</strong> — replaces the code prompt with a biometric check (Face ID, Touch ID, Windows Hello) or hardware security key. The fastest and most phishing-resistant method.</li>
</ul>
<p><strong>Site-wide settings:</strong></p>
<ul>
<li><em>2FA Method</em> — sets which method is available to users. "Off" disables 2FA entirely.</li>
<li><em>Force 2FA for all administrators</em> — any administrator who has not configured 2FA will be blocked from the dashboard after login until they complete setup.</li>
<li><em>Grace logins</em> — configurable number of logins allowed before 2FA is enforced, giving admins time to set up their second factor.</li>
</ul>
<p><strong>Brute-Force Protection</strong> locks accounts after N failed login attempts (default: 5 attempts, 5-minute lock). Both thresholds are configurable.</p>
<p><strong>Session Duration</strong> overrides the WordPress default session length. When set, persistent cookies are used so sessions survive browser close.</p>
<p><strong>Test Account Manager</strong> creates temporary subscriber accounts with app passwords for Playwright / CI pipelines. Accounts auto-delete on expiry or first use. App passwords are blocked for all non-test accounts.</p>`,

        'passkeys': `
<p><strong>Passkeys</strong> are FIDO2/WebAuthn credentials that replace password-based 2FA codes with a biometric or hardware-key verification. When you log in, instead of typing a 6-digit code, you authenticate with Face ID, Touch ID, Windows Hello, or a physical security key (YubiKey, etc.).</p>
<p><strong>How passkeys work:</strong></p>
<ul>
<li>Registration generates a public/private key pair on your device. The private key never leaves your device — only the public key is stored on the server (in WordPress user meta).</li>
<li>At login, the server sends a random challenge. Your device signs it with the private key. The server verifies the signature against the stored public key. No secret is transmitted over the network.</li>
<li>Passkeys are bound to the site's domain (Relying Party ID), making them inherently phishing-resistant — a fake domain cannot trigger your real passkey.</li>
</ul>
<p><strong>Registering a passkey:</strong></p>
<ol>
<li>In the <em>Passkeys (WebAuthn)</em> panel, click <em>+ Add Passkey</em>.</li>
<li>Give the passkey a recognisable label (e.g. "MacBook Pro", "iPhone 16", "YubiKey 5").</li>
<li>Click <em>Register</em> — your browser will prompt you for biometric verification or to insert a hardware key.</li>
<li>On success, the passkey appears in the list. Register one passkey per device you want to use for login.</li>
</ol>
<p><strong>Using passkeys for login:</strong> In the <em>Two-Factor Authentication</em> settings, set the 2FA method to <em>Passkey</em>. After a successful password login, you will be prompted to verify with your passkey instead of typing a code.</p>
<p><strong>Browser support:</strong> Chrome 108+, Safari 16+, Edge 108+, Firefox 122+. Older browsers fall back to an email OTP code automatically.</p>
<p><strong>Testing:</strong> Use the <em>Test</em> button next to each registered passkey to verify it is working correctly without logging out.</p>`,

        'code-block': `
<div style="background:#f0f9ff;border-left:4px solid #0e6b8f;padding:18px 22px;border-radius:0 8px 8px 0;margin-bottom:28px;">
<h2 style="margin:0 0 10px;font-size:1.3em;color:#0f172a;background:transparent!important;padding:0!important;border:none!important;">Why CloudScale Devtools?</h2>
<p style="margin:0 0 10px;">Popular code highlighting plugins like Enlighter and SyntaxHighlighter load external CDN scripts that add 100–300ms to your page load time. Others charge $30–$50/year for features that should come included.</p>
<p style="margin:0 0 10px;">CloudScale Devtools bundles everything locally — zero external requests, zero impact on your CDN cache hit rate. Auto language detection, clipboard copy button, dark and light theme toggle, and line numbers all work out of the box.</p>
<p style="margin:0;"><strong>Completely free.</strong> No premium version, no nag screens, no feature gating.</p>
</div>
<p>The <strong>Code Block</strong> feature is a registered Gutenberg block (<code>cloudscale/code</code>) and a <code>[cs_code]</code> shortcode for displaying syntax-highlighted code in WordPress posts and pages. Syntax highlighting is powered by <strong>highlight.js 11.11.1</strong> bundled locally — no CDN requests.</p>
<p><strong>Block and shortcode usage:</strong></p>
<ul>
<li><strong>Gutenberg block</strong> — search for "CloudScale" in the block inserter. Language, theme override, title, and line numbers are configurable in the block sidebar.</li>
<li><strong>Shortcode:</strong> <code>[cs_code lang="php" title="functions.php"]your code here[/cs_code]</code></li>
</ul>
<p><strong>Features:</strong></p>
<ul>
<li><strong>190+ languages</strong> with auto-detection — override manually via the block sidebar when detection is wrong.</li>
<li><strong>14 colour themes</strong> — Atom One, GitHub, Monokai, Nord, Dracula, Tokyo Night, VS 2015, VS Code, Stack Overflow, Night Owl, Gruvbox, Solarized, Panda, Shades of Purple. Each theme has dark and light variants; the toggle button switches between them and stores the preference in <code>localStorage</code>.</li>
<li><strong>Copy to clipboard</strong> — uses the Clipboard API with a fallback for older browsers.</li>
<li><strong>Line numbers</strong> — rendered via CSS counter so line numbers are not copied when a reader clicks Copy.</li>
<li><strong>Automatic INI/TOML fragment repair</strong> — Gutenberg splits INI/TOML blocks at bare <code>[section]</code> headers. CloudScale silently merges them back and shows a brief toast notification.</li>
</ul>`,

        'migrator': `
<p>The <strong>Code Block Migrator</strong> converts legacy code block shortcodes and HTML from other WordPress syntax highlighting plugins to CloudScale Devtools blocks in a single batch operation.</p>
<p><strong>Supported source formats:</strong></p>
<ul>
<li>WordPress core <code>&lt;!-- wp:code --&gt;</code> blocks</li>
<li>WordPress core <code>&lt;!-- wp:preformatted --&gt;</code> blocks</li>
<li><code>&lt;!-- wp:code-syntax-block/code --&gt;</code> blocks from Code Syntax Block plugin</li>
<li>Legacy <code>[code]</code>, <code>[sourcecode]</code>, and similar shortcodes</li>
</ul>
<p><strong>Migration workflow:</strong></p>
<ol>
<li><strong>Scan</strong> — queries <code>wp_posts</code> for all posts and pages containing supported block patterns. Results show post title, status, date, and block count.</li>
<li><strong>Preview</strong> — shows a before/after diff of the exact content changes for each post. No database writes at this stage.</li>
<li><strong>Migrate single</strong> — converts one post at a time.</li>
<li><strong>Migrate all</strong> — processes every remaining post in a single AJAX request.</li>
</ol>
<p><strong>Always take a backup before running the migrator.</strong> The conversion modifies <code>post_content</code> directly in the database. There is no undo button.</p>`,

        'sql-tool': `
<p>The <strong>SQL Query Tool</strong> lets WordPress administrators run read-only SELECT queries against the live database from within wp-admin — without needing phpMyAdmin, Adminer, or SSH access.</p>
<p><strong>Security model:</strong></p>
<ul>
<li>Access restricted to users with the <code>manage_options</code> capability (Administrators only).</li>
<li>Every query is validated by <code>is_safe_query()</code>: strips all comments, rejects semicolons (prevents statement stacking), blocks <code>INTO OUTFILE</code> / <code>LOAD_FILE</code>, and only allows <code>SELECT</code>, <code>SHOW</code>, <code>DESCRIBE</code>, <code>DESC</code>, <code>EXPLAIN</code>.</li>
</ul>
<p><strong>14 built-in quick queries</strong> organised into four groups:</p>
<ul>
<li><em>Health &amp; Diagnostics</em>: database health check, site identity options, table sizes and row counts.</li>
<li><em>Content Summary</em>: posts by type and status, site stats, latest 20 published posts.</li>
<li><em>Bloat &amp; Cleanup</em>: orphaned postmeta, expired transients, revisions/drafts/trash, largest autoloaded options.</li>
<li><em>URL &amp; Migration Helpers</em>: HTTP references, posts with HTTP GUIDs, old IP references, posts missing meta descriptions.</li>
</ul>
<p><strong>Keyboard shortcuts:</strong> <kbd>Enter</kbd> or <kbd>Ctrl+Enter</kbd> runs the query. <kbd>Shift+Enter</kbd> inserts a newline.</p>`,
    },
}).catch(err => { console.error('ERROR:', err.message); process.exit(1); });
