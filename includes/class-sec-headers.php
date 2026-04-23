<?php
/**
 * Security Headers — X-Content-Type-Options, X-Frame-Options, Referrer-Policy,
 * Permissions-Policy panel and AJAX; header scan tool.
 *
 * @package CloudScale_DevTools
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

class CSDT_Security_Headers {

    public static function render_security_headers_panel(): void {
        $enabled = get_option( 'csdt_devtools_safe_headers_enabled', '0' ) === '1';
        $ext_ack = get_option( 'csdt_devtools_sec_headers_ack', '0' ) === '1';

        $headers = [
            'X-Content-Type-Options: nosniff'                  => 'Prevents browsers from MIME-sniffing a response away from the declared content type. Stops certain XSS attacks via content confusion.',
            'X-Frame-Options: SAMEORIGIN'                      => 'Blocks your site from being embedded in an iframe on another domain. Prevents clickjacking attacks.',
            'Referrer-Policy: strict-origin-when-cross-origin' => 'Sends the full URL as Referer on same-origin requests; sends only the origin on cross-origin requests; sends nothing on downgrade (HTTPS→HTTP).',
            'Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()' => 'Disables access to camera, microphone, geolocation, and payment APIs for this origin and all embedded iframes.',
        ];
        ?>
        <hr class="cs-sec-divider">
        <div class="cs-section-header" style="background:linear-gradient(90deg,#1e3a5f 0%,#1d4ed8 100%);border-left:3px solid #60a5fa;margin-bottom:0;border-radius:6px 6px 0 0;">
            <span>🔒 <?php esc_html_e( 'Security Headers', 'cloudscale-devtools' ); ?></span>
            <span class="cs-header-hint"><?php esc_html_e( 'X-Content-Type-Options, X-Frame-Options, Referrer-Policy, and Permissions-Policy', 'cloudscale-devtools' ); ?></span>
            <?php CloudScale_DevTools::render_explain_btn( 'sec-headers', 'Security Headers', [
                [ 'name' => 'What these headers do',   'rec' => 'Info',     'html' => 'These four headers are low-risk, high-value hardening controls recommended by OWASP and required by most security audits. They are sent with every frontend page response and have no effect on wp-admin.' ],
                [ 'name' => 'Set Externally option',   'rec' => 'Info',     'html' => 'If your Cloudflare, nginx, or CDN configuration already sends these headers, tick <strong>Set Externally</strong> instead of enabling them here. Sending duplicate headers can cause browser conflicts.' ],
                [ 'name' => 'CSP is separate',         'rec' => 'Info',     'html' => 'Content Security Policy is configured separately in the panel below — it has many more options and requires a testing phase before enforcement.' ],
            ] ); ?>
        </div>
        <div style="padding:20px;background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 6px 6px;margin-bottom:0;" id="cs-sec-headers-panel">

            <!-- Header list -->
            <div style="margin-bottom:18px;">
                <?php foreach ( $headers as $header => $description ) : ?>
                <div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #f1f5f9;">
                    <code style="flex-shrink:0;font-size:11px;color:#1d4ed8;background:#eff6ff;padding:3px 7px;border-radius:4px;align-self:flex-start;white-space:nowrap;"><?php echo esc_html( strtok( $header, ':' ) ); ?></code>
                    <div>
                        <div style="font-size:11px;font-family:monospace;color:#475569;margin-bottom:3px;"><?php echo esc_html( $header ); ?></div>
                        <div style="font-size:12px;color:#64748b;"><?php echo esc_html( $description ); ?></div>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>

            <!-- Controls -->
            <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;margin-bottom:14px;">
                <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;cursor:pointer;">
                    <input type="checkbox" id="csdt-sec-headers-enabled" <?php checked( $enabled ); ?>>
                    <?php esc_html_e( 'Enable — CloudScale sends these headers', 'cloudscale-devtools' ); ?>
                </label>
                <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;">
                    <input type="checkbox" id="csdt-sec-headers-ext" <?php checked( $ext_ack ); ?>>
                    <?php esc_html_e( 'Set Externally (Cloudflare / nginx / CDN)', 'cloudscale-devtools' ); ?>
                </label>
            </div>

            <div style="display:flex;align-items:center;gap:10px;">
                <button type="button" id="csdt-sec-headers-save" class="cs-btn-primary cs-btn-sm"><?php esc_html_e( 'Save', 'cloudscale-devtools' ); ?></button>
                <span id="csdt-sec-headers-msg" style="display:none;font-size:13px;font-weight:600;color:#16a34a;">✓ <?php esc_html_e( 'Saved', 'cloudscale-devtools' ); ?></span>
            </div>
        </div>
        <script>
        (function(){
            var btn = document.getElementById('csdt-sec-headers-save');
            if (!btn) return;
            var msg = document.getElementById('csdt-sec-headers-msg');
            btn.addEventListener('click', function(){
                btn.disabled = true;
                var fd = new FormData();
                fd.append('action',  'csdt_sec_headers_save');
                fd.append('nonce',   csdtVulnScan.nonce);
                fd.append('enabled', document.getElementById('csdt-sec-headers-enabled').checked ? '1' : '0');
                fd.append('ext_ack', document.getElementById('csdt-sec-headers-ext').checked     ? '1' : '0');
                fetch(ajaxurl, { method: 'POST', body: fd })
                    .then(function(r){ return r.json(); })
                    .then(function(){
                        msg.style.display = '';
                        setTimeout(function(){ msg.style.display = 'none'; }, 3000);
                    })
                    .finally(function(){ btn.disabled = false; });
            });
        })();
        </script>
        <?php
    }

    public static function ajax_sec_headers_save(): void {
        check_ajax_referer( CloudScale_DevTools::SECURITY_NONCE, 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( 'Unauthorized', 403 );
        }
        $enabled = isset( $_POST['enabled'] ) && '1' === $_POST['enabled'] ? '1' : '0'; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
        $ext_ack = isset( $_POST['ext_ack'] ) && '1' === $_POST['ext_ack']  ? '1' : '0'; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
        update_option( 'csdt_devtools_safe_headers_enabled', $enabled );
        update_option( 'csdt_devtools_sec_headers_ack',      $ext_ack );
        delete_transient( 'csdt_sec_headers_check' );
        wp_send_json_success();
    }

    public static function ajax_scan_headers(): void {
        check_ajax_referer( CloudScale_DevTools::SECURITY_NONCE, 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) { wp_send_json_error( 'Unauthorized', 403 ); }

        $sec_keys = [
            'content-security-policy',
            'content-security-policy-report-only',
            'strict-transport-security',
            'x-frame-options',
            'x-content-type-options',
            'referrer-policy',
            'permissions-policy',
        ];
        $mandatory = [ 'content-security-policy', 'strict-transport-security', 'x-frame-options', 'x-content-type-options' ];

        // ── Helper: analyse one URL ──────────────────────────────────────────
        $analyse = static function ( string $url ) use ( $sec_keys, $mandatory ): array {
            $resp = wp_remote_get( $url, [
                'timeout'     => 10,
                'sslverify'   => false,
                'redirection' => 3,
                'user-agent'  => 'CloudScale-Header-Scanner/1.0',
            ] );
            if ( is_wp_error( $resp ) ) {
                return [ 'url' => $url, 'error' => $resp->get_error_message() ];
            }
            $headers     = wp_remote_retrieve_headers( $resp );
            $status_code = (int) wp_remote_retrieve_response_code( $resp );
            // Build a raw map of all header values to reliably catch duplicates.
            // WordPress's CaseInsensitiveDictionary sometimes concatenates duplicate
            // headers with a newline rather than returning an array.
            $raw_multi = [];
            foreach ( $headers->getAll() as $raw_line ) {
                if ( strpos( $raw_line, ':' ) !== false ) {
                    [ $k, $v ] = explode( ':', $raw_line, 2 );
                    $raw_multi[ strtolower( trim( $k ) ) ][] = trim( $v );
                }
            }
            $sec = [];
            foreach ( $sec_keys as $hkey ) {
                $val = $headers[ $hkey ] ?? null;
                // Prefer raw_multi count for accurate duplicate detection.
                $all_vals = $raw_multi[ $hkey ] ?? ( null !== $val ? ( is_array( $val ) ? $val : [ $val ] ) : [] );
                if ( empty( $all_vals ) ) {
                    $sec[ $hkey ] = [ 'status' => 'missing', 'values' => [] ];
                } elseif ( count( $all_vals ) > 1 ) {
                    $sec[ $hkey ] = [ 'status' => 'duplicate', 'values' => $all_vals ];
                } else {
                    $sec[ $hkey ] = [ 'status' => 'present', 'values' => $all_vals ];
                }
            }
            return [
                'url'         => $url,
                'status_code' => $status_code,
                'sec'         => $sec,
                'all_headers' => $headers->getAll(),
            ];
        };

        // ── Homepage — full analysis ─────────────────────────────────────────
        $home_url  = home_url( '/' );
        $home_data = $analyse( $home_url );

        // Grade + warnings from homepage
        $grade    = 'A+';
        $warnings = [];
        if ( ! isset( $home_data['error'] ) ) {
            $sec          = $home_data['sec'];
            $missing_mand = 0;
            foreach ( $mandatory as $hk ) {
                if ( ( $sec[ $hk ]['status'] ?? 'missing' ) === 'missing' ) { $missing_mand++; }
            }
            // Grade by missing mandatory headers
            if ( $missing_mand >= 3 )     { $grade = 'F'; }
            elseif ( $missing_mand === 2 ) { $grade = 'D'; }
            elseif ( $missing_mand === 1 ) { $grade = 'C'; }
            else                           { $grade = 'A+'; }

            // CSP quality warnings
            $csp_val = $sec['content-security-policy']['values'][0] ?? '';
            if ( $csp_val ) {
                if ( str_contains( $csp_val, "'unsafe-inline'" ) ) {
                    $warnings[] = [ 'header' => 'Content-Security-Policy', 'msg' => "This policy contains 'unsafe-inline' which is dangerous in the script-src directive." ];
                    if ( $grade === 'A+' ) { $grade = 'A'; }
                }
                if ( str_contains( $csp_val, "'unsafe-eval'" ) ) {
                    $warnings[] = [ 'header' => 'Content-Security-Policy', 'msg' => "This policy contains 'unsafe-eval' which allows dynamic code execution." ];
                    if ( in_array( $grade, [ 'A+', 'A' ], true ) ) { $grade = 'B'; }
                }
                // When strict-dynamic is active, only nonce'd scripts load — check that
                // every <script> tag in the page HTML actually carries a nonce.
                if ( str_contains( $csp_val, "'strict-dynamic'" ) ) {
                    $page_resp = wp_remote_get( $home_url, [
                        'timeout'   => 10,
                        'sslverify' => false,
                        'user-agent'=> 'CloudScale-Header-Scanner/1.0',
                    ] );
                    if ( ! is_wp_error( $page_resp ) ) {
                        $body = wp_remote_retrieve_body( $page_resp );
                        preg_match_all( '/<script(?=[>\s])([^>]*)>/i', $body, $all_scripts );
                        $missing = 0;
                        foreach ( $all_scripts[1] as $attrs ) {
                            if ( ! preg_match( '/\bnonce\s*=/i', $attrs ) ) {
                                $missing++;
                            }
                        }
                        if ( $missing > 0 ) {
                            $warnings[] = [ 'header' => 'Content-Security-Policy', 'msg' => "{$missing} <script> tag(s) on the homepage have no nonce. With 'strict-dynamic' active, these scripts will be blocked — third-party tags (AdSense, analytics) are common culprits. Enable the CloudScale nonce output buffer or add them via wp_enqueue_scripts." ];
                            if ( in_array( $grade, [ 'A+', 'A' ], true ) ) { $grade = 'B'; }
                        }
                    }
                }
            }
            // Duplicate headers
            foreach ( $sec as $hk => $hdata ) {
                if ( $hdata['status'] === 'duplicate' ) {
                    $count = count( $hdata['values'] );
                    if ( $hk === 'content-security-policy' ) {
                        // For CSP, the browser enforces the INTERSECTION of all policies —
                        // AdSense, analytics, and other third-party scripts can be silently
                        // blocked if the two policies have different allowlists.
                        $warnings[] = [ 'header' => $hk, 'msg' => $count . ' Content-Security-Policy headers detected. The browser enforces ALL of them simultaneously (intersection, not first-wins) — AdSense and third-party scripts may be blocked by the stricter policy. One source must be removed. Common causes: Nginx/Apache adding a static CSP while the plugin also sends one.' ];
                        if ( in_array( $grade, [ 'A+', 'A', 'B' ], true ) ) { $grade = 'C'; }
                    } else {
                        $warnings[] = [ 'header' => $hk, 'msg' => $count . ' duplicate headers detected — browser behaviour is undefined. Check nginx/Apache config and plugin settings for conflicts.' ];
                        if ( $grade === 'A+' ) { $grade = 'A'; }
                    }
                }
            }
            // Optional headers missing
            foreach ( [ 'referrer-policy', 'permissions-policy' ] as $opt ) {
                if ( ( $sec[ $opt ]['status'] ?? 'missing' ) === 'missing' && in_array( $grade, [ 'A+', 'A' ], true ) ) {
                    $grade = 'B';
                }
            }
            // HSTS quality
            $hsts = $sec['strict-transport-security']['values'][0] ?? '';
            if ( $hsts && preg_match( '/max-age=(\d+)/', $hsts, $m ) && (int) $m[1] < 31536000 ) {
                $warnings[] = [ 'header' => 'Strict-Transport-Security', 'msg' => 'max-age is less than 31536000 (1 year). Increase to at least 31536000.' ];
                if ( $grade === 'A+' ) { $grade = 'A'; }
            }
            $home_data['grade']    = $grade;
            $home_data['warnings'] = $warnings;
            // Server IP
            $host = parse_url( $home_url, PHP_URL_HOST );
            $home_data['ip'] = $host ? gethostbyname( $host ) : '';
        }

        // ── Last 10 posts/pages — security headers only ──────────────────────
        $posts    = get_posts( [
            'numberposts' => 10,
            'post_status' => 'publish',
            'post_type'   => [ 'post', 'page' ],
            'orderby'     => 'date',
            'order'       => 'DESC',
        ] );
        $page_results = [];
        foreach ( $posts as $post ) {
            $purl = get_permalink( $post->ID );
            if ( ! $purl || $purl === $home_url ) { continue; }
            $d = $analyse( $purl );
            if ( isset( $d['sec'] ) ) { unset( $d['all_headers'] ); } // keep payload small
            $page_results[] = $d;
        }

        wp_send_json_success( [
            'home'  => $home_data,
            'pages' => $page_results,
        ] );
    }

    public static function ajax_scan_history_item(): void {
        check_ajax_referer( CloudScale_DevTools::SECURITY_NONCE, 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) { wp_send_json_error( 'Unauthorized', 403 ); }
        $idx     = (int) ( $_POST['idx'] ?? -1 );
        $history = get_option( 'csdt_scan_history', [] );
        if ( ! is_array( $history ) || ! isset( $history[ $idx ] ) ) {
            wp_send_json_error( 'Not found' );
        }
        wp_send_json_success( $history[ $idx ] );
    }

}
