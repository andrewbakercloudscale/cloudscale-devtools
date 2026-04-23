<?php
/**
 * One-off script: update CloudScale Devtools help page (ID 5708).
 * Run via: docker exec -u www-data pi_wordpress php /tmp/update-help-page.php
 */
$_SERVER['HTTP_HOST']   = 'andrewbaker.ninja';
$_SERVER['REQUEST_URI'] = '/';
require( '/var/www/html/wp-load.php' );

$content = <<<'HTML'
<style>
.cs-help-docs{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#1a202c;line-height:1.7;max-width:900px;}
.cs-help-docs a{color:#2563eb;}
.cs-help-docs code{background:#f1f5f9;border:1px solid #e2e8f0;border-radius:4px;padding:1px 6px;font-size:.88em;}
.cs-hero{background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#0e6b8f 100%);color:#fff;border-radius:12px;padding:48px 40px;margin-bottom:40px;position:relative;overflow:hidden;}
.cs-hero h1{font-size:2.2em;font-weight:800;margin:0 0 12px;letter-spacing:-.02em;color:#fff;}
.cs-hero p{font-size:1.1em;margin:0;opacity:.85;max-width:680px;}
.cs-hero .cs-badge{display:inline-block;background:rgba(255,255,255,.15);border-radius:20px;padding:4px 14px;font-size:.8em;font-weight:600;margin-bottom:16px;letter-spacing:.05em;text-transform:uppercase;transition:transform .15s ease,box-shadow .15s ease,background .15s ease;}
.cs-hero a.cs-badge:hover{transform:translateY(-4px) scale(1.06);box-shadow:0 12px 28px rgba(0,0,0,.45);background:rgba(255,255,255,.3);color:#fff!important;text-decoration:none!important;}
.cs-download-btn{display:inline-block;background:#16a34a;color:#fff!important;padding:12px 26px;border-radius:8px;text-decoration:none!important;font-size:1em;font-weight:700;letter-spacing:.01em;transition:transform .15s ease,box-shadow .15s ease;}
.cs-download-btn:hover{transform:translateY(-6px) scale(1.04);box-shadow:0 20px 48px rgba(0,0,0,.55);color:#fff!important;text-decoration:none!important;}
.cs-github-btn{display:inline-block;background:#24292f;color:#fff!important;padding:12px 26px;border-radius:8px;text-decoration:none!important;font-size:1em;font-weight:700;letter-spacing:.01em;transition:transform .15s ease,box-shadow .15s ease;}
.cs-github-btn:hover{transform:translateY(-6px) scale(1.04);box-shadow:0 20px 48px rgba(0,0,0,.55);color:#fff!important;text-decoration:none!important;}
.cs-toc{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:28px 36px;margin:32px 0;}
.cs-toc-title{font-size:1em;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin:0 0 16px;}
.cs-toc ol{display:grid;grid-template-columns:1fr 1fr;gap:6px 32px;margin:0;padding-left:24px;}
.cs-toc li a{color:#2563eb;text-decoration:none;font-weight:500;font-size:.97em;}
.cs-tab-section{margin:56px 0 0;}
.cs-tab-heading{font-size:2em;font-weight:800;color:#0f172a;padding:0 0 16px;border-bottom:3px solid #0e6b8f;margin:0 0 8px;}
.cs-tab-intro{color:#475569;font-size:1.05em;margin:10px 0 32px;}
.cs-panel-section{margin:36px 0 0;}
.cs-panel-heading{font-size:1.45em!important;font-weight:700!important;color:#1e293b!important;margin:0 0 16px!important;padding:0 0 10px!important;border-bottom:2px solid #e2e8f0!important;border-left:none!important;border-top:none!important;border-right:none!important;display:flex!important;align-items:center!important;gap:10px!important;background:transparent!important;}
.cs-panel-heading::before{content:""!important;display:inline-block!important;width:4px!important;height:1.2em!important;background:#0e6b8f!important;border-radius:2px!important;flex-shrink:0!important;}
.cs-screenshot{margin:20px 0 24px;}
.cs-screenshot img{max-width:100%;border-radius:8px;border:1px solid #d1d5db;box-shadow:0 4px 20px rgba(0,0,0,.10);display:block;}
.cs-panel-body{color:#334155;}
.cs-panel-body p{margin:0 0 12px;}
.cs-panel-body ul,.cs-panel-body ol{padding-left:22px;margin:8px 0 16px;}
.cs-panel-body li{margin:6px 0;}
.cs-panel-body strong{color:#1e293b;}
.cs-divider{border:none;border-top:1px solid #e2e8f0;margin:40px 0;}
.cs-sub-heading{font-size:1.1em!important;font-weight:700!important;color:#1e293b!important;margin:24px 0 8px!important;padding:0!important;border:none!important;background:transparent!important;}
</style>
<div class="cs-help-docs" style="max-width:900px;margin:0 auto;">

<div class="cs-hero">
<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px;">
<div style="flex:1;min-width:0;">
<a class="cs-badge" href="https://github.com/andrewbakercloudscale/cloudscale-devtools" target="_blank" rel="noopener" style="text-decoration:none;color:inherit;">Free &amp; Open Source</a>
<h1>CloudScale Cyber and Devtools</h1>
<p style="margin-top:6px;font-size:1.15em;font-weight:600;color:#4ade80;">Free WordPress Pentesting &amp; Vulnerability Scanner</p>
</div>
<img src="https://andrewbaker.ninja/wp-content/plugins/cloudscale-devtools/CloudScaleCyberDevtools.jpeg" alt="CloudScale Cyber Devtools" style="width:100px;height:100px;border-radius:18px;flex-shrink:0;box-shadow:0 4px 20px rgba(0,0,0,.4);">
</div>
<p style="margin-top:16px;">WordPress powers over <strong>40% of the internet</strong>, making it the most targeted platform on the web. Automated scanners probe every exposed site every day, looking for unpatched plugins, misconfigured headers, exposed admin pages, and weak credentials. The attackers are tooled up. Most site owners aren't.</p>
<p style="margin-top:14px;"><strong>CloudScale</strong> is a free, open-source WordPress security plugin with a built-in <strong>AI-powered penetration testing engine</strong>. Point it at your site and get a full <strong>free WordPress pentest</strong> in under 60 seconds: live HTTP probes, DNS validation, weak TLS detection, <strong>free plugin vulnerability scanning</strong>, PHP end-of-life checks, hardening analysis, and a prioritised fix list. It uses frontier AI (Anthropic Claude or Google Gemini) with your own API key, running entirely on your own server. No subscription, no data sent to third parties. A <strong>free Gemini tier</strong> is available with no credit card required.</p>
<p style="margin-top:14px;opacity:.8;">Also includes: 2FA, passkeys, hidden login URL, brute-force protection, AI Debugging Assistant, SMTP mailer, PHP-FPM monitor, server log viewer, SQL tool, code migrator, and more.</p>
<div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:20px;">
<a class="cs-download-btn" href="https://andrewninjawordpress.s3.af-south-1.amazonaws.com/cloudscale-devtools.zip">&#11015; Download Latest Version (.zip)</a>
<a class="cs-github-btn" href="https://github.com/andrewbakercloudscale/cloudscale-devtools" target="_blank" rel="noopener"><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="vertical-align:middle;margin-right:6px;"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg> View on GitHub</a>
</div>
</div>

<div class="cs-toc">
<div class="cs-toc-title">Contents</div>
<ol>
<li><a href="#code-block">Code Block</a></li>
<li><a href="#migrator">Code Block Migrator</a></li>
<li><a href="#hide-login">Hide Login URL</a></li>
<li><a href="#2fa">Two-Factor Auth</a></li>
<li><a href="#passkeys">Passkeys (WebAuthn)</a></li>
<li><a href="#brute-force">Brute Force Protection</a></li>
<li><a href="#test-accounts">Test Account Manager</a></li>
<li><a href="#ai-security">AI Cyber Audit</a></li>
<li><a href="#quick-fixes">Quick Fixes</a></li>
<li><a href="#scan-history">Scan History</a></li>
<li><a href="#scheduled-scans">Scheduled Scans</a></li>
<li><a href="#code-triage">AI Code Triage</a></li>
<li><a href="#server-logs">Server Logs</a></li>
<li><a href="#smtp">SMTP / Mail</a></li>
<li><a href="#thumbnails">Social Preview &amp; Thumbnails</a></li>
<li><a href="#sql-tool">SQL Query Tool</a></li>
<li><a href="#custom-404">Custom 404 Page</a></li>
<li><a href="#perf-monitor">Performance Monitor</a></li>
<li><a href="#ai-debug">AI Debugging Assistant</a></li>
</ol>
</div>

<hr class="cs-divider"/>

<!-- ═══ CODE BLOCK ═══ -->
<div class="cs-panel-section">
<h3 class="cs-panel-heading" id="code-block">Code Block</h3>
<figure class="cs-screenshot"><img decoding="async" src="https://andrewbaker.ninja/wp-content/uploads/2026/04/panel-code-block-5.jpg" alt="Code Block" /></figure>
<div class="cs-panel-body">
<div style="background:#f0f9ff;border-left:4px solid #0e6b8f;padding:18px 22px;border-radius:0 8px 8px 0;margin-bottom:28px;">
<p style="margin:0 0 10px;"><strong>Why CloudScale Devtools?</strong> Popular code highlighting plugins load external CDN scripts that add 100–300ms to your page load. Others charge $30–50/year for features that should come included. CloudScale Devtools bundles everything locally — zero external requests, zero CDN cache impact. Auto language detection, clipboard copy, dark/light toggle, and line numbers all work out of the box.</p>
<p style="margin:0;"><strong>Completely free.</strong> No premium version, no nag screens, no feature gating. Use it on as many sites as you want.</p>
</div>
<p>The <strong>Code Block</strong> is a Gutenberg block (<code>cloudscale/code-block</code>) and shortcode for syntax-highlighted code. Syntax highlighting is powered by <strong>highlight.js 11.11.1</strong>, bundled locally, supporting 190+ languages with auto-detection.</p>
<p><strong>Block and shortcode usage:</strong></p>
<ul>
<li><strong>Gutenberg block</strong> — search for "CloudScale" in the block inserter or type <kbd>/code</kbd>. Language, theme override, title, and line numbers are configurable in the block sidebar.</li>
<li><strong>Shortcode:</strong> <code>[csdt_devtools_code lang="php" title="functions.php"]your code here[/csdt_devtools_code]</code>. Supported attributes: <code>lang</code> (any highlight.js language alias), <code>title</code> (filename label above the block), <code>theme</code> (per-block dark/light override).</li>
</ul>
<p><strong>Features:</strong></p>
<ul>
<li><strong>Auto language detection</strong> — highlight.js analyses the code and picks the most likely language. Override manually in the block sidebar when detection is wrong.</li>
<li><strong>14 colour themes</strong> — Atom One (default), GitHub, Monokai, Nord, Dracula, Tokyo Night, VS 2015, VS Code, Stack Overflow, Night Owl, Gruvbox, Solarized, Panda, Shades of Purple. Each theme has a dark and light variant; the toggle stores the reader's preference in <code>localStorage</code>.</li>
<li><strong>Copy to clipboard</strong> — uses the Clipboard API with fallback to <code>document.execCommand('copy')</code>.</li>
<li><strong>Line numbers</strong> — toggle per block. Line numbers are rendered via CSS counter so they are not included when a reader copies the code.</li>
<li><strong>Paste with fence detection</strong> — paste a Markdown-fenced code block (e.g. <code>```bash … ```</code>) directly into the editor and the language is set automatically.</li>
</ul>
<p><strong>Automatic INI/TOML fragment repair:</strong> When you paste Markdown with INI/TOML fenced code into Gutenberg, bare <code>[section]</code> headers are pulled out and turned into <code>core/shortcode</code> blocks, fragmenting your code. CloudScale Devtools detects this and silently merges the fragments back before you see them. A toast confirms when it happens.</p>
<p><strong>Requirements:</strong> WordPress 6.0+, PHP 7.4+.</p>
</div>
</div>
<hr class="cs-divider"/>

<!-- ═══ MIGRATOR ═══ -->
<div class="cs-panel-section">
<h3 class="cs-panel-heading" id="migrator">Code Block Migrator</h3>
<figure class="cs-screenshot"><img decoding="async" src="https://andrewbaker.ninja/wp-content/uploads/2026/04/panel-migrator-5.jpg" alt="Code Block Migrator" /></figure>
<div class="cs-panel-body">
<p>The <strong>Code Block Migrator</strong> (Tools → CloudScale Cyber and Devtools → Migrate tab) converts legacy code block shortcodes and blocks from other plugins to CloudScale Devtools blocks in a single batch operation.</p>
<p><strong>Supported source formats:</strong></p>
<ul>
<li>WordPress core <code>&lt;!-- wp:code --&gt;</code> and <code>&lt;!-- wp:preformatted --&gt;</code> blocks.</li>
<li><code>&lt;!-- wp:code-syntax-block/code --&gt;</code> blocks from the Code Syntax Block plugin.</li>
<li>Legacy <code>[code]</code>, <code>[sourcecode]</code>, and similar shortcodes — language attribute is preserved where present.</li>
</ul>
<p><strong>Migration workflow:</strong></p>
<ol>
<li><strong>Scan</strong> — queries <code>wp_posts</code> for all posts and pages containing the supported patterns. Results list post title, status, date, and block count.</li>
<li><strong>Preview</strong> — shows a before/after diff for each post. No database writes occur at this stage.</li>
<li><strong>Migrate single</strong> — converts one post at a time and flushes the post cache.</li>
<li><strong>Migrate all</strong> — processes every remaining post in a single AJAX request. For large sites (&gt;500 posts), run during low-traffic periods.</li>
</ol>
<p><strong>Always take a backup before running the migrator.</strong> The conversion modifies <code>post_content</code> directly in the database and there is no undo.</p>
</div>
</div>
<hr class="cs-divider"/>

<!-- ═══ HIDE LOGIN ═══ -->
<div class="cs-panel-section">
<h3 class="cs-panel-heading" id="hide-login">Hide Login URL</h3>
<figure class="cs-screenshot"><img decoding="async" src="https://andrewbaker.ninja/wp-content/uploads/2026/04/panel-hide-login-5.jpg" alt="Hide Login URL" /></figure>
<div class="cs-panel-body">
<p>The <strong>Hide Login URL</strong> feature moves your WordPress login from the default <code>/wp-login.php</code> to a custom URL slug of your choice. Requests to <code>/wp-login.php</code> return a 404 to automated scanners and bots.</p>
<p><strong>How it works:</strong> The feature hooks into <code>init</code> and rewrites the login request transparently — no redirect occurs, so there is no latency penalty. It overrides <code>login_url</code>, <code>lostpassword_url</code>, and <code>register_url</code> filters so all WordPress-generated links point to your custom slug automatically. WP-CLI, REST API, XML-RPC, and WP Cron connections are unaffected.</p>
<p><strong>Setup:</strong> Tools → CloudScale Cyber and Devtools → Login tab → enter your chosen slug (e.g. <code>my-login</code>) and save. Your login URL becomes <code>https://yoursite.com/my-login</code>. Keep a note of your slug — if you forget it you can recover it by deactivating the plugin.</p>
<p><strong>Session Duration:</strong> Also on the Login tab, you can set a custom session duration (in days). When set, login cookies are issued with that lifetime so users stay logged in without re-authenticating on every visit.</p>
</div>
</div>
<hr class="cs-divider"/>

<!-- ═══ 2FA ═══ -->
<div class="cs-panel-section">
<h3 class="cs-panel-heading" id="2fa">Two-Factor Authentication</h3>
<div class="cs-panel-body">
<p>CloudScale Devtools supports three 2FA methods, all configurable under Tools → CloudScale Cyber and Devtools → Login tab.</p>

<h4 class="cs-sub-heading">Email Code</h4>
<p>After a successful password login, a 6-digit code is emailed to the user's registered address. The code expires after 10 minutes. No third-party service is required — the code is generated and verified entirely on your server.</p>

<h4 class="cs-sub-heading">TOTP (Authenticator App)</h4>
<p>Generates a QR code that the user scans with any RFC 6238–compliant authenticator app (Google Authenticator, Authy, 1Password, Bitwarden, etc.). The 6-digit code rotates every 30 seconds. Setup is done from the Login tab via a wizard: scan QR → enter code to verify → done.</p>

<h4 class="cs-sub-heading">Passkeys</h4>
<p>See the <a href="#passkeys">Passkeys (WebAuthn)</a> section below for full details.</p>

<h4 class="cs-sub-heading">Enforcement &amp; Grace Logins</h4>
<ul>
<li><strong>Force 2FA for all admins</strong> — when enabled, all users with the <code>manage_options</code> capability must complete 2FA setup before they can access wp-admin.</li>
<li><strong>Grace logins</strong> — configures how many times a user can log in without 2FA before they are required to set it up. Useful for rolling out 2FA across a team without locking anyone out immediately.</li>
</ul>
</div>
</div>
<hr class="cs-divider"/>

<!-- ═══ PASSKEYS ═══ -->
<div class="cs-panel-section">
<h3 class="cs-panel-heading" id="passkeys">Passkeys (WebAuthn)</h3>
<div class="cs-panel-body">
<p><strong>Passkeys</strong> use the FIDO2/WebAuthn standard to replace or supplement passwords with a biometric or hardware key. The private key never leaves the user's device — your server only stores the public key.</p>
<p><strong>Supported authenticators:</strong> Face ID and Touch ID (macOS/iOS), Windows Hello, Android biometrics, and hardware security keys (YubiKey, etc.).</p>
<p><strong>Browser support:</strong> Chrome 108+, Safari 16+, Edge 108+, Firefox 122+.</p>
<p><strong>Key properties:</strong></p>
<ul>
<li><strong>Phishing-resistant</strong> — the key pair is domain-bound; a cloned login page on a different domain cannot use it.</li>
<li><strong>Per-device registration</strong> — register multiple devices with individual labels. Remove any device at any time from the Login tab.</li>
<li><strong>Test without logout</strong> — after registering a passkey you can verify it works from the Login tab without signing out first.</li>
</ul>
<p><strong>Registration:</strong> Tools → CloudScale Cyber and Devtools → Login tab → Passkeys section → click Register and follow your browser/OS prompt. Give the device a recognisable label (e.g. "MacBook Touch ID").</p>
</div>
</div>
<hr class="cs-divider"/>

<!-- ═══ BRUTE FORCE ═══ -->
<div class="cs-panel-section">
<h3 class="cs-panel-heading" id="brute-force">Brute Force Protection</h3>
<div class="cs-panel-body">
<p>The <strong>Brute Force Protection</strong> feature rate-limits repeated failed login attempts on a per-username basis, locking out attackers before they can exhaust your password space.</p>
<p><strong>Configuration</strong> (Tools → CloudScale Cyber and Devtools → Login tab):</p>
<ul>
<li><strong>Max attempts</strong> — number of consecutive failed logins before a lockout is triggered (default: 5).</li>
<li><strong>Lockout duration</strong> — how long the account is blocked after the threshold is reached (configurable in minutes).</li>
</ul>
<p>The lock is <strong>per-username, not per-IP</strong> — this stops distributed attacks spread across multiple IPs. Failed attempts and lockout state are stored as WordPress transients — no extra database tables. Lockouts clear automatically when the transient expires. Successful logins reset the counter.</p>
<p><strong>Works alongside 2FA:</strong> Brute force protection fires at the password stage, before any 2FA challenge. An attacker cannot reach the 2FA prompt if they have already been locked out.</p>
</div>
</div>
<hr class="cs-divider"/>

<!-- ═══ TEST ACCOUNT MANAGER ═══ -->
<div class="cs-panel-section">
<h3 class="cs-panel-heading" id="test-accounts">Test Account Manager</h3>
<div class="cs-panel-body">
<p>The <strong>Test Account Manager</strong> creates short-lived subscriber-level WordPress accounts with application passwords — designed for Playwright, Cypress, and other automated testing pipelines that need to authenticate against the WordPress REST API without storing production credentials in CI configuration.</p>

<h4 class="cs-sub-heading">How It Works</h4>
<p>When enabled, clicking <strong>Create Test Account</strong> generates a new subscriber account with a random username (e.g. <code>csdt-test-a1b2c3</code>) and an application password. Credentials are displayed <strong>once only</strong> — copy them immediately. The account and its app password are automatically deleted when the TTL expires.</p>
<p>The feature restricts app passwords to test accounts only — all production accounts remain blocked. This means you can have the security benefit of disabled app passwords for regular users while still giving CI pipelines a safe authentication path.</p>

<h4 class="cs-sub-heading">Configuration</h4>
<ul>
<li><strong>Default TTL</strong> — how long an account lives before automatic deletion: 30 min, 1 hour, 2 hours, or 24 hours.</li>
<li><strong>Single-use</strong> — delete the account immediately on the first successful authentication. Useful for one-shot test runs; may cause issues if Playwright retries a failed request.</li>
</ul>

<h4 class="cs-sub-heading">Using Credentials in Playwright</h4>
<p>After creating an account, the panel shows copy buttons for:</p>
<ul>
<li><strong>JSON</strong> — paste into a <code>.env</code> file or a Playwright fixture</li>
<li><strong>curl example</strong> — test the credentials from the command line</li>
</ul>
<p>The REST URL shown is the base URL for authenticated API calls using Basic Auth with the app password.</p>

<h4 class="cs-sub-heading">Active Account List</h4>
<p>The panel shows all currently active test accounts with their expiry time. Click <strong>Revoke</strong> on any account to delete it immediately rather than waiting for the TTL.</p>
</div>
</div>
<hr class="cs-divider"/>

<!-- ═══ AI CYBER AUDIT ═══ -->
<div class="cs-panel-section">
<h3 class="cs-panel-heading" id="ai-security">AI Cyber Audit</h3>
<div class="cs-panel-body">
<div style="background:#fdf4ff;border-left:4px solid #7c3aed;padding:18px 22px;border-radius:0 8px 8px 0;margin-bottom:24px;">
<p style="margin:0 0 8px;"><strong>🛡️ Enterprise-grade security analysis — free, in under 60 seconds.</strong> The AI Cyber Audit submits your WordPress environment to a frontier AI model (Claude or Gemini) which analyses it like an expert penetration tester: cross-referencing configuration decisions, live HTTP responses, DNS records, TLS configuration, exposed endpoints, and plugin code to find real vulnerabilities — not just checklist items.</p>
<p style="margin:0;">Results are scored <strong>Critical / High / Medium / Low / Good</strong>, each with a plain-English explanation and a concrete step-by-step remediation — the same quality you'd expect from a paid security consultant.</p>
</div>
<p>Access the audit at <strong>Tools → CloudScale Cyber and Devtools → Security tab</strong>. Two scan modes are available:</p>

<h4 class="cs-sub-heading">Run AI Cyber Audit (Standard)</h4>
<p>The fast scan (~15–30 seconds). Collects server-side configuration data and sends it to your chosen AI model:</p>
<ul>
<li>PHP and WordPress core versions</li>
<li>Active plugins and themes (versions, known vulnerability flags)</li>
<li>File permissions on key files and directories</li>
<li>Exposed debug flags (<code>WP_DEBUG</code>, <code>WP_DEBUG_LOG</code>, <code>SCRIPT_DEBUG</code>)</li>
<li>User accounts, roles, and 2FA coverage</li>
<li>Brute-force protection configuration</li>
<li>Key <code>wp-config.php</code> security constants (<code>DISALLOW_FILE_EDIT</code>, <code>FORCE_SSL_ADMIN</code>, table prefix, secret key strength)</li>
<li>WordPress version display and XML-RPC exposure</li>
</ul>

<h4 class="cs-sub-heading">Run AI Deep Dive Cyber Audit</h4>
<p>The comprehensive scan (~30–90 seconds). Extends the standard scan with:</p>
<ul>
<li><strong>Live HTTP header inspection</strong> — Content-Security-Policy, HSTS, X-Frame-Options, X-Content-Type-Options, Permissions-Policy, Referrer-Policy, and CORS (<code>Access-Control-Allow-Origin</code>).</li>
<li><strong>Endpoint exposure probes</strong> — <code>/wp-json/wp/v2/users</code> (user enumeration), XML-RPC, <code>/wp-cron.php</code>, open redirect test, and upload URL accessibility.</li>
<li><strong>Directory listing checks</strong> — verifies that <code>/wp-content/plugins/</code> and <code>/wp-content/themes/</code> do not return a browsable file listing (a common information disclosure risk).</li>
<li><strong>SSL/TLS certificate</strong> — expiry date and days remaining.</li>
<li><strong>Weak TLS protocol detection</strong> — tests whether your server still accepts connections over TLS 1.0 or TLS 1.1 (deprecated since 2021; rejected by modern browsers).</li>
<li><strong>DNS email security</strong> — SPF, DMARC, and DKIM records for your sending domain. DKIM is probed across 12 common selectors (google, default, mail, selector1, selector2, sendgrid, etc.).</li>
<li><strong>PHP end-of-life status</strong> — flags PHP versions that have reached end-of-life and are no longer receiving security patches, with the exact EOL date.</li>
<li><strong>Static code analysis</strong> — scans active plugin PHP files for known vulnerability patterns: <code>eval()</code>, <code>base64_decode()</code> on user input, <code>shell_exec()</code>/<code>system()</code>, dynamic <code>include</code>/<code>require</code>, obfuscated variable names, and suspicious SQL construction.</li>
<li><strong>AI code triage</strong> — top static findings are sent to an AI model for classification before the main audit (see <a href="#code-triage">AI Code Triage</a> below).</li>
</ul>
<p>Results from all checks are merged and weighted (internal config 45%, external exposure 55%) into a single scored report with cross-correlated findings — for example, flagging when weak TLS is combined with a missing HSTS header, or when PHP is EOL and also has plugins with known vulnerabilities.</p>

<h4 class="cs-sub-heading">AI Providers</h4>
<p>The audit supports two AI providers. Select your preferred provider and enter your API key on the Security tab settings panel:</p>
<ul>
<li><strong>Anthropic Claude</strong> — uses the Claude API (<code>api.anthropic.com</code>). Get an API key at <a href="https://console.anthropic.com/" target="_blank" rel="noopener">console.anthropic.com</a>. Default models: Claude Sonnet 4.6 (standard), Claude Opus 4.7 (deep dive).</li>
<li><strong>Google Gemini</strong> — uses the Gemini API (<code>generativelanguage.googleapis.com</code>). Get an API key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a>. Default models: Gemini 2.0 Flash (standard), Gemini 2.5 Pro (deep dive). A free tier is available.</li>
</ul>
<p>You can customise the model selection and edit the system prompt directly in the settings panel to tune the analysis for your environment.</p>

<h4 class="cs-sub-heading">How Scans Run (No Timeout Risk)</h4>
<p>Scans can take 30–120 seconds. To avoid HTTP gateway timeouts, CloudScale Devtools uses <code>fastcgi_finish_request()</code> to close the browser connection immediately after the scan starts, then continues running the analysis in the same PHP-FPM worker in the background. A progress bar updates every 3 seconds via polling until the result is ready. This approach does <strong>not</strong> depend on WP Cron — <code>DISABLE_WP_CRON</code> and cron configuration have no effect on on-demand scans.</p>

<h4 class="cs-sub-heading">External Services Used</h4>
<p>When a scan runs, the following external requests are made:</p>
<ul>
<li><strong>AI provider API</strong> — scan data (plugin list, PHP config, headers, etc.) is sent to the Anthropic or Gemini API for analysis. No personally identifiable user data is included. Review each provider's privacy policy: <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener">Anthropic</a> · <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Google</a>.</li>
<li><strong>Your own site (deep dive only)</strong> — the plugin makes HTTP requests to your own site's public URLs to check security headers and endpoint exposure. No data leaves your server other than the final summary sent to the AI.</li>
</ul>
<p>API keys are stored in <code>wp_options</code> and never exposed to the browser. The Security tab displays a masked version of the stored key.</p>

<h4 class="cs-sub-heading">Access Control</h4>
<p>The Security tab requires the <code>manage_options</code> capability (administrators only). All AJAX endpoints are protected by nonce verification and capability checks.</p>
</div>
</div>
<hr class="cs-divider"/>

<!-- ═══ QUICK FIXES ═══ -->
<div class="cs-panel-section">
<h3 class="cs-panel-heading" id="quick-fixes">Quick Fixes</h3>
<div class="cs-panel-body">
<p>The <strong>Quick Fixes</strong> panel (Security tab, above the AI Audit controls) shows a checklist of common WordPress security misconfigurations. Each item displays its current status and, where automation is possible, a one-click fix button.</p>

<h4 class="cs-sub-heading">What It Checks</h4>
<ul>
<li><strong>debug.log exposed</strong> — checks whether <code>wp-content/debug.log</code> exists and is publicly accessible. The fix button moves the file to a directory outside the web root and rewrites the <code>WP_DEBUG_LOG</code> constant in <code>wp-config.php</code> to point to the new safe path, preventing the file from being recreated at the old location.</li>
<li><strong>WordPress version displayed</strong> — checks whether <code>wp_generator</code> is emitting your WordPress version in page <code>&lt;head&gt;</code>. The fix removes the generator meta tag.</li>
<li><strong>XML-RPC enabled</strong> — checks whether <code>/xmlrpc.php</code> is accessible. The fix disables it via a filter (unless you have WooCommerce or JetPack which require it).</li>
<li><strong>Application passwords</strong> — checks whether WordPress application passwords are enabled. The fix disables them unless the Test Account Manager feature is active (which requires app passwords for its CI pipeline accounts).</li>
<li><strong>Directory browsing</strong> — checks whether Apache/Nginx is serving directory listings for your uploads folder.</li>
<li><strong>File editing in wp-admin</strong> — checks whether the built-in theme/plugin code editor is enabled (<code>DISALLOW_FILE_EDIT</code>).</li>
</ul>

<h4 class="cs-sub-heading">Status Indicators</h4>
<p>Each item shows one of:</p>
<ul>
<li><strong style="color:#16a34a;">✓ Fixed</strong> — the issue is not present (or has been resolved).</li>
<li><strong style="color:#dc2626;">⚠ Action needed</strong> — the issue is present; a fix button is shown if automation is available.</li>
<li><strong style="color:#d97706;">⚠ Warning</strong> — fixed but with a caveat (e.g. <code>wp-config.php</code> was not writable so only a partial fix was applied).</li>
</ul>
<p>The checklist refreshes automatically after each fix is applied.</p>
</div>
</div>
<hr class="cs-divider"/>

<!-- ═══ SCAN HISTORY ═══ -->
<div class="cs-panel-section">
<h3 class="cs-panel-heading" id="scan-history">Scan History</h3>
<div class="cs-panel-body">
<p>Every scan result — both on-demand and scheduled — is automatically saved to scan history. The last <strong>10 results</strong> are kept, stored in <code>wp_options</code> so they survive across sessions and server restarts.</p>
<p>The history table (Security tab, below the scan controls) shows:</p>
<ul>
<li>Scan type (Standard or Deep Dive)</li>
<li>Date and time the scan completed</li>
<li>Overall score and top-level risk rating</li>
</ul>
<p>Click any row to instantly reload that scan's full AI report into the results panel — useful for:</p>
<ul>
<li>Comparing your security posture before and after making changes</li>
<li>Reviewing a scan result after returning to a page that had been navigated away from</li>
<li>Sharing a specific scan with a colleague (results are stored server-side, not in the browser)</li>
</ul>
</div>
</div>
<hr class="cs-divider"/>

<!-- ═══ SCHEDULED SCANS ═══ -->
<div class="cs-panel-section">
<h3 class="cs-panel-heading" id="scheduled-scans">Scheduled Scans</h3>
<div class="cs-panel-body">
<p>The <strong>Scheduled Scans</strong> panel (Security tab) lets you run a deep dive cyber audit automatically on a recurring schedule, without having to visit the admin panel.</p>

<h4 class="cs-sub-heading">Configuration</h4>
<ul>
<li><strong>Schedule</strong> — choose Daily or Weekly.</li>
<li><strong>Email alerts</strong> — when enabled, the AI audit summary is emailed to the administrator's registered email address after each scheduled scan completes.</li>
<li><strong>ntfy.sh notifications</strong> — enter an ntfy.sh topic to receive a push notification on your phone when a scan completes. Useful for monitoring sites without checking email. The notification includes the overall risk score and a summary of the top findings.</li>
</ul>

<h4 class="cs-sub-heading">How Scheduled Scans Run</h4>
<p>Scheduled scans are dispatched via WP-Cron. The scan runs as a background PHP process (same mechanism as on-demand scans) so it does not block a web request. Results are saved to scan history automatically. If a scheduled scan fails — for example because an API key has expired — the failure is logged in the scan history table.</p>
<p><strong>Note:</strong> WP-Cron fires on page load. On low-traffic sites, scheduled scans may run slightly later than the configured interval if no page loads occur at the scheduled time. You can use a server-side cron job calling <code>wp-cron.php</code> directly for more reliable scheduling.</p>
</div>
</div>
<hr class="cs-divider"/>

<!-- ═══ CODE TRIAGE ═══ -->
<div class="cs-panel-section">
<h3 class="cs-panel-heading" id="code-triage">AI Code Triage</h3>
<div class="cs-panel-body">
<p>The <strong>AI Code Triage</strong> is an intermediate analysis step that runs automatically during every deep dive scan. It sits between the static code scanner and the main AI audit, acting as a filter to separate genuine risks from false positives before expensive AI analysis is performed.</p>

<h4 class="cs-sub-heading">How It Works</h4>
<ol>
<li><strong>Static scan</strong> — CloudScale Devtools scans the PHP files of all active plugins for patterns associated with malicious code: <code>eval()</code>, base64-encoded payloads, shell execution functions, dynamic file includes, obfuscated variable names, and suspicious SQL construction. This step is instant and costs nothing.</li>
<li><strong>Risk prioritisation</strong> — findings are sorted by risk level. The top 10 highest-risk snippets are selected.</li>
<li><strong>Context extraction</strong> — for each finding, 10 lines of code before and after the flagged line are extracted to give the AI enough context to make an accurate judgement.</li>
<li><strong>AI classification</strong> — snippets are sent in a single batch to the cheapest available AI model (Claude Haiku or Gemini Flash) with instructions to classify each as one of three verdicts.</li>
<li><strong>Main audit filtering</strong> — only <strong>Confirmed</strong> findings are forwarded to the main deep dive audit AI. False positives are silently dropped, reducing noise in the final report.</li>
</ol>

<h4 class="cs-sub-heading">Verdicts</h4>
<ul>
<li><strong style="color:#dc2626;">Confirmed</strong> — the AI assessed the snippet as a genuine security risk in this context.</li>
<li><strong style="color:#16a34a;">False Positive</strong> — the code is safe; the pattern matched a legitimate use (e.g. a plugin legitimately using <code>eval()</code> for a templating engine).</li>
<li><strong style="color:#d97706;">Needs Context</strong> — the risk depends on how the function is called or what data it receives; reported as advisory.</li>
</ul>
<p>All three verdict types are shown in the Code Triage section of the deep scan report. The main AI report only reflects confirmed findings.</p>

<h4 class="cs-sub-heading">Cost</h4>
<p>Triage adds a small AI cost per deep scan — typically $0.01–0.03 USD using Claude Haiku or Gemini Flash. If no static findings are detected, the triage step is skipped entirely at zero cost.</p>
</div>
</div>
<hr class="cs-divider"/>

<!-- ═══ SERVER LOGS ═══ -->
<div class="cs-panel-section">
<h3 class="cs-panel-heading" id="server-logs">Server Logs</h3>
<div class="cs-panel-body">
<p>The <strong>Server Logs</strong> tab provides a read-only in-browser viewer for PHP error logs, the WordPress debug log, and web server access/error logs — without needing SSH or a file manager.</p>

<h4 class="cs-sub-heading">Log Sources</h4>
<p>The panel auto-detects common log file paths for the most popular server stacks: Apache (<code>access.log</code>, <code>error.log</code>), Nginx, PHP-FPM, the WordPress debug log (<code>wp-content/debug.log</code>), and any custom paths you add. Each source button shows a colour-coded availability status:</p>
<ul>
<li><strong style="color:#16a34a;">Green</strong> — file found and readable</li>
<li><strong style="color:#d97706;">Amber</strong> — file exists but is empty</li>
<li><strong style="color:#dc2626;">Red</strong> — file not found or permission denied</li>
</ul>

<h4 class="cs-sub-heading">PHP Error Log Setup</h4>
<p>If PHP is logging to <code>/dev/stderr</code> (the default in many Docker and container environments), errors cannot be read in the browser. The panel shows a setup banner with an <strong>Enable</strong> button that installs a mu-plugin to redirect PHP errors to <code>wp-content/php-error.log</code>. The mu-plugin loads before all other plugins on every request.</p>

<h4 class="cs-sub-heading">Viewing and Filtering</h4>
<p>Click any source button to load its most recent lines. Use the controls to filter what you see:</p>
<ul>
<li><strong>Search</strong> — live text filter across all visible lines.</li>
<li><strong>Level</strong> — show only lines at or above a severity (emergency, alert, critical, error, warning, notice, info, debug). Lines are colour-coded: red for errors/critical, amber for warnings, blue for notice/info, grey for debug.</li>
<li><strong>Lines</strong> — how many tail lines to fetch from the server (100 to 2000). Changing this setting re-fetches the log.</li>
</ul>

<h4 class="cs-sub-heading">Auto-Refresh (Tail Mode)</h4>
<p>Enable the <strong>Tail</strong> checkbox to poll the selected log every 30 seconds automatically. Useful for watching a running process or debugging a live issue.</p>

<h4 class="cs-sub-heading">Custom Log Paths</h4>
<p>Add any absolute file path readable by the web server user. Common additions include application logs (e.g. <code>/var/www/html/storage/logs/laravel.log</code>), cron output files, or custom PHP-FPM pool logs. Labels are free-text. Custom paths are saved as a WordPress option and persist across plugin updates.</p>

<h4 class="cs-sub-heading">Permissions</h4>
<p>System logs (e.g. <code>/var/log/syslog</code>, <code>/var/log/auth.log</code>) are typically owned by <code>root</code> and not readable by <code>www-data</code>. This is intentional OS hardening — the panel shows a clear "permission denied" notice. To expose a system log, add your web server user to the <code>adm</code> group, or use a log-shipping tool to copy entries to a file the web server can read.</p>
</div>
</div>
<hr class="cs-divider"/>

<!-- ═══ SMTP ═══ -->
<div class="cs-panel-section">
<h3 class="cs-panel-heading" id="smtp">SMTP / Mail</h3>
<div class="cs-panel-body">
<p>The <strong>SMTP</strong> tab replaces WordPress's default <code>wp_mail()</code> (which relies on PHP's <code>mail()</code> function) with authenticated SMTP delivery. This fixes delivery failures on servers where PHP mail is disabled or flagged as spam.</p>
<p><strong>Configuration</strong> (Tools → CloudScale Cyber and Devtools → Mail tab):</p>
<ul>
<li><strong>SMTP host</strong> — your mail server hostname (e.g. <code>smtp.gmail.com</code>, <code>smtp.sendgrid.net</code>, or your hosting provider's SMTP server).</li>
<li><strong>Port</strong> — typically 587 (STARTTLS) or 465 (SSL).</li>
<li><strong>Encryption</strong> — TLS (recommended), SSL, or None.</li>
<li><strong>Authentication</strong> — username and password. Leave blank if your server allows unauthenticated relay on a local network.</li>
<li><strong>From name / From email</strong> — override the sender displayed to recipients for all outgoing WordPress mail.</li>
</ul>
<p><strong>Test email:</strong> Send a test message to any address directly from the Mail tab to confirm delivery before relying on it for 2FA codes, password resets, and WooCommerce emails.</p>
<p><strong>Email log:</strong> The Mail tab maintains a log of sent messages with timestamp, recipient, subject, and delivery status. Useful for diagnosing missed emails. The log can be cleared from the tab.</p>
</div>
</div>
<hr class="cs-divider"/>

<!-- ═══ THUMBNAILS ═══ -->
<div class="cs-panel-section">
<h3 class="cs-panel-heading" id="thumbnails">Social Preview &amp; Thumbnails</h3>
<div class="cs-panel-body">
<p>The <strong>Thumbnails</strong> tab (Tools → CloudScale Cyber and Devtools → Thumbnails) is a social preview diagnostics suite for ensuring every post shares correctly on Facebook, Twitter/X, LinkedIn, and WhatsApp.</p>

<h4 class="cs-sub-heading">URL Checker</h4>
<p>Enter any URL on your site and get a full breakdown of its <code>og:image</code>, <code>og:title</code>, <code>og:description</code>, <code>twitter:card</code>, and related meta tags — exactly as a social crawler would see them. Diagnoses common problems such as missing tags, wrong image dimensions, or images blocked by Cloudflare's crawler challenge.</p>

<h4 class="cs-sub-heading">Post Scan</h4>
<p>Batch-scans all published posts and pages, flagging those that are missing a featured image, have an <code>og:image</code> below platform minimum dimensions, or have no social meta at all. Results are sorted by severity so you can fix the highest-impact issues first.</p>

<h4 class="cs-sub-heading">og:image Generation</h4>
<p>For posts missing a suitable social image, the Thumbnails tab can generate platform-optimised variants from your existing featured image:</p>
<ul>
<li><strong>Facebook / LinkedIn</strong> — 1200 × 630 px</li>
<li><strong>Twitter/X card</strong> — 1200 × 628 px</li>
<li><strong>WhatsApp</strong> — 400 × 400 px square</li>
</ul>
<p>Generated images are added to the Media Library and attached to the post. You can regenerate them at any time from the Thumbnails tab.</p>

<h4 class="cs-sub-heading">Cloudflare Integration</h4>
<p>If your site is behind Cloudflare, social crawlers (Facebook, Twitterbot, LinkedInBot) need to bypass the challenge page to read your <code>og:</code> tags. The Thumbnails tab includes a Cloudflare connection test that verifies crawler user-agents can reach your pages, and a cache-purge button to force Cloudflare to re-fetch your social meta after an update.</p>

<h4 class="cs-sub-heading">Media Library Audit</h4>
<p>Scans attached media for images that are too small for any platform's requirements, images with no alt text, and featured images that exist in the Media Library but are no longer attached to any post.</p>
</div>
</div>
<hr class="cs-divider"/>

<!-- ═══ CUSTOM 404 ═══ -->
<div class="cs-panel-section">
<h3 class="cs-panel-heading" id="custom-404">Custom 404 Page</h3>
<div class="cs-panel-body">
<p>The <strong>Custom 404</strong> tab lets you replace the default WordPress 404 error page with a branded page — and optionally embed one of seven browser mini-games to keep visitors entertained while they find their way back.</p>

<h4 class="cs-sub-heading">404 Page Editor</h4>
<p>Set a custom title, message, and redirect link shown on your 404 page. The page inherits your active theme's header and footer so it matches your site design. Changes are live immediately — no page template file edits required.</p>

<h4 class="cs-sub-heading">Mini-Games</h4>
<p>Embed one of seven fully self-contained games on your 404 page. All games run in the browser with no external dependencies:</p>
<ul>
<li><strong>Runner</strong> — endless side-scroller; tap or press Space to jump.</li>
<li><strong>Jetpack</strong> — vertical jetpack flyer; hold Space to ascend.</li>
<li><strong>Racer</strong> — top-down car racing; arrow keys to steer.</li>
<li><strong>Miner</strong> — tile-based digging game.</li>
<li><strong>Asteroids</strong> — classic space shooter; arrow keys + Space to fire.</li>
<li><strong>Snake</strong> — classic snake; arrow keys.</li>
<li><strong>Space Invaders</strong> — classic fixed-shooter; arrow keys to move, Space to fire. On-screen buttons for mobile.</li>
</ul>

<h4 class="cs-sub-heading">Leaderboard</h4>
<p>Each game maintains a per-browser high score via <code>localStorage</code>. A site-wide leaderboard syncs scores to the server so visitors can compete across sessions and devices.</p>
</div>
</div>
<hr class="cs-divider"/>

<!-- ═══ SQL TOOL ═══ -->
<div class="cs-panel-section">
<h3 class="cs-panel-heading" id="sql-tool">SQL Query Tool</h3>
<figure class="cs-screenshot"><img decoding="async" src="https://andrewbaker.ninja/wp-content/uploads/2026/04/panel-sql-tool-5.jpg" alt="SQL Query Tool" /></figure>
<div class="cs-panel-body">
<p>The <strong>SQL Query Tool</strong> lets administrators run read-only SELECT queries against the live database from within wp-admin — no phpMyAdmin or SSH required. Results display in a paginated table with column headers and query execution time.</p>
<p><strong>Security model:</strong> Access requires <code>manage_options</code>. Every query is validated before execution: block/line comments are stripped, semicolons are rejected, <code>INTO OUTFILE</code>/<code>LOAD_FILE</code> are blocked, and only <code>SELECT</code>, <code>SHOW</code>, <code>DESCRIBE</code>, <code>DESC</code>, and <code>EXPLAIN</code> are permitted.</p>
<p><strong>14 built-in quick queries</strong> in four groups: Health &amp; Diagnostics, Content Summary, Bloat &amp; Cleanup, and URL &amp; Migration Helpers.</p>
<p><strong>Keyboard shortcuts:</strong> <kbd>Enter</kbd> or <kbd>Ctrl+Enter</kbd> runs the query. <kbd>Shift+Enter</kbd> inserts a newline.</p>
</div>
</div>
<hr class="cs-divider"/>

<!-- ═══ PERFORMANCE MONITOR ═══ -->
<div class="cs-panel-section">
<h3 class="cs-panel-heading" id="perf-monitor">Performance Monitor</h3>
<div class="cs-panel-body">
<p>The <strong>Performance Monitor</strong> is a non-intrusive profiling panel that overlays on every wp-admin screen and frontend page (for logged-in administrators). It collects data in real time without storing anything to the database.</p>
<p><strong>What it tracks:</strong></p>
<ul>
<li><strong>Database queries</strong> — every query with timing, call-chain trace, and the originating plugin/theme file.</li>
<li><strong>N+1 detection</strong> — highlights patterns where similar queries fire repeatedly in a loop.</li>
<li><strong>EXPLAIN analysis</strong> — click any SELECT query to run <code>EXPLAIN</code> inline and see whether it's using indexes.</li>
<li><strong>HTTP requests</strong> — tracks <code>wp_remote_get/post</code> calls with URL and response time.</li>
<li><strong>PHP errors</strong> — captures notices, warnings, and fatal errors with file and line number.</li>
<li><strong>Hook profiler</strong> — lists all fired actions and filters with timing.</li>
<li><strong>Asset inventory</strong> — scripts and stylesheets enqueued for the current page load.</li>
<li><strong>Transient activity</strong> — set and delete operations on transients.</li>
<li><strong>Template hierarchy</strong> — the chain of template files WordPress evaluated to render the page.</li>
</ul>
<p>The panel is enabled by default. You can disable it under Tools → CloudScale Cyber and Devtools → Settings. Data is colour-coded by severity and can be exported as JSON for sharing with developers.</p>
</div>
</div>
<hr class="cs-divider"/>

<!-- ═══ AI DEBUGGING ASSISTANT ═══ -->
<div class="cs-panel-section">
<h3 class="cs-panel-heading" id="ai-debug">AI Debugging Assistant</h3>
<div class="cs-panel-body">
<div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 60%,#0e1628 100%);border-radius:10px;padding:24px 28px;margin-bottom:28px;color:#e2e8f0;">
<p style="margin:0 0 10px;font-size:1.1em;font-weight:700;color:#a78bfa;">Your site broke. Find out why in seconds.</p>
<p style="margin:0;opacity:.85;font-size:.95em;line-height:1.6;">The <strong>AI Debugging Assistant</strong> (Tools → Debug AI tab) connects your server logs directly to a frontier AI model. When something breaks — a PHP fatal, a plugin conflict, a failing cron job, a cryptic SMTP error — paste the error or click <em>Load Errors</em> to pull recent lines from your PHP, WordPress, or web server logs. The AI returns three things: the exact root cause, the mechanism behind it, and numbered steps to fix it. No tab-switching, no Stack Overflow, no guessing.</p>
</div>

<h4 class="cs-sub-heading">How it works</h4>
<ol>
<li><strong>Load from logs</strong> — click <em>PHP Errors</em>, <em>WP Debug</em>, or <em>Web Server</em> to fetch the last 200 lines from the corresponding log file. Error-level lines are extracted and listed as clickable rows. Click any row to populate the input.</li>
<li><strong>Or paste directly</strong> — paste any error message, stack trace, wp-cron failure, SMTP diagnostic, JavaScript console error, or plain-English problem description into the text area.</li>
<li><strong>Analyze</strong> — click <em>Analyze with AI</em>. The assistant sends the input to Claude or Gemini (whichever API key is configured) with full WordPress and PHP version context.</li>
<li><strong>Act on the result</strong> — the response is structured into three colour-coded sections: Root Cause, Why It Happens, and How to Fix It. File paths, function names, and code snippets are formatted for readability.</li>
</ol>

<h4 class="cs-sub-heading">What it can diagnose</h4>
<ul>
<li>PHP fatal errors, warnings, and notices — including plugin and theme conflicts</li>
<li>WordPress database errors and table corruption</li>
<li>WP-Cron failures and missed scheduled events</li>
<li>SMTP delivery failures and mail configuration errors</li>
<li>Memory exhaustion and max execution time errors</li>
<li>REST API and AJAX errors from wp-admin logs</li>
<li>Web server 500 errors, rewrite rule failures, and permission errors</li>
<li>JavaScript console errors pasted from the browser DevTools</li>
<li>Any plain-English description of unexpected behaviour</li>
</ul>

<h4 class="cs-sub-heading">Requirements</h4>
<p>An Anthropic or Gemini API key must be configured under <strong>Security Scan → Settings</strong>. The assistant uses the same API key and model as the AI Cyber Audit — no separate configuration is needed. Log files must be readable by the web server process; see the <a href="#server-logs">Server Logs</a> section for setup instructions.</p>

<h4 class="cs-sub-heading" id="php-error-alerting">PHP Error Alerting</h4>
<div style="background:#fff7ed;border-left:4px solid #f97316;padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:20px;">
<p style="margin:0;"><strong>Stop finding out your site is broken from your users.</strong> PHP Error Alerting watches your error logs in the background and sends you a push notification + email the moment a new fatal or error appears — before any visitor has a chance to report it.</p>
</div>
<p>The <strong>PHP Error Alerting</strong> panel (Debug AI tab, bottom section) monitors your PHP error log and WordPress debug log on a 5-minute cron cycle. When new fatal or error lines are detected since the last check, you receive:</p>
<ul>
<li><strong>ntfy.sh push notification</strong> — delivered to your phone or desktop immediately. Priority is set to <em>urgent</em> for PHP fatals, <em>high</em> for warnings/errors. Uses the same ntfy.sh topic configured under Scheduled Scans.</li>
<li><strong>Email alert</strong> — sent to the site administrator's registered email address with the error excerpt.</li>
</ul>
<p><strong>How it works:</strong></p>
<ol>
<li>On each 5-minute tick, the monitor reads only the <em>new bytes</em> appended since the last check (byte-offset tracking) — it never re-reads old content.</li>
<li>New content is filtered for lines matching PHP Fatal, PHP Error, PHP Parse, PHP Warning, and PHP Critical patterns.</li>
<li>If the count of new error lines meets the configured threshold, an alert fires. Alerts are throttled to one per 15 minutes to prevent flooding during an error storm.</li>
<li>On first activation, the current end-of-file position is recorded as the baseline — you will not be alerted for errors that existed before you turned the feature on.</li>
</ol>
<p><strong>Configuration:</strong></p>
<ul>
<li><strong>Enable / Disable</strong> — toggle the monitor on or off.</li>
<li><strong>Alert threshold</strong> — minimum number of new error lines in a 5-minute window before an alert fires (default: 1).</li>
</ul>
<p><strong>Requirements:</strong> ntfy.sh notifications require a topic configured under <strong>Security Scan → Scheduled Scans → ntfy.sh URL</strong>. Email alerts use your configured SMTP settings (or PHP mail as fallback).</p>
</div>
</div>
<hr class="cs-divider"/>

<p style="text-align:center;color:#94a3b8;font-size:.9em;margin-top:40px;">CloudScale Cyber and Devtools is free and open source. Found a bug or have a feature request? <a href="https://github.com/andrewbakercloudscale/cloudscale-devtools/issues" target="_blank" rel="noopener">Open an issue on GitHub</a>.</p>
</div>
HTML;

// Bypass KSES so <style> tags in the content are preserved.
// wp_update_post() runs wp_filter_post_kses() which strips <style> for users
// without unfiltered_html (e.g. www-data running this script via CLI).
kses_remove_filters();
$result = wp_update_post( [
    'ID'           => 6605,
    'post_content' => $content,
    'post_status'  => 'publish',
] );
kses_init_filters();

if ( is_wp_error( $result ) ) {
    echo 'ERROR: ' . $result->get_error_message() . "\n";
} else {
    echo "Updated page ID: $result\n";
    echo "Done.\n";
}
