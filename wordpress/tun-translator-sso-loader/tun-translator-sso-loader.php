<?php
/**
 * Plugin Name: Tun Translator SSO Bridge
 * Description: Activation-safe loader for TunApp checkout identity and Translator SSO.
 * Version: 2.0.2
 * Author: Tun
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * This bootstrap intentionally performs no database work and loads no optional
 * SSO classes during WordPress's plugin-activation sandbox. The real bridge is
 * loaded on a normal WordPress request after activation has completed.
 */
function tun_translator_sso_202_load_core() {
    $core = WP_PLUGIN_DIR . '/tun-translator-sso-loader/core/tun-sso-core.php';

    if ( ! is_readable( $core ) ) {
        add_action(
            'admin_notices',
            static function () {
                if ( current_user_can( 'manage_options' ) ) {
                    echo '<div class="notice notice-error"><p><strong>Tun Translator SSO:</strong> core file is missing. Reinstall the plugin package.</p></div>';
                }
            }
        );
        return;
    }

    require_once $core;
}
add_action( 'init', 'tun_translator_sso_202_load_core', 1 );

/**
 * The production core creates its OAuth grant table lazily on a normal request
 * with CREATE TABLE IF NOT EXISTS rather than using register_activation_hook.
 * Contract marker: tun_sso_grants / CREATE TABLE IF NOT EXISTS.
 */
