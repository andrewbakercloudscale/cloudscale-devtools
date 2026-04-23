<?php
/**
 * CSP (Content Security Policy) — header output, nonce injection, panel, AJAX.
 *
 * @package CloudScale_DevTools
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

class CSDT_CSP {

    private static ?string $csp_nonce = null;

    public static function output_security_headers(): void {
        if ( is_admin() ) { return; }
        if ( get_option( 'csdt_devtools_safe_headers_enabled', '0' ) === '1' ) {
            header( 'X-Content-Type-Options: nosniff' );
            header( 'X-Frame-Options: SAMEORIGIN' );
            header( 'Referrer-Policy: strict-origin-when-cross-origin' );
            header( 'Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()' );
        }
        if ( get_option( 'csdt_devtools_csp_enabled', '0' ) === '1' ) {
            $csp = self::build_csp_header();
            if ( $csp ) {
                $mode = get_option( 'csdt_devtools_csp_mode', 'enforce' );
                $hdr  = $mode === 'report_only' ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';
                $report_uri = $mode === 'report_only' ? '; report-uri ' . rest_url( 'csdt/v1/csp-report' ) : '';
                header( $hdr . ': ' . $csp . $report_uri );
            }
        }
    }

    private static function build_csp_header(): string {
        $services = json_decode( get_option( 'csdt_devtools_csp_services', '[]' ), true );
        if ( ! is_array( $services ) ) { $services = []; }
        $custom = trim( get_option( 'csdt_devtools_csp_custom', '' ) );

        $use_nonces  = get_option( 'csdt_csp_nonces_enabled', '0' ) === '1';
        $script_src  = $use_nonces
            ? [ "'self'", "'nonce-" . self::get_csp_nonce() . "'", "'strict-dynamic'" ]
            : [ "'self'", "'unsafe-inline'", "'unsafe-eval'" ];

        $d = [
            'default-src' => [ "'self'" ],
            'script-src'  => $script_src,
            'style-src'   => [ "'self'", "'unsafe-inline'" ],
            'img-src'     => [ "'self'", 'data:', 'https:' ],
            'font-src'    => [ "'self'", 'data:' ],
            'connect-src' => [ "'self'" ],
            'frame-src'   => [ "'self'" ],
            'object-src'  => [ "'none'" ],
            'base-uri'    => [ "'self'" ],
            'form-action' => [ "'self'" ],
        ];

        $map = [
            'google_analytics'    => [
                'script-src'  => [ 'https://www.googletagmanager.com', 'https://www.google-analytics.com' ],
                'img-src'     => [ 'https://www.google-analytics.com', 'https://www.googletagmanager.com' ],
                'connect-src' => [ 'https://www.google-analytics.com', 'https://analytics.google.com', 'https://stats.g.doubleclick.net', 'https://region1.google-analytics.com' ],
            ],
            'google_adsense'      => [
                'script-src'  => [ 'https://*.googlesyndication.com', 'https://*.googletagservices.com', 'https://*.googleadservices.com', 'https://adservice.google.com', 'https://fundingchoicesmessages.google.com' ],
                'frame-src'   => [ 'blob:', 'https://*.googlesyndication.com', 'https://*.safeframe.googlesyndication.com', 'https://googleads.g.doubleclick.net' ],
                'img-src'     => [ 'https://*.googlesyndication.com', 'https://googleads.g.doubleclick.net' ],
                'connect-src' => [ 'https://*.googlesyndication.com', 'https://*.googletagservices.com', 'https://adservice.google.com', 'https://ep1.adtrafficquality.google' ],
            ],
            'google_fonts'        => [
                'style-src'   => [ 'https://fonts.googleapis.com' ],
                'font-src'    => [ 'https://fonts.gstatic.com' ],
            ],
            'google_tag_manager'  => [
                'script-src'  => [ 'https://www.googletagmanager.com' ],
                'img-src'     => [ 'https://www.googletagmanager.com' ],
            ],
            'cloudflare_insights' => [
                'script-src'  => [ 'https://static.cloudflareinsights.com' ],
                'connect-src' => [ 'https://cloudflareinsights.com' ],
            ],
            'facebook_pixel'      => [
                'script-src'  => [ 'https://connect.facebook.net' ],
                'img-src'     => [ 'https://www.facebook.com' ],
                'connect-src' => [ 'https://www.facebook.com' ],
            ],
            'recaptcha'           => [
                'script-src'  => [ 'https://www.google.com', 'https://www.gstatic.com' ],
                'frame-src'   => [ 'https://www.google.com' ],
            ],
            'youtube'             => [
                'frame-src'   => [ 'https://www.youtube.com', 'https://www.youtube-nocookie.com' ],
            ],
            'vimeo'               => [
                'frame-src'   => [ 'https://player.vimeo.com' ],
            ],
        ];

        foreach ( $services as $svc ) {
            if ( ! isset( $map[ $svc ] ) ) { continue; }
            foreach ( $map[ $svc ] as $dir => $vals ) {
                foreach ( $vals as $v ) {
                    if ( ! in_array( $v, $d[ $dir ], true ) ) { $d[ $dir ][] = $v; }
                }
            }
        }

        $parts = [];
        foreach ( $d as $dir => $vals ) { $parts[] = $dir . ' ' . implode( ' ', $vals ); }
        if ( $custom ) { $parts[] = $custom; }
        return implode( '; ', $parts );
    }

    // ── CSP nonce helpers ─────────────────────────────────────────────────────

    public static function get_csp_nonce(): string {
        if ( self::$csp_nonce === null ) {
            self::$csp_nonce = bin2hex( random_bytes( 16 ) );
        }
        return self::$csp_nonce;
    }

    public static function csp_nonce_script_tag( string $tag ): string {
        $nonce = self::get_csp_nonce();
        // Inject nonce into every <script ...> opening tag that doesn't already have one
        return preg_replace( '/<script(?![^>]*\bnonce\b)/i', '<script nonce="' . esc_attr( $nonce ) . '"', $tag );
    }

    public static function csp_nonce_style_tag( string $tag ): string {
        $nonce = self::get_csp_nonce();
        return preg_replace( '/<link(?![^>]*\bnonce\b)/i', '<link nonce="' . esc_attr( $nonce ) . '"', $tag );
    }

    /** @param array<string,string> $attrs */
    public static function csp_nonce_inline_attrs( array $attrs ): array {
        $attrs['nonce'] = self::get_csp_nonce();
        return $attrs;
    }

    public static function csp_ob_start(): void {
        ob_start( [ __CLASS__, 'csp_ob_inject_nonces' ] );
    }

    /**
     * Output buffer callback: injects the page nonce into every <script> tag
     * that doesn't already have one. Catches AdSense, theme scripts, and any
     * other markup that bypasses wp_enqueue_scripts.
     */
    public static function csp_ob_inject_nonces( string $html ): string {
        $nonce = self::get_csp_nonce();
        if ( ! $nonce ) {
            return $html;
        }
        return preg_replace_callback(
            '/<script(?=[>\s])(?![^>]*\bnonce\s*=)([^>]*)>/i',
            static function ( array $m ) use ( $nonce ): string {
                return '<script nonce="' . esc_attr( $nonce ) . '"' . $m[1] . '>';
            },
            $html
        ) ?? $html;
    }


    public static function render_csp_panel(): void {
        $csp_on       = get_option( 'csdt_devtools_csp_enabled', '0' ) === '1';
        $csp_mode     = get_option( 'csdt_devtools_csp_mode', 'enforce' );
        $csp_services = json_decode( get_option( 'csdt_devtools_csp_services', '[]' ), true );
        if ( ! is_array( $csp_services ) ) { $csp_services = []; }
        $csp_custom   = get_option( 'csdt_devtools_csp_custom', '' );
        $csp_backup   = json_decode( get_option( 'csdt_devtools_csp_backup', '' ), true );
        $backup_time  = is_array( $csp_backup ) ? ( $csp_backup['saved_at'] ?? 0 ) : 0;
        $csp_history  = json_decode( get_option( 'csdt_csp_history', '[]' ), true );
        if ( ! is_array( $csp_history ) ) { $csp_history = []; }

        $services = [
            'google_analytics'    => 'Google Analytics (GA4 / gtag.js)',
            'google_adsense'      => 'Google AdSense',
            'google_tag_manager'  => 'Google Tag Manager',
            'google_fonts'        => 'Google Fonts',
            'cloudflare_insights' => 'Cloudflare Web Analytics',
            'facebook_pixel'      => 'Facebook Pixel',
            'recaptcha'           => 'Google reCAPTCHA',
            'youtube'             => 'YouTube embeds',
            'vimeo'               => 'Vimeo embeds',
        ];
        ?>
        <hr class="cs-sec-divider">
        <div class="cs-section-header" style="background:linear-gradient(90deg,#2e1065 0%,#3730a3 100%);border-left:3px solid #818cf8;margin-bottom:0;border-radius:6px 6px 0 0;">
            <span>🛡️ <?php esc_html_e( 'Content Security Policy (CSP)', 'cloudscale-devtools' ); ?></span>
            <span class="cs-header-hint"><?php esc_html_e( 'Block unauthorised scripts and resources. Select the services your site uses before enabling.', 'cloudscale-devtools' ); ?></span>
            <?php CloudScale_DevTools::render_explain_btn( 'csp', 'Content Security Policy (CSP)', [
                [ 'name' => 'How to set this up (start here)',  'rec' => 'Critical', 'html' => '<ol style="margin:0;padding-left:18px;line-height:2;"><li>Tick every third-party service your site uses (Google Analytics, AdSense, etc.).</li><li>Select <strong>Report-Only</strong> mode.</li><li>Tick <strong>Enable CSP</strong> and click <strong>Save CSP Settings</strong>.</li><li>Browse your site for a few minutes — visit your homepage, a post, and any page with ads or analytics.</li><li>Come back here and check the <strong>Violation Log</strong> that appears below. It will list anything that <em>would</em> have been blocked.</li><li>If the log shows violations for a service you use, tick that service\'s checkbox and save again. Repeat until the log is clean.</li><li>Once the log is empty (or only shows items you don\'t care about), switch to <strong>Enforce</strong> mode and save. Your CSP is now active.</li></ol><p style="margin:10px 0 0;padding:8px 12px;background:#fef9c3;border-radius:4px;font-size:13px;">⚠️ <strong>Never start in Enforce mode</strong> — you may accidentally block your own scripts and break the site.</p>' ],
                [ 'name' => 'What is a CSP?',               'rec' => 'Info',     'html' => 'A Content Security Policy is an HTTP header that tells the browser which origins are allowed to load scripts, styles, images, and other resources. If an attacker injects a malicious script into your page (XSS), a strong CSP stops the browser from running it. Without a CSP, any injected script executes freely.' ],
                [ 'name' => 'Report-Only vs Enforce',       'rec' => 'Info',     'html' => '<strong>Report-Only</strong> — the browser loads everything normally but logs what <em>would</em> have been blocked. The Violation Log below captures these reports automatically. Safe to enable immediately.<br><br><strong>Enforce</strong> — the browser actively blocks anything not on the allowlist. Switch to this only after the Violation Log is clean.' ],
                [ 'name' => 'Third-Party Services',         'rec' => 'Info',     'html' => 'Each checkbox adds that service\'s domains to the CSP allowlist. <strong>Only tick services you actually use.</strong> In Enforce mode, any unticked service will be blocked — Google Analytics stops recording, AdSense ads disappear, Cloudflare scripts fail silently. If you\'re unsure whether you use something, leave it unticked and check the Violation Log.' ],
                [ 'name' => 'Violation Log',                'rec' => 'Info',     'html' => 'Visible when Report-Only is active. Shows exactly what the browser would block: the blocked resource URL, which CSP directive triggered, and which page of your site caused it. Use this to identify missing services before switching to Enforce. Auto-refreshes every 30 seconds. Click <strong>Clear Log</strong> to reset between test sessions.' ],
                [ 'name' => 'What if Enforce breaks my site?', 'rec' => 'Info',  'html' => 'Click <strong>Rollback to previous settings</strong> — it appears next to Save after every save. This instantly restores your previous configuration. You can also switch back to Report-Only at any time without any side effects.' ],
                [ 'name' => 'Additional Directives',        'rec' => 'Optional', 'html' => 'Advanced — leave blank unless you need it. Appended verbatim to the generated CSP. Common examples: <code>upgrade-insecure-requests</code> (force HTTP sub-resources to load over HTTPS) or <code>block-all-mixed-content</code> (block HTTP content on HTTPS pages).' ],
                [ 'name' => '\'unsafe-inline\' in the AI report', 'rec' => 'Info', 'html' => 'If the AI Cyber Audit flags <code>\'unsafe-inline\'</code>, it\'s because services like Google Analytics and AdSense inject inline scripts that require it. This is a known trade-off — having any CSP is significantly better than none, even with <code>\'unsafe-inline\'</code> present. You can safely ignore this finding if you use those services.' ],
            ],
            'Protects your site against XSS attacks by telling the browser which scripts, styles, and resources are allowed to load. Always start in Report-Only mode to check nothing breaks before switching to Enforce.' ); ?>
        </div>
        <div style="padding:20px;background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 6px 6px;margin-bottom:0;" id="cs-csp-panel">

            <!-- Quick-start guide — hidden once CSP is enabled -->
            <?php if ( ! $csp_on ) : ?>
            <div id="cs-csp-quickstart" style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:14px 16px;margin-bottom:16px;">
                <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#0369a1;">⚡ Quick setup — do these steps in order:</p>
                <ol style="margin:0;padding-left:20px;font-size:13px;color:#374151;line-height:1.9;">
                    <li>Tick every service your site uses below (Google Analytics, AdSense, etc.)</li>
                    <li>Select <strong>Report-Only</strong> <em>(not Enforce)</em></li>
                    <li>Tick <strong>Enable CSP</strong> → click <strong>Save CSP Settings</strong></li>
                    <li>Browse your site for a few minutes, then come back and check the <strong>Violation Log</strong></li>
                    <li>Once the log is clean, switch to <strong>Enforce</strong> and save again</li>
                </ol>
            </div>
            <?php endif; ?>

            <!-- Enable + Mode -->
            <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;padding:0 2px 14px;border-bottom:1px solid #f1f5f9;margin-bottom:14px;">
                <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;cursor:pointer;">
                    <input type="checkbox" id="cs-csp-enabled" <?php checked( $csp_on ); ?>>
                    <?php esc_html_e( 'Enable CSP', 'cloudscale-devtools' ); ?>
                </label>
                <label style="display:flex;align-items:center;gap:6px;font-size:13px;">
                    <input type="radio" name="cs-csp-mode" value="enforce" <?php checked( $csp_mode, 'enforce' ); ?>>
                    <?php esc_html_e( 'Enforce', 'cloudscale-devtools' ); ?>
                </label>
                <label style="display:flex;align-items:center;gap:6px;font-size:13px;">
                    <input type="radio" name="cs-csp-mode" value="report_only" <?php checked( $csp_mode, 'report_only' ); ?>>
                    <?php esc_html_e( 'Report-Only (test mode)', 'cloudscale-devtools' ); ?>
                </label>
            </div>

            <!-- Service checkboxes -->
            <div style="margin-bottom:14px;">
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:10px;"><?php esc_html_e( 'Third-party services used on this site', 'cloudscale-devtools' ); ?></div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:6px;">
                    <?php foreach ( $services as $key => $label ) : ?>
                    <label style="display:flex;align-items:center;gap:8px;font-size:13px;padding:7px 10px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:6px;cursor:pointer;">
                        <input type="checkbox" class="cs-csp-service" value="<?php echo esc_attr( $key ); ?>" <?php checked( in_array( $key, $csp_services, true ) ); ?>>
                        <?php echo esc_html( $label ); ?>
                    </label>
                    <?php endforeach; ?>
                </div>
            </div>

            <!-- Custom directives -->
            <div style="margin-bottom:14px;">
                <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;"><?php esc_html_e( 'Additional directives (appended verbatim)', 'cloudscale-devtools' ); ?></label>
                <input type="text" id="cs-csp-custom" class="cs-text-input" style="width:100%;font-family:monospace;font-size:12px;"
                       placeholder="upgrade-insecure-requests; block-all-mixed-content"
                       value="<?php echo esc_attr( $csp_custom ); ?>">
            </div>

            <!-- Live preview -->
            <div style="margin-bottom:14px;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;"><?php esc_html_e( 'Preview', 'cloudscale-devtools' ); ?></div>
                    <button type="button" id="cs-csp-copy-btn" style="background:none;border:1px solid #334155;color:#94a3b8;font-size:11px;font-weight:600;padding:3px 10px;border-radius:4px;cursor:pointer;">📋 Copy</button>
                </div>
                <pre id="cs-csp-preview" style="background:#0f172a;color:#e2e8f0;padding:12px;border-radius:6px;font-size:11px;white-space:pre-wrap;word-break:break-all;margin:0;max-height:140px;overflow-y:auto;"></pre>
            </div>

            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                <button type="button" id="cs-csp-save-btn" class="cs-btn-primary cs-btn-sm"><?php esc_html_e( 'Save Settings', 'cloudscale-devtools' ); ?></button>
                <?php if ( $backup_time ) : ?>
                <button type="button" id="cs-csp-rollback-btn" class="cs-btn-secondary cs-btn-sm" style="border-color:#f87171;color:#dc2626;">
                    ↩ <?php esc_html_e( 'Rollback to previous settings', 'cloudscale-devtools' ); ?>
                    <span style="font-weight:400;font-size:11px;opacity:.8;">(<?php echo esc_html( human_time_diff( $backup_time ) . ' ' . __( 'ago', 'cloudscale-devtools' ) ); ?>)</span>
                </button>
                <?php endif; ?>
                <span id="cs-csp-saved"    style="display:none;color:#16a34a;font-size:13px;font-weight:600;">✓ <?php esc_html_e( 'Saved', 'cloudscale-devtools' ); ?></span>
                <span id="cs-csp-rolledback" style="display:none;color:#d97706;font-size:13px;font-weight:600;">↩ <?php esc_html_e( 'Rolled back', 'cloudscale-devtools' ); ?></span>
            </div>

            <?php if ( ! empty( $csp_history ) ) : ?>
            <div id="cs-csp-history-wrap" style="margin-top:18px;">
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:8px;"><?php echo esc_html( sprintf( __( 'Change History (%d saves)', 'cloudscale-devtools' ), count( $csp_history ) ) ); ?></div>
                <div style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
                <?php foreach ( $csp_history as $idx => $entry ) :
                    $ts    = $entry['saved_at'] ?? 0;
                    $label = esc_html( $entry['label'] ?? 'Settings saved' );
                    $age   = $ts ? esc_html( human_time_diff( $ts ) . ' ago' ) : '';
                    $bg    = $idx % 2 === 0 ? '#fff' : '#f8fafc';
                ?>
                    <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:<?php echo esc_attr( $bg ); ?>;<?php echo $idx > 0 ? 'border-top:1px solid #e2e8f0;' : ''; ?>">
                        <span style="color:#94a3b8;font-size:11px;white-space:nowrap;min-width:95px;"><?php echo $age; ?></span>
                        <span style="flex:1;font-size:12px;color:#334155;"><?php echo $label; ?></span>
                        <button type="button" class="cs-csp-restore-btn" data-index="<?php echo (int) $idx; ?>"
                                style="background:none;border:1px solid #94a3b8;color:#475569;font-size:11px;font-weight:600;padding:3px 10px;border-radius:4px;cursor:pointer;white-space:nowrap;">↩ Restore</button>
                    </div>
                <?php endforeach; ?>
                </div>
                <div id="cs-csp-restore-msg" style="display:none;margin-top:6px;font-size:12px;font-weight:600;color:#d97706;"></div>
            </div>
            <?php endif; ?>

            <!-- Violation log — only visible in report-only mode -->
            <div id="cs-csp-violation-wrap" style="<?php echo $csp_on && $csp_mode === 'report_only' ? '' : 'display:none;'; ?>margin-top:20px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                    <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;"><?php esc_html_e( 'Violation Log', 'cloudscale-devtools' ); ?></span>
                    <span id="cs-csp-viol-count" style="background:#6366f1;color:#fff;font-size:11px;font-weight:700;padding:1px 7px;border-radius:10px;display:none;">0</span>
                    <button type="button" id="cs-csp-viol-refresh" class="cs-btn-secondary cs-btn-sm" style="margin-left:auto;">↻ <?php esc_html_e( 'Refresh', 'cloudscale-devtools' ); ?></button>
                    <button type="button" id="cs-csp-viol-clear" class="cs-btn-secondary cs-btn-sm" style="border-color:#f87171;color:#dc2626;"><?php esc_html_e( 'Clear Log', 'cloudscale-devtools' ); ?></button>
                </div>
                <div id="cs-csp-viol-table" style="font-size:12px;"></div>
                <p style="font-size:11px;color:#94a3b8;margin:6px 0 0;">
                    <?php esc_html_e( 'The browser reports what would be blocked if CSP were in Enforce mode. Browse your site normally to populate this log, then review before switching to Enforce.', 'cloudscale-devtools' ); ?>
                </p>
            </div>

            <!-- Header security scan -->
            <div style="margin-top:20px;padding-top:16px;border-top:1px solid #e2e8f0;">
                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px;">
                    <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;">🔍 <?php esc_html_e( 'Header Security Scan', 'cloudscale-devtools' ); ?></span>
                    <button type="button" id="cs-csp-scan-btn" class="cs-btn-secondary cs-btn-sm"><?php esc_html_e( 'Scan Headers Now', 'cloudscale-devtools' ); ?></button>
                    <span id="cs-csp-scan-spinner" style="display:none;font-size:12px;color:#64748b;"><?php esc_html_e( 'Scanning…', 'cloudscale-devtools' ); ?></span>
                </div>
                <p style="font-size:11px;color:#94a3b8;margin:0 0 8px;"><?php esc_html_e( 'Checks the homepage and last 10 published posts/pages for duplicate CSP headers, missing security headers, and plugin conflicts.', 'cloudscale-devtools' ); ?></p>
                <div id="cs-csp-scan-results" style="font-size:12px;"></div>
            </div>
        </div>

        <script>
        (function(){
            var base = {
                'default-src': ["'self'"],
                'script-src':  ["'self'","'unsafe-inline'"],
                'style-src':   ["'self'","'unsafe-inline'"],
                'img-src':     ["'self'","data:","https:"],
                'font-src':    ["'self'","data:"],
                'connect-src': ["'self'"],
                'frame-src':   ["'self'"],
                'object-src':  ["'none'"],
                'base-uri':    ["'self'"],
                'form-action': ["'self'"]
            };
            var serviceMap = {
                google_analytics:    { 'script-src':['https://www.googletagmanager.com','https://www.google-analytics.com'], 'img-src':['https://www.google-analytics.com','https://www.googletagmanager.com'], 'connect-src':['https://www.google-analytics.com','https://analytics.google.com','https://stats.g.doubleclick.net','https://region1.google-analytics.com'] },
                google_adsense:      { 'script-src':['https://*.googlesyndication.com','https://*.googletagservices.com','https://*.googleadservices.com','https://adservice.google.com','https://fundingchoicesmessages.google.com'], 'frame-src':['blob:','https://*.googlesyndication.com','https://*.safeframe.googlesyndication.com','https://googleads.g.doubleclick.net'], 'img-src':['https://*.googlesyndication.com','https://googleads.g.doubleclick.net'], 'connect-src':['https://*.googlesyndication.com','https://*.googletagservices.com','https://adservice.google.com','https://ep1.adtrafficquality.google'] },
                google_tag_manager:  { 'script-src':['https://www.googletagmanager.com'], 'img-src':['https://www.googletagmanager.com'] },
                google_fonts:        { 'style-src':['https://fonts.googleapis.com'], 'font-src':['https://fonts.gstatic.com'] },
                cloudflare_insights: { 'script-src':['https://static.cloudflareinsights.com'], 'connect-src':['https://cloudflareinsights.com'] },
                facebook_pixel:      { 'script-src':['https://connect.facebook.net'], 'img-src':['https://www.facebook.com'], 'connect-src':['https://www.facebook.com'] },
                recaptcha:           { 'script-src':['https://www.google.com','https://www.gstatic.com'], 'frame-src':['https://www.google.com'] },
                youtube:             { 'frame-src':['https://www.youtube.com','https://www.youtube-nocookie.com'] },
                vimeo:               { 'frame-src':['https://player.vimeo.com'] }
            };

            function buildPreview() {
                var d = JSON.parse(JSON.stringify(base));
                document.querySelectorAll('.cs-csp-service:checked').forEach(function(cb){
                    var svc = serviceMap[cb.value];
                    if (!svc) return;
                    Object.keys(svc).forEach(function(dir){
                        svc[dir].forEach(function(v){ if (d[dir].indexOf(v) === -1) d[dir].push(v); });
                    });
                });
                var parts = Object.keys(d).map(function(k){ return k + ' ' + d[k].join(' '); });
                var custom = document.getElementById('cs-csp-custom');
                if (custom && custom.value.trim()) parts.push(custom.value.trim());
                document.getElementById('cs-csp-preview').textContent = parts.join(';\n');
            }

            document.querySelectorAll('.cs-csp-service').forEach(function(cb){ cb.addEventListener('change', buildPreview); });
            var customIn = document.getElementById('cs-csp-custom');
            if (customIn) customIn.addEventListener('input', buildPreview);
            buildPreview();

            var copyBtn = document.getElementById('cs-csp-copy-btn');
            if (copyBtn) {
                copyBtn.addEventListener('click', function(){
                    var text = document.getElementById('cs-csp-preview').textContent;
                    navigator.clipboard.writeText(text).then(function(){
                        copyBtn.textContent = '✅ Copied';
                        setTimeout(function(){ copyBtn.textContent = '📋 Copy'; }, 2000);
                    });
                });
            }

            var saveBtn  = document.getElementById('cs-csp-save-btn');
            var savedMsg = document.getElementById('cs-csp-saved');
            if (saveBtn) {
                saveBtn.addEventListener('click', function(){
                    saveBtn.disabled = true;
                    var services = [];
                    document.querySelectorAll('.cs-csp-service:checked').forEach(function(cb){ services.push(cb.value); });
                    var modeEl = document.querySelector('input[name="cs-csp-mode"]:checked');
                    var fd = new FormData();
                    fd.append('action',   'csdt_devtools_csp_save');
                    fd.append('nonce',    csdtVulnScan.nonce);
                    fd.append('enabled',      document.getElementById('cs-csp-enabled').checked ? '1' : '0');
                    fd.append('mode',         modeEl ? modeEl.value : 'enforce');
                    fd.append('services',     JSON.stringify(services));
                    fd.append('custom',       customIn ? customIn.value.trim() : '');
                    var dbgCb = document.getElementById('cs-csp-debug-panel');
                    fd.append('debug_panel',  dbgCb && dbgCb.checked ? '1' : '0');
                    fetch(csdtVulnScan.ajaxUrl, { method:'POST', body:fd })
                        .then(function(r){ return r.json(); })
                        .then(function(resp){
                        saveBtn.disabled = false;
                        if (savedMsg) { savedMsg.style.display = 'inline'; setTimeout(function(){ savedMsg.style.display = 'none'; }, 2500); }
                        // Create or update rollback button with fresh timestamp.
                        if (resp && resp.data && resp.data.has_backup) {
                            var rb = document.getElementById('cs-csp-rollback-btn');
                            if (!rb) {
                                rb = document.createElement('button');
                                rb.id = 'cs-csp-rollback-btn';
                                rb.type = 'button';
                                rb.className = 'cs-btn-secondary cs-btn-sm';
                                rb.style.cssText = 'border-color:#f87171;color:#dc2626;';
                                saveBtn.parentNode.insertBefore(rb, saveBtn.nextSibling);
                                wireRollback(rb);
                            }
                            rb.innerHTML = '↩ <?php echo esc_js( __( 'Rollback to previous settings', 'cloudscale-devtools' ) ); ?> <span style="font-weight:400;font-size:11px;opacity:.8;">(just now)</span>';
                        }
                    })
                    .catch(function(){ saveBtn.disabled = false; });
                });
            }

            function wireRollback(btn) {
                if (!btn) return;
                btn.addEventListener('click', function(){
                    if (!confirm('Restore the previous CSP settings? This will overwrite the current configuration.')) { return; }
                    btn.disabled = true;
                    var fd = new FormData();
                    fd.append('action', 'csdt_devtools_csp_rollback');
                    fd.append('nonce',  csdtVulnScan.nonce);
                    fetch(csdtVulnScan.ajaxUrl, { method:'POST', body:fd })
                        .then(function(r){ return r.json(); })
                        .then(function(resp){
                            if (!resp.success) { alert('Rollback failed: ' + (resp.data || 'unknown error')); btn.disabled = false; return; }
                            var d = resp.data;
                            // Restore UI state.
                            var en = document.getElementById('cs-csp-enabled');
                            if (en) en.checked = d.enabled === '1';
                            var modeEl = document.querySelector('input[name="cs-csp-mode"][value="' + (d.mode || 'enforce') + '"]');
                            if (modeEl) modeEl.checked = true;
                            document.querySelectorAll('.cs-csp-service').forEach(function(cb){
                                cb.checked = Array.isArray(d.services) && d.services.indexOf(cb.value) !== -1;
                            });
                            if (customIn) customIn.value = d.custom || '';
                            buildPreview();
                            btn.remove();
                            var rb2 = document.getElementById('cs-csp-rolledback');
                            if (rb2) { rb2.style.display = 'inline'; setTimeout(function(){ rb2.style.display = 'none'; }, 3000); }
                        })
                        .catch(function(){ btn.disabled = false; });
                });
            }
            wireRollback(document.getElementById('cs-csp-rollback-btn'));

            // ── Change history restore ────────────────────────────────────
            document.querySelectorAll('.cs-csp-restore-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var idx = btn.getAttribute('data-index');
                    if (!confirm('Restore this CSP configuration? The current settings will be pushed to history first.')) { return; }
                    btn.disabled = true; btn.textContent = '⏳';
                    var fd = new FormData();
                    fd.append('action', 'csdt_devtools_csp_restore');
                    fd.append('nonce',  csdtVulnScan.nonce);
                    fd.append('index',  idx);
                    fetch(csdtVulnScan.ajaxUrl, { method:'POST', body:fd })
                        .then(function(r){ return r.json(); })
                        .then(function(resp) {
                            if (!resp.success) { alert('Restore failed: ' + (resp.data || 'unknown error')); btn.disabled = false; btn.textContent = '↩ Restore'; return; }
                            var d = resp.data;
                            var en = document.getElementById('cs-csp-enabled');
                            if (en) en.checked = d.enabled === '1';
                            var modeEl = document.querySelector('input[name="cs-csp-mode"][value="' + (d.mode || 'enforce') + '"]');
                            if (modeEl) modeEl.checked = true;
                            document.querySelectorAll('.cs-csp-service').forEach(function(cb) {
                                cb.checked = Array.isArray(d.services) && d.services.indexOf(cb.value) !== -1;
                            });
                            if (customIn) customIn.value = d.custom || '';
                            buildPreview();
                            var msg = document.getElementById('cs-csp-restore-msg');
                            if (msg) { msg.style.display = 'block'; msg.textContent = '↩ Restored — click Save CSP Settings to apply.'; }
                            btn.textContent = '✅ Restored';
                        })
                        .catch(function() { btn.disabled = false; btn.textContent = '↩ Restore'; });
                });
            });

            // ── Violation log ────────────────────────────────────────────
            var violWrap    = document.getElementById('cs-csp-violation-wrap');
            var violTable   = document.getElementById('cs-csp-viol-table');
            var violCount   = document.getElementById('cs-csp-viol-count');
            var violRefresh = document.getElementById('cs-csp-viol-refresh');
            var violClear   = document.getElementById('cs-csp-viol-clear');

            function renderViolations(rows) {
                if (!violTable) return;
                if (!rows || !rows.length) {
                    violTable.innerHTML = '<p style="color:#94a3b8;font-size:12px;margin:0;">No violations recorded yet. Browse your site with Report-Only enabled to capture them.</p>';
                    if (violCount) violCount.style.display = 'none';
                    return;
                }
                if (violCount) { violCount.textContent = rows.length; violCount.style.display = 'inline'; }
                var html = '<table style="width:100%;border-collapse:collapse;font-size:12px;">' +
                    '<thead><tr style="background:#f1f5f9;">' +
                    '<th style="padding:6px 8px;text-align:left;font-weight:600;color:#374151;border-bottom:1px solid #e2e8f0;">Time</th>' +
                    '<th style="padding:6px 8px;text-align:left;font-weight:600;color:#374151;border-bottom:1px solid #e2e8f0;">Blocked</th>' +
                    '<th style="padding:6px 8px;text-align:left;font-weight:600;color:#374151;border-bottom:1px solid #e2e8f0;">Directive</th>' +
                    '<th style="padding:6px 8px;text-align:left;font-weight:600;color:#374151;border-bottom:1px solid #e2e8f0;">Source</th>' +
                    '<th style="padding:6px 8px;text-align:left;font-weight:600;color:#374151;border-bottom:1px solid #e2e8f0;">Page</th>' +
                    '</tr></thead><tbody>';
                rows.forEach(function(r, i) {
                    var d = new Date(r.time * 1000);
                    var t = d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) + ' ' + d.toLocaleDateString([], {month:'short',day:'numeric'});
                    var bg = i % 2 === 0 ? '#fff' : '#f8fafc';
                    var blocked = r.blocked || '—';
                    var isEval   = blocked === 'eval' || blocked === 'inline';
                    var blockedColor = isEval ? '#dc2626' : '#0f172a';
                    var blockedDisplay = blocked.length > 50 ? blocked.slice(0, 47) + '…' : blocked;
                    var srcFile = r.source ? r.source.replace(/^https?:\/\/[^/]+\//, '') : '';
                    if (srcFile.length > 45) srcFile = '…' + srcFile.slice(-42);
                    var srcDisplay = srcFile ? srcFile + (r.line ? ':' + r.line : '') : '—';
                    var pageDisplay = (r.page || '—').replace(/^https?:\/\/[^/]+/, '');
                    if (pageDisplay.length > 35) pageDisplay = pageDisplay.slice(0, 32) + '…';
                    html += '<tr style="background:' + bg + ';border-bottom:1px solid #f1f5f9;">' +
                        '<td style="padding:5px 8px;white-space:nowrap;color:#64748b;">' + t + '</td>' +
                        '<td style="padding:5px 8px;font-family:monospace;color:' + blockedColor + ';" title="' + blocked.replace(/"/g,'&quot;') + '">' + blockedDisplay + '</td>' +
                        '<td style="padding:5px 8px;font-family:monospace;color:#6366f1;">' + (r.directive || '—') + '</td>' +
                        '<td style="padding:5px 8px;font-family:monospace;font-size:11px;color:#0369a1;" title="' + (r.source||'').replace(/"/g,'&quot;') + (r.line?':'+r.line:'') + '">' + srcDisplay + '</td>' +
                        '<td style="padding:5px 8px;color:#64748b;" title="' + (r.page||'').replace(/"/g,'&quot;') + '">' + pageDisplay + '</td>' +
                        '</tr>';
                });
                html += '</tbody></table>';
                violTable.innerHTML = html;
            }

            function fetchViolations() {
                var fd = new FormData();
                fd.append('action', 'csdt_devtools_csp_violations_get');
                fd.append('nonce',  csdtVulnScan.nonce);
                fetch(csdtVulnScan.ajaxUrl, { method:'POST', body:fd })
                    .then(function(r){ return r.json(); })
                    .then(function(resp){ if (resp && resp.success) renderViolations(resp.data); })
                    .catch(function(){});
            }

            // Show/hide violation wrap when mode changes
            document.querySelectorAll('input[name="cs-csp-mode"]').forEach(function(radio) {
                radio.addEventListener('change', function() {
                    if (!violWrap) return;
                    var enabled = document.getElementById('cs-csp-enabled');
                    violWrap.style.display = (this.value === 'report_only' && enabled && enabled.checked) ? '' : 'none';
                    if (this.value === 'report_only') fetchViolations();
                });
            });
            var cspEnabledCb = document.getElementById('cs-csp-enabled');
            if (cspEnabledCb) {
                cspEnabledCb.addEventListener('change', function() {
                    if (!violWrap) return;
                    var modeEl = document.querySelector('input[name="cs-csp-mode"]:checked');
                    violWrap.style.display = (this.checked && modeEl && modeEl.value === 'report_only') ? '' : 'none';
                });
            }

            if (violRefresh) violRefresh.addEventListener('click', fetchViolations);

            if (violClear) {
                violClear.addEventListener('click', function() {
                    var fd = new FormData();
                    fd.append('action', 'csdt_devtools_csp_violations_clear');
                    fd.append('nonce',  csdtVulnScan.nonce);
                    fetch(csdtVulnScan.ajaxUrl, { method:'POST', body:fd })
                        .then(function(){ renderViolations([]); })
                        .catch(function(){});
                });
            }

            // Auto-load if already in report-only mode
            if (violWrap && violWrap.style.display !== 'none') fetchViolations();

            // Auto-refresh every 30 s when panel is visible
            setInterval(function() {
                if (violWrap && violWrap.style.display !== 'none') fetchViolations();
            }, 30000);

            // ── Header security scan ──────────────────────────────────────
            var scanBtn     = document.getElementById('cs-csp-scan-btn');
            var scanResults = document.getElementById('cs-csp-scan-results');
            var scanSpinner = document.getElementById('cs-csp-scan-spinner');

            var SEC_KEYS = ['content-security-policy','content-security-policy-report-only','strict-transport-security','x-frame-options','x-content-type-options','referrer-policy','permissions-policy'];
            var SEC_LABELS = {'content-security-policy':'Content-Security-Policy','content-security-policy-report-only':'CSP-Report-Only','strict-transport-security':'Strict-Transport-Security','x-frame-options':'X-Frame-Options','x-content-type-options':'X-Content-Type-Options','referrer-policy':'Referrer-Policy','permissions-policy':'Permissions-Policy'};
            var GRADE_COLORS = {'A+':'#15803d','A':'#16a34a','B':'#1d4ed8','C':'#b45309','D':'#c2410c','F':'#991b1b'};

            function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

            function secBox(title, content) {
                return '<div style="border:1px solid #d1d5db;border-radius:6px;overflow:hidden;margin-bottom:12px;">' +
                    '<div style="background:#e8edf5;padding:9px 14px;border-bottom:1px solid #d1d5db;">' +
                    '<strong style="font-size:13px;color:#1e293b;">' + title + '</strong></div>' +
                    '<div style="padding:14px 16px;">' + content + '</div></div>';
            }

            function renderScanResults(data) {
                if (!scanResults) return;
                var home = data && data.home;
                if (!home) { scanResults.innerHTML = '<p style="color:#94a3b8;font-size:12px;">No data returned.</p>'; return; }

                var html = '';

                // ── 1. Security Report Summary ───────────────────────────────
                if (home.error) {
                    html += secBox('Security Report Summary', '<p style="color:#dc2626;font-size:12px;margin:0;">Error: ' + esc(home.error) + '</p>');
                } else {
                    var grade = home.grade || '?';
                    var gc    = GRADE_COLORS[grade] || '#64748b';
                    var sec   = home.sec || {};
                    var now   = new Date();
                    var ts    = now.toISOString().replace('T',' ').slice(0,19) + ' UTC';

                    // Build header pills
                    var pills = '';
                    SEC_KEYS.forEach(function(k) {
                        var s = sec[k] ? sec[k].status : 'missing';
                        var lbl = SEC_LABELS[k] || k;
                        // CSP-Report-Only is optional/informational — only show when present
                        if (k === 'content-security-policy-report-only' && s === 'missing') return;
                        if (s === 'present') {
                            pills += '<span style="display:inline-flex;align-items:center;gap:4px;background:#15803d;color:#fff;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:600;margin:2px 3px 2px 0;white-space:nowrap;">✓ ' + lbl + '</span>';
                        } else if (s === 'duplicate') {
                            pills += '<span style="display:inline-flex;align-items:center;gap:4px;background:#d97706;color:#fff;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:600;margin:2px 3px 2px 0;white-space:nowrap;">⚠ ' + lbl + '</span>';
                        } else {
                            pills += '<span style="display:inline-flex;align-items:center;gap:4px;background:#dc2626;color:#fff;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:600;margin:2px 3px 2px 0;white-space:nowrap;">✗ ' + lbl + '</span>';
                        }
                    });

                    var warnSummary = '';
                    if (home.warnings && home.warnings.length) {
                        warnSummary = 'Grade capped at ' + grade + ', please see warnings below.';
                    }

                    var summaryInner =
                        '<div style="display:flex;gap:16px;align-items:flex-start;">' +
                        '<div style="width:80px;height:80px;min-width:80px;background:' + gc + ';border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
                        '<span style="color:#fff;font-size:44px;font-weight:900;line-height:1;">' + grade + '</span></div>' +
                        '<table style="flex:1;font-size:12px;border-collapse:collapse;width:100%;">' +
                        '<tr><td style="padding:4px 8px 4px 0;font-weight:700;white-space:nowrap;vertical-align:top;color:#374151;width:110px;">Site:</td>' +
                        '<td style="padding:4px 0;color:#374151;"><a href="' + esc(home.url) + '" target="_blank" rel="noopener" style="color:#2563eb;">' + esc(home.url) + '</a></td></tr>';
                    if (home.ip) {
                        summaryInner += '<tr><td style="padding:4px 8px 4px 0;font-weight:700;white-space:nowrap;vertical-align:top;color:#374151;">IP Address:</td>' +
                            '<td style="padding:4px 0;color:#374151;">' + esc(home.ip) + '</td></tr>';
                    }
                    summaryInner +=
                        '<tr><td style="padding:4px 8px 4px 0;font-weight:700;white-space:nowrap;vertical-align:top;color:#374151;">Report Time:</td>' +
                        '<td style="padding:4px 0;color:#374151;">' + ts + '</td></tr>' +
                        '<tr><td style="padding:4px 8px 4px 0;font-weight:700;white-space:nowrap;vertical-align:top;color:#374151;">Headers:</td>' +
                        '<td style="padding:4px 0;line-height:1.8;">' + pills + '</td></tr>';
                    if (warnSummary) {
                        summaryInner += '<tr><td style="padding:4px 8px 4px 0;font-weight:700;white-space:nowrap;vertical-align:top;color:#374151;">Warning:</td>' +
                            '<td style="padding:4px 0;color:#374151;">' + esc(warnSummary) + '</td></tr>';
                    }
                    summaryInner += '</table></div>';
                    html += secBox('Security Report Summary', summaryInner);

                    // ── 2. Warnings ──────────────────────────────────────────
                    if (home.warnings && home.warnings.length) {
                        var warnRows = '';
                        home.warnings.forEach(function(w) {
                            warnRows += '<tr style="border-bottom:1px solid #f1f5f9;">' +
                                '<td style="padding:10px 12px 10px 0;font-weight:700;color:#b45309;white-space:nowrap;vertical-align:top;width:220px;font-size:12px;">' + esc(w.header) + '</td>' +
                                '<td style="padding:10px 0;color:#374151;font-size:12px;">' + esc(w.msg) + '</td></tr>';
                        });
                        html += secBox('Warnings', '<table style="width:100%;border-collapse:collapse;">' + warnRows + '</table>');
                    }

                    // ── 3. Raw Headers ───────────────────────────────────────
                    if (home.all_headers) {
                        var rawRows = '';
                        Object.keys(home.all_headers).forEach(function(hk) {
                            var val = home.all_headers[hk];
                            var isSec = SEC_KEYS.indexOf(hk) !== -1;
                            var valStr = Array.isArray(val) ? val.join(', ') : String(val || '');
                            rawRows += '<tr style="border-bottom:1px solid #f1f5f9;">' +
                                '<td style="padding:7px 12px 7px 0;font-weight:700;white-space:nowrap;vertical-align:top;font-size:12px;width:200px;' + (isSec ? 'color:#15803d;' : 'color:#374151;') + '">' + esc(hk) + '</td>' +
                                '<td style="padding:7px 0;font-size:12px;' + (isSec ? 'font-weight:600;color:#1e293b;' : 'color:#374151;') + 'word-break:break-all;">' + esc(valStr) + '</td></tr>';
                        });
                        html += secBox('Raw Headers', '<table style="width:100%;border-collapse:collapse;">' + rawRows + '</table>');
                    }
                }

                // ── 4. Other pages compact table ─────────────────────────────
                if (data.pages && data.pages.length) {
                    var PAGE_COLS = ['content-security-policy','strict-transport-security','x-frame-options','x-content-type-options'];
                    var pageRows = '<tr style="background:#f8fafc;">' +
                        '<th style="padding:5px 8px;text-align:left;font-weight:600;color:#374151;border-bottom:1px solid #e2e8f0;font-size:11px;">Page</th>';
                    PAGE_COLS.forEach(function(k) { pageRows += '<th style="padding:5px 6px;text-align:center;font-weight:600;color:#374151;border-bottom:1px solid #e2e8f0;font-size:10px;white-space:nowrap;">' + SEC_LABELS[k] + '</th>'; });
                    pageRows += '</tr>';
                    data.pages.forEach(function(row, i) {
                        var bg = i % 2 ? '#f8fafc' : '#fff';
                        if (row.error) { pageRows += '<tr style="background:' + bg + '"><td colspan="5" style="padding:5px 8px;color:#dc2626;font-size:11px;">' + esc(row.url) + ' — ' + esc(row.error) + '</td></tr>'; return; }
                        var slug = (row.url.replace(/^https?:\/\/[^/]+/,'') || '/');
                        if (slug.length > 50) slug = slug.slice(0,47) + '…';
                        pageRows += '<tr style="background:' + bg + ';border-bottom:1px solid #f1f5f9;"><td style="padding:5px 8px;font-size:11px;color:#374151;" title="' + esc(row.url) + '">' + esc(slug) + '</td>';
                        PAGE_COLS.forEach(function(k) {
                            var s = row.sec && row.sec[k] ? row.sec[k].status : 'missing';
                            var cell = s === 'present' ? '<span style="color:#16a34a;font-weight:700;">✓</span>'
                                     : s === 'duplicate' ? '<span style="color:#d97706;font-weight:700;">⚠</span>'
                                     : '<span style="color:#dc2626;font-weight:700;">✗</span>';
                            pageRows += '<td style="text-align:center;padding:5px 4px;">' + cell + '</td>';
                        });
                        pageRows += '</tr>';
                    });
                    html += secBox('Last 10 Pages', '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;">' + pageRows + '</table></div>');
                }

                scanResults.innerHTML = html;
            }

            if (scanBtn) {
                scanBtn.addEventListener('click', function() {
                    scanBtn.disabled = true;
                    if (scanSpinner) scanSpinner.style.display = 'inline';
                    if (scanResults) scanResults.innerHTML = '';
                    var fd = new FormData();
                    fd.append('action', 'csdt_scan_headers');
                    fd.append('nonce',  csdtVulnScan.nonce);
                    fetch(csdtVulnScan.ajaxUrl, { method:'POST', body:fd })
                        .then(function(r){ return r.json(); })
                        .then(function(resp) {
                            scanBtn.disabled = false;
                            if (scanSpinner) scanSpinner.style.display = 'none';
                            if (resp && resp.success) renderScanResults(resp.data);
                            else if (scanResults) scanResults.innerHTML = '<p style="color:#dc2626;font-size:12px;">Scan failed: ' + (resp && resp.data ? esc(resp.data) : 'unknown error') + '</p>';
                        })
                        .catch(function() {
                            scanBtn.disabled = false;
                            if (scanSpinner) scanSpinner.style.display = 'none';
                            if (scanResults) scanResults.innerHTML = '<p style="color:#dc2626;font-size:12px;">Request failed.</p>';
                        });
                });
            }
        })();
        </script>
        <?php
    }

    public static function ajax_csp_save(): void {
        check_ajax_referer( CloudScale_DevTools::SECURITY_NONCE, 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) { wp_send_json_error( 'Unauthorized', 403 ); }

        $enabled  = isset( $_POST['enabled'] )  ? sanitize_key( wp_unslash( $_POST['enabled'] ) )                            : '0';
        $mode     = isset( $_POST['mode'] )     ? sanitize_key( wp_unslash( $_POST['mode'] ) )                               : 'enforce';
        $services = isset( $_POST['services'] ) ? json_decode( sanitize_text_field( wp_unslash( $_POST['services'] ) ), true ) : [];
        $custom   = isset( $_POST['custom'] )   ? sanitize_textarea_field( wp_unslash( $_POST['custom'] ) )                  : '';

        if ( ! is_array( $services ) ) { $services = []; }
        $allowed_services = [ 'google_analytics', 'google_adsense', 'google_tag_manager', 'google_fonts', 'cloudflare_insights', 'facebook_pixel', 'recaptcha', 'youtube', 'vimeo' ];
        $services = array_values( array_intersect( $services, $allowed_services ) );

        $old = [
            'enabled'  => get_option( 'csdt_devtools_csp_enabled', '0' ),
            'mode'     => get_option( 'csdt_devtools_csp_mode', 'enforce' ),
            'services' => json_decode( get_option( 'csdt_devtools_csp_services', '[]' ), true ),
            'custom'   => get_option( 'csdt_devtools_csp_custom', '' ),
        ];
        $new = [ 'enabled' => $enabled, 'mode' => $mode, 'services' => $services, 'custom' => $custom ];

        // Push current state to rolling 10-entry history before overwriting.
        $history = json_decode( get_option( 'csdt_csp_history', '[]' ), true );
        if ( ! is_array( $history ) ) { $history = []; }
        array_unshift( $history, array_merge( $old, [
            'saved_at' => time(),
            'label'    => self::csp_history_label( $old, $new ),
            'services' => wp_json_encode( $old['services'] ),
        ] ) );
        update_option( 'csdt_csp_history', wp_json_encode( array_slice( $history, 0, 10 ) ) );

        // Single-step rollback backup (legacy).
        update_option( 'csdt_devtools_csp_backup', wp_json_encode( array_merge( $old, [
            'saved_at' => time(),
            'services' => wp_json_encode( $old['services'] ),
        ] ) ) );

        update_option( 'csdt_devtools_csp_enabled',  $enabled === '1' ? '1' : '0' );
        update_option( 'csdt_devtools_csp_mode',     in_array( $mode, [ 'enforce', 'report_only' ], true ) ? $mode : 'enforce' );
        update_option( 'csdt_devtools_csp_services', wp_json_encode( $services ) );
        update_option( 'csdt_devtools_csp_custom',   $custom );
        wp_send_json_success( [ 'has_backup' => true ] );
    }

    private static function csp_history_label( array $old, array $new ): string {
        $labels   = [];
        $old_svcs = is_array( $old['services'] ) ? $old['services'] : (array) json_decode( $old['services'] ?? '[]', true );
        $new_svcs = is_array( $new['services'] ) ? $new['services'] : (array) json_decode( $new['services'] ?? '[]', true );
        $names    = [
            'google_analytics' => 'Google Analytics', 'google_adsense' => 'Google AdSense',
            'google_tag_manager' => 'Google Tag Manager', 'google_fonts' => 'Google Fonts',
            'cloudflare_insights' => 'Cloudflare Insights', 'facebook_pixel' => 'Facebook Pixel',
            'recaptcha' => 'reCAPTCHA', 'youtube' => 'YouTube', 'vimeo' => 'Vimeo',
        ];
        if ( $old['enabled'] !== $new['enabled'] ) {
            $labels[] = $new['enabled'] === '1' ? 'CSP enabled' : 'CSP disabled';
        }
        if ( $old['mode'] !== $new['mode'] ) {
            $labels[] = $new['mode'] === 'report_only' ? 'Switched to report-only' : 'Switched to enforce';
        }
        foreach ( array_diff( $new_svcs, $old_svcs ) as $s ) {
            $labels[] = 'Added ' . ( $names[ $s ] ?? $s );
        }
        foreach ( array_diff( $old_svcs, $new_svcs ) as $s ) {
            $labels[] = 'Removed ' . ( $names[ $s ] ?? $s );
        }
        if ( trim( $old['custom'] ?? '' ) !== trim( $new['custom'] ?? '' ) ) {
            $labels[] = 'Custom directives updated';
        }
        return $labels ? implode( '; ', $labels ) : 'Settings saved';
    }

    public static function ajax_csp_restore(): void {
        check_ajax_referer( CloudScale_DevTools::SECURITY_NONCE, 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) { wp_send_json_error( 'Unauthorized', 403 ); }

        $idx = isset( $_POST['index'] ) ? (int) wp_unslash( $_POST['index'] ) : -1;
        $history = json_decode( get_option( 'csdt_csp_history', '[]' ), true );
        if ( ! is_array( $history ) || ! isset( $history[ $idx ] ) ) {
            wp_send_json_error( 'History entry not found.' );
        }

        $entry = $history[ $idx ];

        // Push current live state to the top of history before restoring.
        $current_services = json_decode( get_option( 'csdt_devtools_csp_services', '[]' ), true );
        $current = [
            'enabled'  => get_option( 'csdt_devtools_csp_enabled', '0' ),
            'mode'     => get_option( 'csdt_devtools_csp_mode', 'enforce' ),
            'services' => wp_json_encode( is_array( $current_services ) ? $current_services : [] ),
            'custom'   => get_option( 'csdt_devtools_csp_custom', '' ),
            'saved_at' => time(),
            'label'    => 'Before restore to: ' . ( $entry['label'] ?? 'previous state' ),
        ];
        array_unshift( $history, $current );
        update_option( 'csdt_csp_history', wp_json_encode( array_slice( $history, 0, 10 ) ) );

        $entry_services = json_decode( $entry['services'] ?? '[]', true );
        if ( ! is_array( $entry_services ) ) { $entry_services = []; }

        update_option( 'csdt_devtools_csp_enabled',  $entry['enabled'] ?? '0' );
        update_option( 'csdt_devtools_csp_mode',     $entry['mode']    ?? 'enforce' );
        update_option( 'csdt_devtools_csp_services', wp_json_encode( $entry_services ) );
        update_option( 'csdt_devtools_csp_custom',   $entry['custom']  ?? '' );

        wp_send_json_success( [
            'enabled'  => $entry['enabled']  ?? '0',
            'mode'     => $entry['mode']     ?? 'enforce',
            'services' => $entry_services,
            'custom'   => $entry['custom']   ?? '',
        ] );
    }

    public static function ajax_csp_rollback(): void {
        check_ajax_referer( CloudScale_DevTools::SECURITY_NONCE, 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) { wp_send_json_error( 'Unauthorized', 403 ); }

        $raw = get_option( 'csdt_devtools_csp_backup', '' );
        if ( ! $raw ) { wp_send_json_error( 'No backup available' ); }

        $backup = json_decode( $raw, true );
        if ( ! is_array( $backup ) ) { wp_send_json_error( 'Backup corrupt' ); }

        update_option( 'csdt_devtools_csp_enabled',  $backup['enabled']  ?? '0' );
        update_option( 'csdt_devtools_csp_mode',     $backup['mode']     ?? 'enforce' );
        update_option( 'csdt_devtools_csp_services', $backup['services'] ?? '[]' );
        update_option( 'csdt_devtools_csp_custom',   $backup['custom']   ?? '' );
        delete_option( 'csdt_devtools_csp_backup' );

        wp_send_json_success( [
            'enabled'  => $backup['enabled']  ?? '0',
            'mode'     => $backup['mode']      ?? 'enforce',
            'services' => json_decode( $backup['services'] ?? '[]', true ),
            'custom'   => $backup['custom']    ?? '',
        ] );
    }

    public static function register_csp_report_route(): void {
        register_rest_route( 'csdt/v1', '/csp-report', [
            'methods'             => 'POST',
            'callback'            => [ __CLASS__, 'rest_csp_report' ],
            'permission_callback' => '__return_true',
        ] );
    }

    public static function rest_csp_report( \WP_REST_Request $request ): \WP_REST_Response {
        $body = json_decode( $request->get_body(), true );
        $report = $body['csp-report'] ?? null;
        if ( ! is_array( $report ) ) {
            return new \WP_REST_Response( null, 204 );
        }

        $entry = [
            'time'      => time(),
            'blocked'   => isset( $report['blocked-uri'] )          ? (string) $report['blocked-uri']          : '',
            'directive' => isset( $report['violated-directive'] )    ? (string) $report['violated-directive']    : '',
            'page'      => isset( $report['document-uri'] )         ? (string) $report['document-uri']         : '',
            'source'    => isset( $report['source-file'] )          ? (string) $report['source-file']          : '',
            'line'      => isset( $report['line-number'] )          ? (int)    $report['line-number']          : 0,
        ];

        // Skip truly empty reports; keep eval/inline violations — they surface plugin issues
        if ( $entry['blocked'] === '' && $entry['directive'] === '' ) {
            return new \WP_REST_Response( null, 204 );
        }

        $stored = json_decode( get_option( 'csdt_csp_violations', '[]' ), true );
        if ( ! is_array( $stored ) ) { $stored = []; }
        array_unshift( $stored, $entry );
        update_option( 'csdt_csp_violations', wp_json_encode( array_slice( $stored, 0, 100 ) ), false );

        return new \WP_REST_Response( null, 204 );
    }

    public static function ajax_csp_violations_get(): void {
        check_ajax_referer( CloudScale_DevTools::SECURITY_NONCE, 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) { wp_send_json_error( 'Unauthorized', 403 ); }
        $stored = json_decode( get_option( 'csdt_csp_violations', '[]' ), true );
        wp_send_json_success( is_array( $stored ) ? $stored : [] );
    }

    public static function ajax_csp_violations_clear(): void {
        check_ajax_referer( CloudScale_DevTools::SECURITY_NONCE, 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) { wp_send_json_error( 'Unauthorized', 403 ); }
        delete_option( 'csdt_csp_violations' );
        wp_send_json_success();
    }

}
