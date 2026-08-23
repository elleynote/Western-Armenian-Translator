<?php

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class Tun_SSO_Settings {
    const OPTION_NAME = 'tun_saas_sso_settings';

    public static function init() {
        add_action( 'admin_menu', array( __CLASS__, 'register_page' ) );
        add_action( 'admin_post_tun_saas_save_sso_settings', array( __CLASS__, 'save' ) );
        add_action( 'admin_post_tun_saas_generate_sso_credentials', array( __CLASS__, 'generate_credentials' ) );
    }

    public static function defaults() {
        return array(
            'enabled'        => false,
            'client_id'      => '',
            'secret_hash'    => '',
            'redirect_uri'   => 'https://indgjoridkhnazitubom.supabase.co/auth/v1/callback',
            'translator_url' => 'https://western-armenian-translator.netlify.app',
        );
    }

    public static function get() {
        $stored = get_option( self::OPTION_NAME, array() );
        return wp_parse_args( is_array( $stored ) ? $stored : array(), self::defaults() );
    }

    public static function client_id() {
        $settings = self::get();
        return (string) $settings['client_id'];
    }

    public static function secret_hash() {
        $settings = self::get();
        return (string) $settings['secret_hash'];
    }

    public static function redirect_uri() {
        $settings = self::get();
        return (string) $settings['redirect_uri'];
    }

    public static function translator_url() {
        $settings = self::get();
        return (string) $settings['translator_url'];
    }

    public static function enabled() {
        $settings = self::get();
        return ! empty( $settings['enabled'] );
    }

    public static function register_page() {
        add_options_page(
            'Tun Translator SSO',
            'Tun Translator SSO',
            'manage_options',
            'tun-translator-sso',
            array( __CLASS__, 'render_page' )
        );
    }

    private static function clean_https_url( $value, $fallback ) {
        $url = esc_url_raw( wp_unslash( (string) $value ), array( 'https' ) );
        if ( ! $url || 'https' !== wp_parse_url( $url, PHP_URL_SCHEME ) ) {
            return $fallback;
        }
        return $url;
    }

    public static function save() {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( 'You are not allowed to change Tun Translator SSO settings.', 403 );
        }

        check_admin_referer( 'tun_saas_save_sso_settings' );

        $current = self::get();
        $defaults = self::defaults();
        $current['enabled'] = isset( $_POST['enabled'] ) && '1' === (string) $_POST['enabled'];
        $current['redirect_uri'] = self::clean_https_url(
            isset( $_POST['redirect_uri'] ) ? $_POST['redirect_uri'] : '',
            $defaults['redirect_uri']
        );
        $current['translator_url'] = rtrim(
            self::clean_https_url(
                isset( $_POST['translator_url'] ) ? $_POST['translator_url'] : '',
                $defaults['translator_url']
            ),
            '/'
        );

        update_option( self::OPTION_NAME, $current, false );

        wp_safe_redirect(
            add_query_arg(
                array(
                    'page'    => 'tun-translator-sso',
                    'updated' => '1',
                ),
                admin_url( 'options-general.php' )
            )
        );
        exit;
    }

    private static function base64url( $bytes ) {
        return rtrim( strtr( base64_encode( $bytes ), '+/', '-_' ), '=' );
    }

    public static function generate_credentials() {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( 'You are not allowed to generate Tun Translator SSO credentials.', 403 );
        }

        check_admin_referer( 'tun_saas_generate_sso_credentials' );

        try {
            $client_id = 'tun_translator_' . bin2hex( random_bytes( 16 ) );
            $secret = self::base64url( random_bytes( 32 ) );
        } catch ( Exception $error ) {
            wp_die( 'Secure credential generation failed. Please try again.', 500 );
        }

        $settings = self::get();
        $settings['client_id'] = $client_id;
        $settings['secret_hash'] = wp_hash_password( $secret );
        update_option( self::OPTION_NAME, $settings, false );

        nocache_headers();
        header( 'Content-Type: text/html; charset=' . get_option( 'blog_charset' ) );
        ?>
        <!doctype html>
        <html <?php language_attributes(); ?>>
        <head>
            <meta charset="<?php bloginfo( 'charset' ); ?>">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Tun Translator SSO credentials</title>
            <?php wp_admin_css( 'install', true ); ?>
        </head>
        <body class="wp-core-ui">
            <main style="max-width:760px;margin:50px auto;padding:28px;background:#fff;border:1px solid #dcdcde;">
                <h1>Tun Translator SSO credentials</h1>
                <p><strong>Copy the client secret now.</strong> It is shown only on this page and is not stored in plaintext.</p>
                <p><strong>Client ID</strong></p>
                <p><code style="display:block;padding:12px;word-break:break-all;"><?php echo esc_html( $client_id ); ?></code></p>
                <p><strong>Client secret</strong></p>
                <p><code style="display:block;padding:12px;word-break:break-all;"><?php echo esc_html( $secret ); ?></code></p>
                <p>Store the secret directly in the Supabase Auth custom provider configuration. Do not place it in GitHub, browser JavaScript, or support messages.</p>
                <p><a class="button button-primary" href="<?php echo esc_url( admin_url( 'options-general.php?page=tun-translator-sso' ) ); ?>">Back to SSO settings</a></p>
            </main>
        </body>
        </html>
        <?php
        exit;
    }

    public static function render_page() {
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }

        $settings = self::get();
        $authorize = rest_url( 'tun-sso/v1/authorize' );
        $token = rest_url( 'tun-sso/v1/token' );
        $userinfo = rest_url( 'tun-sso/v1/userinfo' );
        ?>
        <div class="wrap">
            <h1>Tun Translator SSO</h1>
            <?php if ( isset( $_GET['updated'] ) ) : ?>
                <div class="notice notice-success is-dismissible"><p>SSO settings saved.</p></div>
            <?php endif; ?>

            <p>This first-party OAuth client lets the Translator authenticate the same WordPress account used on TunApp. WooCommerce remains the billing authority.</p>

            <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
                <input type="hidden" name="action" value="tun_saas_save_sso_settings">
                <?php wp_nonce_field( 'tun_saas_save_sso_settings' ); ?>
                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row">Provider enabled</th>
                        <td><label><input type="checkbox" name="enabled" value="1" <?php checked( ! empty( $settings['enabled'] ) ); ?>> Allow Translator SSO</label></td>
                    </tr>
                    <tr>
                        <th scope="row">Client ID</th>
                        <td><code><?php echo esc_html( $settings['client_id'] ? $settings['client_id'] : 'Generate credentials below' ); ?></code></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="tun-sso-redirect-uri">Supabase callback URI</label></th>
                        <td><input class="regular-text code" id="tun-sso-redirect-uri" name="redirect_uri" type="url" value="<?php echo esc_attr( $settings['redirect_uri'] ); ?>" required></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="tun-sso-translator-url">Translator URL</label></th>
                        <td><input class="regular-text code" id="tun-sso-translator-url" name="translator_url" type="url" value="<?php echo esc_attr( $settings['translator_url'] ); ?>" required></td>
                    </tr>
                </table>
                <?php submit_button( 'Save SSO settings' ); ?>
            </form>

            <hr>
            <h2>OAuth endpoints</h2>
            <p><strong>Authorization:</strong> <code><?php echo esc_html( $authorize ); ?></code></p>
            <p><strong>Token:</strong> <code><?php echo esc_html( $token ); ?></code></p>
            <p><strong>Userinfo:</strong> <code><?php echo esc_html( $userinfo ); ?></code></p>

            <h2>Client credentials</h2>
            <p>Generating credentials replaces the previous client ID/secret. The new secret will be displayed once.</p>
            <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
                <input type="hidden" name="action" value="tun_saas_generate_sso_credentials">
                <?php wp_nonce_field( 'tun_saas_generate_sso_credentials' ); ?>
                <?php submit_button( $settings['client_id'] ? 'Regenerate client credentials' : 'Generate client credentials', 'secondary' ); ?>
            </form>
        </div>
        <?php
    }
}
