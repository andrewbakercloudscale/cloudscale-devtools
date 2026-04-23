<?php
/**
 * Test account manager — temporary subscriber accounts for CI/Playwright pipelines.
 *
 * @package CloudScale_DevTools
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

class CSDT_Test_Accounts {

    public static function get_active_test_accounts(): array {
        $users = get_users( [
            'meta_key'   => 'csdt_test_account',
            'meta_value' => '1',
            'fields'     => [ 'ID', 'user_login' ],
        ] );

        $accounts = [];
        foreach ( $users as $u ) {
            $expires_at  = (int) get_user_meta( $u->ID, 'csdt_test_expires_at', true );
            $max_logins  = (int) get_user_meta( $u->ID, 'csdt_test_max_logins', true );
            $login_count = (int) get_user_meta( $u->ID, 'csdt_test_login_count', true );
            $accounts[] = [
                'user_id'     => $u->ID,
                'username'    => $u->user_login,
                'expires_at'  => $expires_at,
                'expires_in'  => max( 0, $expires_at - time() ),
                'max_logins'  => $max_logins,
                'login_count' => $login_count,
            ];
        }

        return $accounts;
    }

    private static function create_test_account( int $ttl = 1800 ): array {
        $username  = 'test-' . wp_generate_password( 8, false, false );
        $password  = wp_generate_password( 20 );
        $email     = $username . '@test.local';
        $user_id   = wp_create_user( $username, $password, $email );

        if ( is_wp_error( $user_id ) ) {
            return [ 'error' => $user_id->get_error_message() ];
        }

        $user = new WP_User( $user_id );
        $user->set_role( 'subscriber' );

        $expires_at  = time() + $ttl;
        $max_logins  = max( 0, (int) get_option( 'csdt_test_account_max_logins', '1' ) );

        update_user_meta( $user_id, 'csdt_test_account',     '1' );
        update_user_meta( $user_id, 'csdt_test_expires_at',  $expires_at );
        update_user_meta( $user_id, 'csdt_test_max_logins',  $max_logins );
        update_user_meta( $user_id, 'csdt_test_login_count', 0 );

        [ $app_password, $item ] = WP_Application_Passwords::create_new_application_password(
            $user_id,
            [ 'name' => 'playwright-ci' ]
        );

        if ( is_wp_error( $app_password ) ) {
            wp_delete_user( $user_id );
            return [ 'error' => $app_password->get_error_message() ];
        }

        $formatted_pw = implode( ' ', str_split( $app_password, 4 ) );

        return [
            'user_id'    => $user_id,
            'username'   => $username,
            'app_password' => $formatted_pw,
            'rest_url'   => rest_url( 'wp/v2/users/me' ),
            'expires_at' => $expires_at,
            'accounts'   => self::get_active_test_accounts(),
        ];
    }

    public static function ajax_create_test_account(): void {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( 'Forbidden', 403 );
        }
        check_ajax_referer( 'csdt_devtools_login_nonce', 'nonce' );

        $ttl    = (int) get_option( 'csdt_test_account_ttl', '1800' );
        $result = self::create_test_account( $ttl );

        if ( isset( $result['error'] ) ) {
            wp_send_json_error( $result['error'] );
        }

        wp_send_json_success( $result );
    }

    public static function ajax_revoke_test_account(): void {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( 'Forbidden', 403 );
        }
        check_ajax_referer( 'csdt_devtools_login_nonce', 'nonce' );

        $user_id = (int) ( $_POST['user_id'] ?? 0 );
        if ( ! $user_id ) {
            wp_send_json_error( 'Missing user_id' );
        }

        if ( get_user_meta( $user_id, 'csdt_test_account', true ) !== '1' ) {
            wp_send_json_error( 'Not a test account' );
        }

        wp_delete_user( $user_id );

        wp_send_json_success( [ 'accounts' => self::get_active_test_accounts() ] );
    }

    public static function ajax_save_test_account_settings(): void {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( 'Forbidden', 403 );
        }
        check_ajax_referer( 'csdt_devtools_login_nonce', 'nonce' );

        $enabled     = ( $_POST['enabled']     ?? '0' ) === '1' ? '1' : '0';
        $ttl         = in_array( (string) ( $_POST['ttl'] ?? '1800' ), [ '300', '600', '1800', '3600', '7200', '86400' ], true )
                       ? (string) $_POST['ttl'] : '1800';
        $single_use  = ( $_POST['single_use'] ?? '0' ) === '1' ? '1' : '0';
        $max_logins  = $single_use === '1' ? 1 : max( 0, (int) ( $_POST['max_logins'] ?? 0 ) );

        update_option( 'csdt_test_accounts_enabled',    $enabled );
        update_option( 'csdt_test_account_ttl',         $ttl );
        update_option( 'csdt_test_account_single_use',  $single_use );
        update_option( 'csdt_test_account_max_logins',  (string) $max_logins );

        if ( $enabled === '1' ) {
            if ( ! wp_next_scheduled( 'csdt_cleanup_test_accounts' ) ) {
                wp_schedule_event( time() + 300, 'csdt_every_5min', 'csdt_cleanup_test_accounts' );
            }
        } else {
            wp_clear_scheduled_hook( 'csdt_cleanup_test_accounts' );
        }

        wp_send_json_success();
    }



    public static function cleanup_expired_test_accounts(): void {
        $now = time();

        // 1. Meta-tracked test accounts with an expiry timestamp.
        $users = get_users( [
            'meta_key'   => 'csdt_test_account',
            'meta_value' => '1',
            'fields'     => [ 'ID' ],
        ] );
        foreach ( $users as $u ) {
            $expires_at = (int) get_user_meta( $u->ID, 'csdt_test_expires_at', true );
            if ( $expires_at && $expires_at < $now ) {
                wp_delete_user( $u->ID );
            }
        }

        // 2. Orphaned test accounts not tracked by meta — sweep by known patterns.
        //    @test.local email domain is never a real account; cs_devtools_test* and
        //    temp-* usernames with no posts are plugin/debug artifacts safe to remove.
        $orphans = get_users( [
            'fields'     => [ 'ID', 'user_login', 'user_email', 'user_registered' ],
            'number'     => 200,
        ] );
        foreach ( $orphans as $u ) {
            $is_test_email    = str_ends_with( strtolower( $u->user_email ), '@test.local' );
            $is_test_login    = strncmp( $u->user_login, 'cs_devtools_test', 16 ) === 0;
            $is_temp_login    = strncmp( $u->user_login, 'temp-', 5 ) === 0
                             && strtotime( $u->user_registered ) < $now - DAY_IN_SECONDS
                             && (int) count_user_posts( $u->ID ) === 0;
            if ( $is_test_email || $is_test_login || $is_temp_login ) {
                wp_delete_user( $u->ID );
            }
        }
    }

    public static function filter_app_pw_for_user( $available, $user ): bool {
        if ( get_user_meta( $user->ID, 'csdt_test_account', true ) === '1' ) {
            return true;
        }
        return false;
    }

    public static function test_account_after_auth( $user, $app_password ): void {
        if ( get_user_meta( $user->ID, 'csdt_test_account', true ) !== '1' ) {
            return;
        }
        $max_logins = (int) get_user_meta( $user->ID, 'csdt_test_max_logins', true );
        if ( $max_logins <= 0 ) {
            return; // unlimited
        }
        $count = (int) get_user_meta( $user->ID, 'csdt_test_login_count', true ) + 1;
        if ( $count >= $max_logins ) {
            wp_delete_user( $user->ID );
        } else {
            update_user_meta( $user->ID, 'csdt_test_login_count', $count );
        }
    }

}
