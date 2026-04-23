<?php
/**
 * Uptime monitor — Cloudflare Worker ping with alert/recovery notifications.
 *
 * @package CloudScale_DevTools
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

class CSDT_Uptime {

    public static function admin_bar_badge_styles(): void {
        if ( ! is_admin_bar_showing() || ! current_user_can( 'manage_options' ) ) return;
        echo '<style>
#wp-admin-bar-csdt-health > .ab-item { font-weight:700 !important; }
#wp-admin-bar-csdt-health.csdt-bar-critical > .ab-item { color:#fca5a5 !important; }
#wp-admin-bar-csdt-health.csdt-bar-high > .ab-item { color:#fdba74 !important; }
#wp-admin-bar-csdt-health.csdt-bar-medium > .ab-item { color:#fde68a !important; }
#wp-admin-bar-csdt-health.csdt-bar-ok > .ab-item { color:#86efac !important; }
</style>' . "\n";
    }

    public static function render_admin_bar_badge( \WP_Admin_Bar $bar ): void {
        if ( ! current_user_can( 'manage_options' ) ) return;

        $audit_url  = admin_url( 'tools.php?page=' . CloudScale_DevTools::TOOLS_SLUG . '&tab=site-audit' );
        $uptime_url = admin_url( 'tools.php?page=' . CloudScale_DevTools::TOOLS_SLUG . '&tab=optimizer' );

        $cache    = get_option( 'csdt_site_audit_cache', null );
        $css_cls  = 'csdt-bar-unknown';
        $label    = 'CS Health';

        if ( $cache && ! empty( $cache['data']['counts'] ) ) {
            $counts   = $cache['data']['counts'];
            $critical = (int) ( $counts['critical'] ?? 0 );
            $high     = (int) ( $counts['high']     ?? 0 );
            $medium   = (int) ( $counts['medium']   ?? 0 );

            if ( $critical > 0 ) {
                $label   = 'CS ↯ ' . $critical . ' Critical';
                $css_cls = 'csdt-bar-critical';
            } elseif ( $high > 0 ) {
                $label   = 'CS ↯ ' . $high . ' High';
                $css_cls = 'csdt-bar-high';
            } elseif ( $medium > 0 ) {
                $label   = 'CS ' . $medium . ' Medium';
                $css_cls = 'csdt-bar-medium';
            } else {
                $label   = 'CS ✓ OK';
                $css_cls = 'csdt-bar-ok';
            }
        }

        $bar->add_node( [
            'id'    => 'csdt-health',
            'title' => esc_html( $label ),
            'href'  => $audit_url,
            'meta'  => [ 'class' => $css_cls, 'title' => 'CloudScale Site Health' ],
        ] );

        if ( $cache && ! empty( $cache['data']['counts'] ) ) {
            $counts   = $cache['data']['counts'];
            $critical = (int) ( $counts['critical'] ?? 0 );
            $high     = (int) ( $counts['high']     ?? 0 );
            $medium   = (int) ( $counts['medium']   ?? 0 );
            $low      = (int) ( $counts['low']      ?? 0 );
            $run_at   = $cache['run_at'] ?? 0;
            $age_min  = $run_at ? round( ( time() - $run_at ) / 60 ) : null;

            if ( $critical > 0 ) {
                $bar->add_node( [ 'parent' => 'csdt-health', 'id' => 'csdt-health-crit',   'title' => '🔴 ' . $critical . ' Critical', 'href' => $audit_url ] );
            }
            if ( $high > 0 ) {
                $bar->add_node( [ 'parent' => 'csdt-health', 'id' => 'csdt-health-high',   'title' => '🟠 ' . $high . ' High',        'href' => $audit_url ] );
            }
            if ( $medium > 0 ) {
                $bar->add_node( [ 'parent' => 'csdt-health', 'id' => 'csdt-health-med',    'title' => '🟡 ' . $medium . ' Medium',    'href' => $audit_url ] );
            }
            if ( $low > 0 ) {
                $bar->add_node( [ 'parent' => 'csdt-health', 'id' => 'csdt-health-low',    'title' => '🟢 ' . $low . ' Low',          'href' => $audit_url ] );
            }
            if ( $age_min !== null ) {
                $age_label = $age_min < 60 ? $age_min . 'm ago' : round( $age_min / 60 ) . 'h ago';
                $bar->add_node( [ 'parent' => 'csdt-health', 'id' => 'csdt-health-age', 'title' => 'Last audit: ' . $age_label, 'href' => $audit_url ] );
            }
        } else {
            $bar->add_node( [ 'parent' => 'csdt-health', 'id' => 'csdt-health-run', 'title' => 'Run Site Audit →', 'href' => $audit_url ] );
        }

        // Uptime node
        $last_ping = get_option( 'csdt_uptime_last_ping', null );
        if ( $last_ping && isset( $last_ping['time'] ) && ( time() - $last_ping['time'] ) < 300 ) {
            $up_label = $last_ping['up']
                ? '⏱ UP ' . $last_ping['ms'] . 'ms'
                : '🔴 SITE DOWN';
            $bar->add_node( [ 'parent' => 'csdt-health', 'id' => 'csdt-health-uptime', 'title' => $up_label, 'href' => $uptime_url ] );
        }
    }

    // ── Uptime Monitor ───────────────────────────────────────────────────────

    public static function ajax_uptime_ping(): void {
        $token        = sanitize_text_field( wp_unslash( $_POST['token'] ?? '' ) );
        $stored_token = (string) get_option( 'csdt_uptime_token', '' );

        if ( $stored_token === '' || ! hash_equals( $stored_token, $token ) ) {
            wp_send_json_error( 'Invalid token', 403 );
            return;
        }

        $status_code = absint( $_POST['status_code'] ?? 0 );
        $response_ms = absint( $_POST['response_ms'] ?? 0 );
        $is_up       = $status_code >= 200 && $status_code < 500;
        $now         = time();

        $prev_ping = get_option( 'csdt_uptime_last_ping', null );
        $was_up    = $prev_ping ? (bool) $prev_ping['up'] : true;

        update_option( 'csdt_uptime_last_ping', [
            'time'   => $now,
            'up'     => $is_up,
            'ms'     => $response_ms,
            'status' => $status_code,
        ], false );

        // Raw ring buffer — keep last 180 pings (3 hours)
        $raw   = get_option( 'csdt_uptime_raw', [] );
        $raw[] = [ 't' => $now, 'up' => $is_up ? 1 : 0, 'ms' => $response_ms, 's' => $status_code ];
        if ( count( $raw ) > 180 ) { $raw = array_slice( $raw, -180 ); }
        update_option( 'csdt_uptime_raw', $raw, false );

        // Hourly buckets — keep last 168 (7 days)
        self::uptime_aggregate_hourly( $now, $is_up, $response_ms );

        // Downtime alert (5-min cooldown)
        if ( ! $is_up ) {
            $last_alert   = (int) get_option( 'csdt_uptime_alert_sent_at', 0 );
            $outage_start = (int) get_option( 'csdt_uptime_outage_start', 0 );
            if ( $outage_start === 0 ) {
                update_option( 'csdt_uptime_outage_start', $now, false );
            }
            if ( $now - $last_alert > 300 ) {
                self::uptime_send_alert( $status_code, $response_ms );
                update_option( 'csdt_uptime_alert_sent_at', $now, false );
            }
        } elseif ( ! $was_up && $is_up ) {
            // Site recovered — calculate outage duration and send recovery alert
            $outage_start    = (int) get_option( 'csdt_uptime_outage_start', 0 );
            $outage_duration = $outage_start > 0 ? ( $now - $outage_start ) : 0;
            self::uptime_send_recovery_alert( $response_ms, $outage_duration );
            update_option( 'csdt_uptime_alert_sent_at', 0, false );
            update_option( 'csdt_uptime_outage_start',  0, false );
        }

        wp_send_json_success( [ 'ok' => true ] );
    }

    public static function ajax_uptime_setup(): void {
        check_ajax_referer( CloudScale_DevTools::OPTIMIZER_NONCE, 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'Unauthorized', 403 );

        $token = (string) get_option( 'csdt_uptime_token', '' );
        if ( $token === '' ) {
            $token = bin2hex( random_bytes( 24 ) );
            update_option( 'csdt_uptime_token', $token, false );
        }

        $site_url = get_site_url();
        $ping_url = admin_url( 'admin-ajax.php' );
        $ntfy_url = (string) get_option( 'csdt_uptime_ntfy_url', get_option( 'csdt_scan_schedule_ntfy_url', '' ) );

        wp_send_json_success( [
            'token'       => $token,
            'worker_js'   => self::uptime_worker_js(),
            'wrangler_toml' => self::uptime_wrangler_toml( $site_url, $ping_url, $token, $ntfy_url ),
        ] );
    }

    public static function ajax_uptime_history(): void {
        check_ajax_referer( CloudScale_DevTools::OPTIMIZER_NONCE, 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'Unauthorized', 403 );

        $last_ping = get_option( 'csdt_uptime_last_ping', null );
        $raw       = get_option( 'csdt_uptime_raw', [] );
        $hourly    = get_option( 'csdt_uptime_hourly', [] );

        // Uptime % calculations
        $uptime_24h = null;
        $uptime_7d  = null;
        $avg_ms_24h = null;
        $cutoff_24h = time() - DAY_IN_SECONDS;
        $cutoff_7d  = time() - ( 7 * DAY_IN_SECONDS );

        if ( ! empty( $hourly ) ) {
            $h24_ok = 0; $h24_total = 0; $h24_ms = 0;
            $h7d_ok = 0; $h7d_total = 0;
            foreach ( $hourly as $h ) {
                if ( $h['h'] >= $cutoff_24h ) {
                    $h24_ok    += $h['ok'];
                    $h24_total += $h['total'];
                    $h24_ms    += $h['avg_ms'] * $h['total'];
                }
                if ( $h['h'] >= $cutoff_7d ) {
                    $h7d_ok    += $h['ok'];
                    $h7d_total += $h['total'];
                }
            }
            if ( $h24_total > 0 ) {
                $uptime_24h = round( $h24_ok / $h24_total * 100, 2 );
                $avg_ms_24h = round( $h24_ms / $h24_total );
            }
            if ( $h7d_total > 0 ) {
                $uptime_7d = round( $h7d_ok / $h7d_total * 100, 2 );
            }
        }

        if ( $last_ping ) {
            $last_ping['age_seconds'] = time() - $last_ping['time'];
        }

        wp_send_json_success( [
            'last_ping'  => $last_ping,
            'raw'        => $raw,
            'hourly'     => array_values( array_slice( $hourly, -48 ) ),
            'uptime_24h' => $uptime_24h,
            'uptime_7d'  => $uptime_7d,
            'avg_ms_24h' => $avg_ms_24h,
            'enabled'    => get_option( 'csdt_uptime_enabled', '0' ) === '1',
        ] );
    }

    public static function ajax_uptime_save_settings(): void {
        check_ajax_referer( CloudScale_DevTools::OPTIMIZER_NONCE, 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'Unauthorized', 403 );

        $ntfy_url = esc_url_raw( wp_unslash( $_POST['ntfy_url'] ?? '' ) );
        update_option( 'csdt_uptime_ntfy_url', $ntfy_url, false );
        wp_send_json_success( [ 'saved' => true ] );
    }

    public static function ajax_uptime_deploy_worker(): void {
        check_ajax_referer( CloudScale_DevTools::OPTIMIZER_NONCE, 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( 'Unauthorized', 403 );

        $zone_id  = (string) get_option( 'csdt_devtools_cf_zone_id', '' );
        $cf_token = (string) get_option( 'csdt_devtools_cf_api_token', '' );
        $ntfy_url = esc_url_raw( wp_unslash( $_POST['ntfy_url'] ?? '' ) );

        if ( $ntfy_url ) { update_option( 'csdt_uptime_ntfy_url', $ntfy_url, false ); }

        if ( $zone_id === '' || $cf_token === '' ) {
            wp_send_json_error( [ 'message' => 'No Cloudflare Zone ID or API Token found. Enter them in the Thumbnails tab first, then return here to deploy.' ] );
            return;
        }

        // Ensure token exists
        $token = (string) get_option( 'csdt_uptime_token', '' );
        if ( $token === '' ) {
            $token = bin2hex( random_bytes( 24 ) );
            update_option( 'csdt_uptime_token', $token, false );
        }

        $site_url = get_site_url();
        $ping_url = admin_url( 'admin-ajax.php' );

        // Step 1: Resolve Account ID from zone
        $zone_resp = wp_remote_get(
            'https://api.cloudflare.com/client/v4/zones/' . rawurlencode( $zone_id ),
            [ 'headers' => [ 'Authorization' => 'Bearer ' . $cf_token ], 'timeout' => 15 ]
        );
        if ( is_wp_error( $zone_resp ) ) {
            wp_send_json_error( [ 'message' => 'CF API error: ' . $zone_resp->get_error_message() ] );
            return;
        }
        $zone_data  = json_decode( wp_remote_retrieve_body( $zone_resp ), true );
        $account_id = $zone_data['result']['account']['id'] ?? '';
        if ( ! $account_id ) {
            wp_send_json_error( [ 'message' => 'Could not fetch zone details. Check your CF API token has Zone:Read permission.' ] );
            return;
        }

        // Step 2: Upload Worker (module syntax + env bindings)
        $boundary = '---CSDTWorkerBnd' . bin2hex( random_bytes( 8 ) );
        $metadata = wp_json_encode( [
            'main_module'        => 'worker.js',
            'compatibility_date' => '2024-11-01',
            'bindings'           => [
                [ 'type' => 'plain_text', 'name' => 'SITE_URL',   'text' => $site_url ],
                [ 'type' => 'plain_text', 'name' => 'PING_URL',   'text' => $ping_url ],
                [ 'type' => 'plain_text', 'name' => 'PING_TOKEN', 'text' => $token ],
                [ 'type' => 'plain_text', 'name' => 'NTFY_URL',   'text' => $ntfy_url ],
            ],
        ] );
        $script_js = self::uptime_worker_js();
        $body  = "--{$boundary}\r\nContent-Disposition: form-data; name=\"metadata\"\r\nContent-Type: application/json\r\n\r\n{$metadata}\r\n";
        $body .= "--{$boundary}\r\nContent-Disposition: form-data; name=\"worker.js\"; filename=\"worker.js\"\r\nContent-Type: application/javascript+module\r\n\r\n{$script_js}\r\n";
        $body .= "--{$boundary}--\r\n";

        $upload_resp = wp_remote_request(
            "https://api.cloudflare.com/client/v4/accounts/{$account_id}/workers/scripts/cloudscale-uptime",
            [
                'method'  => 'PUT',
                'headers' => [
                    'Authorization' => 'Bearer ' . $cf_token,
                    'Content-Type'  => "multipart/form-data; boundary={$boundary}",
                ],
                'body'    => $body,
                'timeout' => 30,
            ]
        );

        if ( is_wp_error( $upload_resp ) ) {
            wp_send_json_error( [ 'message' => 'Worker upload failed: ' . $upload_resp->get_error_message() ] );
            return;
        }
        $upload_data = json_decode( wp_remote_retrieve_body( $upload_resp ), true );
        if ( empty( $upload_data['success'] ) ) {
            $err = $upload_data['errors'][0]['message'] ?? 'Upload failed';
            wp_send_json_error( [ 'message' => $err . ' — ensure your CF API token has Workers:Edit permission. You can create one at dash.cloudflare.com → My Profile → API Tokens → Create Token → Edit Cloudflare Workers template.' ] );
            return;
        }

        // Step 3: Set cron trigger (every minute)
        $cron_resp = wp_remote_request(
            "https://api.cloudflare.com/client/v4/accounts/{$account_id}/workers/scripts/cloudscale-uptime/schedules",
            [
                'method'  => 'PUT',
                'headers' => [ 'Authorization' => 'Bearer ' . $cf_token, 'Content-Type' => 'application/json' ],
                'body'    => wp_json_encode( [ [ 'cron' => '* * * * *' ] ] ),
                'timeout' => 15,
            ]
        );
        $cron_ok = ! is_wp_error( $cron_resp ) && ! empty( json_decode( wp_remote_retrieve_body( $cron_resp ), true )['success'] );

        update_option( 'csdt_uptime_enabled', '1', false );

        wp_send_json_success( [
            'message'    => 'Worker deployed! Pings will arrive every 60 seconds.',
            'worker_url' => "https://dash.cloudflare.com/{$account_id}/workers/view/cloudscale-uptime",
            'cron_ok'    => $cron_ok,
            'token'      => $token,
        ] );
    }

    private static function uptime_aggregate_hourly( int $now, bool $is_up, int $ms ): void {
        $hour    = $now - ( $now % 3600 );
        $hourly  = get_option( 'csdt_uptime_hourly', [] );
        $updated = false;
        foreach ( $hourly as &$h ) {
            if ( $h['h'] === $hour ) {
                $h['total']++;
                if ( $is_up ) $h['ok']++;
                $h['avg_ms'] = (int) round( ( $h['avg_ms'] * ( $h['total'] - 1 ) + $ms ) / $h['total'] );
                $updated = true;
                break;
            }
        }
        unset( $h );
        if ( ! $updated ) {
            $hourly[] = [ 'h' => $hour, 'total' => 1, 'ok' => $is_up ? 1 : 0, 'avg_ms' => $ms ];
        }
        if ( count( $hourly ) > 168 ) { $hourly = array_slice( $hourly, -168 ); }
        update_option( 'csdt_uptime_hourly', $hourly, false );
    }

    private static function uptime_send_alert( int $status_code, int $response_ms ): void {
        $site    = get_bloginfo( 'name' );
        $url     = get_site_url();
        $subject = "[{$site}] Site is DOWN";
        $body    = "<p>Your site <strong>{$url}</strong> appears to be down.</p>"
                 . "<p>Status: <strong>" . ( $status_code ?: 'Timeout' ) . "</strong> — Response: {$response_ms}ms</p>"
                 . "<p>This alert was sent by the CloudScale Uptime Monitor.</p>";

        $alert_email = (string) get_option( 'csdt_uptime_alert_email', get_option( 'admin_email', '' ) );
        if ( $alert_email ) {
            add_filter( 'wp_mail_content_type', [ 'CSDT_Login', 'email_content_type_html' ] );
            wp_mail( $alert_email, $subject, $body );
            remove_filter( 'wp_mail_content_type', [ 'CSDT_Login', 'email_content_type_html' ] );
        }

        $ntfy_url = (string) get_option( 'csdt_uptime_ntfy_url', '' );
        if ( $ntfy_url ) {
            wp_remote_post( $ntfy_url, [
                'headers' => [
                    'Title'    => "Site Down: {$url}",
                    'Priority' => 'urgent',
                    'Tags'     => 'rotating_light',
                ],
                'body'    => "Status: " . ( $status_code ?: 'Timeout' ) . " — {$response_ms}ms",
                'timeout' => 10,
            ] );
        }
    }

    private static function uptime_send_recovery_alert( int $response_ms, int $outage_seconds = 0 ): void {
        $site         = get_bloginfo( 'name' );
        $url          = get_site_url();
        $duration_str = '';
        if ( $outage_seconds > 0 ) {
            $mins = (int) floor( $outage_seconds / 60 );
            $secs = $outage_seconds % 60;
            $duration_str = $mins > 0
                ? " — was down for <strong>{$mins}m {$secs}s</strong>"
                : " — was down for <strong>{$secs}s</strong>";
        }
        $subject = "[{$site}] Site is back ONLINE";
        $body    = "<p>Your site <strong>{$url}</strong> has recovered and is responding normally{$duration_str}.</p>"
                 . "<p>Response time: <strong>{$response_ms}ms</strong></p>"
                 . "<p>This alert was sent by the CloudScale Uptime Monitor.</p>";

        $alert_email = (string) get_option( 'csdt_uptime_alert_email', get_option( 'admin_email', '' ) );
        if ( $alert_email ) {
            add_filter( 'wp_mail_content_type', [ 'CSDT_Login', 'email_content_type_html' ] );
            wp_mail( $alert_email, $subject, $body );
            remove_filter( 'wp_mail_content_type', [ 'CSDT_Login', 'email_content_type_html' ] );
        }

        $ntfy_url = (string) get_option( 'csdt_uptime_ntfy_url', '' );
        if ( $ntfy_url ) {
            wp_remote_post( $ntfy_url, [
                'headers' => [
                    'Title'    => "Site Recovered: {$url}",
                    'Priority' => 'default',
                    'Tags'     => 'white_check_mark',
                ],
                'body'    => 'Back online — ' . $response_ms . 'ms' . ( $outage_seconds > 0 ? ' — down for ' . ( $outage_seconds >= 60 ? floor( $outage_seconds / 60 ) . 'm ' . ( $outage_seconds % 60 ) . 's' : $outage_seconds . 's' ) : '' ),
                'timeout' => 10,
            ] );
        }
    }

    private static function uptime_worker_js(): string {
        return "// CloudScale Uptime Monitor\nexport default {\n  async scheduled(event, env, ctx) {\n    const start = Date.now();\n    let statusCode = 0, responseMs = 0, isUp = false;\n    try {\n      // Cache-bust to force a fresh origin request — prevents Cloudflare edge\n      // cache from masking a down origin with a cached 200.\n      const probeUrl = env.SITE_URL + (env.SITE_URL.includes('?') ? '&' : '?') + '_up=' + Date.now();\n      const res = await fetch(probeUrl, {\n        method: 'HEAD',\n        headers: {\n          'User-Agent': 'CloudScale-Uptime/1.0',\n          'Cache-Control': 'no-store',\n          'Pragma': 'no-cache',\n        },\n        signal: AbortSignal.timeout(15000),\n        redirect: 'follow',\n      });\n      statusCode = res.status;\n      responseMs = Date.now() - start;\n      isUp = statusCode >= 200 && statusCode < 500;\n    } catch(e) { responseMs = Date.now() - start; }\n    if (!isUp && env.NTFY_URL) {\n      ctx.waitUntil(fetch(env.NTFY_URL, {\n        method: 'POST',\n        headers: {'Title': 'Site Down: ' + env.SITE_URL, 'Priority': 'urgent', 'Tags': 'rotating_light'},\n        body: 'Status: ' + (statusCode || 'timeout') + ' — ' + responseMs + 'ms',\n      }).catch(() => {}));\n    }\n    ctx.waitUntil(fetch(env.PING_URL, {\n      method: 'POST',\n      headers: {'Content-Type': 'application/x-www-form-urlencoded'},\n      body: 'action=csdt_uptime_ping&token=' + encodeURIComponent(env.PING_TOKEN) + '&status_code=' + statusCode + '&response_ms=' + responseMs,\n      signal: AbortSignal.timeout(10000),\n    }).catch(() => {}));\n  },\n};";
    }

    private static function uptime_wrangler_toml( string $site_url, string $ping_url, string $token, string $ntfy_url ): string {
        return "name = \"cloudscale-uptime\"\nmain = \"worker.js\"\ncompatibility_date = \"2024-11-01\"\n\n[vars]\nSITE_URL = \"{$site_url}\"\nPING_URL = \"{$ping_url}\"\nPING_TOKEN = \"{$token}\"\nNTFY_URL = \"{$ntfy_url}\"\n\n[[triggers.crons]]\ncrons = [\"* * * * *\"]\n";
    }

}
