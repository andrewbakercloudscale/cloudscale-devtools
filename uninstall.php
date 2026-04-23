<?php
/**
 * CloudScale Code Block — Uninstall
 *
 * Removes all plugin data when the plugin is deleted from the WordPress admin.
 * This file is called automatically by WordPress on plugin deletion.
 *
 * @package CloudScale_DevTools
 * @since   1.0.0
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
    exit;
}

// Legacy option names (pre-prefix-rename).
delete_option( 'cs_devtools_code_default_theme' );
delete_option( 'cs_devtools_code_theme_pair' );

// Current option names.
$options = [
    'csdt_devtools_code_default_theme',
    'csdt_devtools_code_theme_pair',
    'csdt_devtools_anthropic_key',
    'csdt_devtools_gemini_key',
    'csdt_devtools_ai_provider',
    'csdt_devtools_security_model',
    'csdt_devtools_deep_scan_model',
    'csdt_devtools_security_prompt',
    'csdt_devtools_safe_headers_enabled',
    'csdt_devtools_sec_headers_ack',
    'csdt_devtools_csp_enabled',
    'csdt_devtools_csp_mode',
    'csdt_devtools_csp_services',
    'csdt_devtools_csp_custom',
    'csdt_devtools_csp_debug_panel',
    'csdt_devtools_csp_backup',
    'csdt_devtools_csp_history',
    'csdt_devtools_brute_force_enabled',
    'csdt_devtools_login_hide_enabled',
    'csdt_devtools_login_slug',
    'csdt_devtools_force_2fa',
    'csdt_devtools_2fa_method',
    'csdt_devtools_perf_monitor_enabled',
    'csdt_devtools_smtp_host',
    'csdt_devtools_smtp_port',
    'csdt_devtools_smtp_user',
    'csdt_devtools_smtp_pass',
    'csdt_devtools_smtp_from',
    'csdt_devtools_smtp_from_name',
    'csdt_devtools_smtp_enabled',
    'csdt_devtools_smtp_encryption',
    'csdt_uptime_ntfy_url',
    'csdt_fpm_token',
    'csdt_fpm_last_event',
    'csdt_fpm_event_log',
    'csdt_threat_monitor_enabled',
    'csdt_threat_file_integrity_enabled',
    'csdt_threat_new_admin_enabled',
    'csdt_threat_probe_enabled',
    'csdt_threat_probe_threshold',
    'csdt_threat_last_file_alert',
    'csdt_threat_last_admin_alert',
    'csdt_threat_last_probe_alert',
    'csdt_file_integrity_wp_ver',
    'csdt_file_integrity_baseline',
    'csdt_security_scan_v2',
    'csdt_deep_scan_v1',
    'csdt_scan_history',
    'csdt_site_audit_cache',
    'csdt_scan_schedule_ntfy_url',
    'csdt_custom_404_enabled',
    'csdt_custom_404_scheme',
    'csdt_devtools_cf_zone_id',
    'csdt_devtools_cf_api_token',
];

foreach ( $options as $opt ) {
    delete_option( $opt );
}
