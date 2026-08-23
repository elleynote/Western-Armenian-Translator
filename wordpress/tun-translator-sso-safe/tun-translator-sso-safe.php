<?php
/**
 * Plugin Name: Tun Translator SSO Bridge
 * Description: Activation-safe TunApp checkout identity and first-party Translator SSO bridge.
 * Version: 2.0.5
 * Author: Tun
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

const TUN_TRANSLATOR_SSO_SAFE_VERSION = '2.0.5';
const TUN_TRANSLATOR_SSO_INSTALL_OPTION = 'tun_translator_sso_install_v205';
const TUN_TRANSLATOR_SSO_INSTALL_ERROR_OPTION = 'tun_translator_sso_install_error_v205';

/**
 * Load the tested bridge immediately when this plugin file is included.
 * WordPress includes a plugin during activation after `plugins_loaded` has
 * already fired, so deferring this require to that hook would skip the core on
 * the activation request. Database setup is still deferred to admin_init.
 */
function tun_translator_sso_safe_load_core() {
    $core = __DIR__ . '/internal/core/tun-saas-core.inc';

    if ( ! is_readable( $core ) ) {
        update_option( TUN_TRANSLATOR_SSO_INSTALL_ERROR_OPTION, 'The Tun SSO core file is missing. Reinstall the plugin package.', false );
        return;
    }

    require_once $core;
}

tun_translator_sso_safe_load_core();

/**
 * Install the OAuth grant table on a normal admin request, never inside the
 * activation sandbox. Any environment-specific database failure is captured
 * and shown as an admin notice instead of becoming a fatal activation error.
 */
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
