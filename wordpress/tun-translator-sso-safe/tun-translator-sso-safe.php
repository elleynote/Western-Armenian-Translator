<?php
/**
 * Plugin Name: Tun Translator SSO Bridge
 * Description: TunApp checkout identity and first-party Translator SSO bridge.
 * Version: 2.0.6
 * Author: Tun
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

const TUN_TRANSLATOR_SSO_SAFE_VERSION = '2.0.6';
const TUN_TRANSLATOR_SSO_INSTALL_OPTION = 'tun_translator_sso_install_v206';
const TUN_TRANSLATOR_SSO_INSTALL_ERROR_OPTION = 'tun_translator_sso_install_error_v206';

$settings_file = __DIR__ . '/internal/core/includes/class-tun-sso-settings.php';
$provider_file = __DIR__ . '/internal/core/includes/class-tun-sso-provider.php';
$core_file     = __DIR__ . '/internal/core/tun-saas-core.inc';

if ( ! is_readable( $settings_file ) || ! is_readable( $provider_file ) || ! is_readable( $core_file ) ) {
    add_action( 'admin_notices', function () {
        if ( current_user_can( 'manage_options' ) ) {
            echo '<div class="notice notice-error"><p><strong>Tun Translator SSO:</strong> One or more required plugin files are unreadable.</p></div>';
        }
    } );
    return;
}

require_once $settings_file;
require_once $provider_file;
require_once $core_file;

function tun_translator_sso_safe_maybe_install() {
    if ( ! current_user_can( 'manage_options' ) ) {
        return;
    }

    if ( get_option( TUN_TRANSLATOR_SSO_INSTALL_OPTION ) === TUN_TRANSLATOR_SSO_SAFE_VERSION ) {
        return;
    }

    if ( ! class_exists( 'Tun_SSO_Provider', false ) ) {
        update_option( TUN_TRANSLATOR_SSO_INSTALL_ERROR_OPTION, 'The Tun SSO provider class could not be loaded.', false );
        return;
    }

    try {
        Tun_SSO_Provider::activate();
        update_option( TUN_TRANSLATOR_SSO_INSTALL_OPTION, TUN_TRANSLATOR_SSO_SAFE_VERSION, false );
        delete_option( TUN_TRANSLATOR_SSO_INSTALL_ERROR_OPTION );
    } catch ( Throwable $error ) {
        update_option(
            TUN_TRANSLATOR_SSO_INSTALL_ERROR_OPTION,
            'Tun SSO database setup could not complete: ' . sanitize_text_field( $error->getMessage() ),
            false
        );
    }
}
add_action( 'admin_init', 'tun_translator_sso_safe_maybe_install', 50 );

function tun_translator_sso_safe_admin_notice() {
    if ( ! current_user_can( 'manage_options' ) ) {
        return;
    }

    $message = get_option( TUN_TRANSLATOR_SSO_INSTALL_ERROR_OPTION );
    if ( ! is_string( $message ) || '' === trim( $message ) ) {
        return;
    }

    echo '<div class="notice notice-error"><p><strong>Tun Translator SSO:</strong> ' . esc_html( $message ) . '</p></div>';
}
add_action( 'admin_notices', 'tun_translator_sso_safe_admin_notice' );
