<?php
/**
 * Plugin Name: Tun Translator SSO Bridge
 * Plugin URI: https://tunapp.com/
 * Description: First-party TunApp OAuth SSO and WooCommerce subscription identity bridge for the Western Armenian Translator.
 * Version: 3.1.0
 * Requires at least: 6.5
 * Requires PHP: 7.4
 * Requires Plugins: woocommerce
 * Author: Tun
 * Update URI: https://tunapp.com/tun-translator-sso-bridge
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class Tun_Translator_SSO_Settings {
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

    private static function base64url( $bytes ) {
        return rtrim( strtr( base64_encode( $bytes ), '+/', '-_' ), '=' );
    }

    public static function save() {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( 'You are not allowed to change Tun Translator SSO settings.', 'Forbidden', array( 'response' => 403 ) );
        }
        check_admin_referer( 'tun_saas_save_sso_settings' );

        $settings = self::get();
        $defaults = self::defaults();
        $settings['enabled'] = isset( $_POST['enabled'] ) && '1' === (string) $_POST['enabled'];
        $settings['redirect_uri'] = self::clean_https_url(
            isset( $_POST['redirect_uri'] ) ? $_POST['redirect_uri'] : '',
            $defaults['redirect_uri']
        );
        $settings['translator_url'] = rtrim(
            self::clean_https_url(
                isset( $_POST['translator_url'] ) ? $_POST['translator_url'] : '',
                $defaults['translator_url']
            ),
            '/'
        );
        update_option( self::OPTION_NAME, $settings, false );

        wp_safe_redirect( add_query_arg( array( 'page' => 'tun-translator-sso', 'updated' => '1' ), admin_url( 'options-general.php' ) ) );
        exit;
    }

    public static function generate_credentials() {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( 'You are not allowed to generate Tun Translator SSO credentials.', 'Forbidden', array( 'response' => 403 ) );
        }
        check_admin_referer( 'tun_saas_generate_sso_credentials' );

        try {
            $client_id = 'tun_translator_' . bin2hex( random_bytes( 16 ) );
            $secret = self::base64url( random_bytes( 32 ) );
        } catch ( Throwable $error ) {
            wp_die( 'Secure credential generation failed. Please try again.', 'Credential generation failed', array( 'response' => 500 ) );
        }

        $settings = self::get();
        $settings['client_id'] = $client_id;
        $settings['secret_hash'] = wp_hash_password( $secret );
        update_option( self::OPTION_NAME, $settings, false );

        nocache_headers();
        header( 'Content-Type: text/html; charset=' . get_option( 'blog_charset' ) );
        echo '<!doctype html><html><head><meta charset="' . esc_attr( get_option( 'blog_charset' ) ) . '"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tun Translator SSO credentials</title></head><body style="font-family:sans-serif;padding:40px">';
        echo '<main style="max-width:760px;margin:auto"><h1>Tun Translator SSO credentials</h1>';
        echo '<p><strong>Copy the client secret now.</strong> It is shown only once and is not stored in plaintext.</p>';
        echo '<p><strong>Client ID</strong></p><code style="display:block;word-break:break-all">' . esc_html( $client_id ) . '</code>';
        echo '<p><strong>Client secret</strong></p><code style="display:block;word-break:break-all">' . esc_html( $secret ) . '</code>';
        echo '<p>Paste the secret directly into Supabase Auth. Do not place it in GitHub or browser code.</p>';
        echo '<p><a href="' . esc_url( admin_url( 'options-general.php?page=tun-translator-sso' ) ) . '">Back to SSO settings</a></p></main></body></html>';
        exit;
    }

    public static function render_page() {
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }
        $settings = self::get();
        ?>
        <div class="wrap">
            <h1>Tun Translator SSO</h1>
            <?php if ( isset( $_GET['updated'] ) ) : ?><div class="notice notice-success is-dismissible"><p>SSO settings saved.</p></div><?php endif; ?>
            <p>This first-party OAuth provider lets the Translator authenticate the same WordPress account used on TunApp. WooCommerce remains the billing authority.</p>
            <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
                <input type="hidden" name="action" value="tun_saas_save_sso_settings">
                <?php wp_nonce_field( 'tun_saas_save_sso_settings' ); ?>
                <table class="form-table" role="presentation">
                    <tr><th scope="row">Provider enabled</th><td><label><input type="checkbox" name="enabled" value="1" <?php checked( ! empty( $settings['enabled'] ) ); ?>> Allow Translator SSO</label></td></tr>
                    <tr><th scope="row">Client ID</th><td><code><?php echo esc_html( $settings['client_id'] ? $settings['client_id'] : 'Generate credentials below' ); ?></code></td></tr>
                    <tr><th scope="row"><label for="tun-sso-redirect-uri">Supabase callback URI</label></th><td><input class="regular-text code" id="tun-sso-redirect-uri" name="redirect_uri" type="url" value="<?php echo esc_attr( $settings['redirect_uri'] ); ?>" required></td></tr>
                    <tr><th scope="row"><label for="tun-sso-translator-url">Translator URL</label></th><td><input class="regular-text code" id="tun-sso-translator-url" name="translator_url" type="url" value="<?php echo esc_attr( $settings['translator_url'] ); ?>" required></td></tr>
                </table>
                <?php submit_button( 'Save SSO settings' ); ?>
            </form>
            <hr><h2>OAuth endpoints</h2>
            <p><strong>Authorization:</strong> <code><?php echo esc_html( rest_url( 'tun-sso/v1/authorize' ) ); ?></code></p>
            <p><strong>Token:</strong> <code><?php echo esc_html( rest_url( 'tun-sso/v1/token' ) ); ?></code></p>
            <p><strong>Userinfo:</strong> <code><?php echo esc_html( rest_url( 'tun-sso/v1/userinfo' ) ); ?></code></p>
            <h2>Client credentials</h2>
            <p>Generating credentials replaces the previous client ID and secret. The new secret is displayed once.</p>
            <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
                <input type="hidden" name="action" value="tun_saas_generate_sso_credentials">
                <?php wp_nonce_field( 'tun_saas_generate_sso_credentials' ); ?>
                <?php submit_button( $settings['client_id'] ? 'Regenerate client credentials' : 'Generate client credentials', 'secondary' ); ?>
            </form>
        </div>
        <?php
    }
}

final class Tun_Translator_SSO_Bridge {
    const VERSION = '3.1.0';
    const INSTALL_OPTION = 'tun_translator_sso_install_v310';
    const INSTALL_ERROR_OPTION = 'tun_translator_sso_install_error_v310';
    const CHECKOUT_QUERY_KEY = 'tun_checkout';
    const CHECKOUT_META_KEY = '_tun_checkout_token';
    const WORDPRESS_USER_KEY = '_tun_wordpress_user_id';

    public static function init() {
        add_action( 'wp_loaded', array( __CLASS__, 'capture_checkout_token' ), 12 );
        add_filter( 'woocommerce_add_to_cart_validation', array( __CLASS__, 'prepare_plan_add_to_cart' ), 5, 5 );
        add_action( 'woocommerce_add_to_cart', array( __CLASS__, 'normalize_plan_after_add' ), 100, 6 );
        add_filter( 'woocommerce_is_sold_individually', array( __CLASS__, 'sell_plan_individually' ), 20, 2 );
        add_action( 'woocommerce_checkout_create_order', array( __CLASS__, 'attach_metadata_to_order' ), 20, 2 );
        add_action( 'woocommerce_store_api_checkout_order_processed', array( __CLASS__, 'attach_metadata_to_store_order' ), 20, 1 );
        add_action( 'woocommerce_checkout_subscription_created', array( __CLASS__, 'copy_metadata_to_subscription' ), 20, 3 );
        add_action( 'woocommerce_thankyou', array( __CLASS__, 'clear_checkout_token' ), 20, 1 );
        add_action( 'admin_init', array( __CLASS__, 'maybe_install_schema' ), 50 );
        add_action( 'admin_notices', array( __CLASS__, 'admin_notice' ) );
    }

    public static function mapped_product_ids() {
        return array( 13793, 13794 );
    }

    public static function is_mapped_product( $product_id, $variation_id = 0 ) {
        $mapped = self::mapped_product_ids();
        return in_array( absint( $product_id ), $mapped, true ) || in_array( absint( $variation_id ), $mapped, true );
    }

    public static function order_has_mapped_product( $order ) {
        if ( ! is_a( $order, 'WC_Order' ) ) {
            return false;
        }
        foreach ( $order->get_items() as $item ) {
            if ( is_a( $item, 'WC_Order_Item_Product' ) && self::is_mapped_product( $item->get_product_id(), $item->get_variation_id() ) ) {
                return true;
            }
        }
        return false;
    }

    public static function cart_contains_mapped_product() {
        if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
            return false;
        }
        foreach ( WC()->cart->get_cart() as $cart_item ) {
            $product_id = isset( $cart_item['product_id'] ) ? absint( $cart_item['product_id'] ) : 0;
            $variation_id = isset( $cart_item['variation_id'] ) ? absint( $cart_item['variation_id'] ) : 0;
            if ( self::is_mapped_product( $product_id, $variation_id ) ) {
                return true;
            }
        }
        return false;
    }

    private static function clean_checkout_token( $value ) {
        $value = is_string( $value ) ? strtolower( trim( wp_unslash( $value ) ) ) : '';
        return preg_match( '/^[a-f0-9]{64}$/', $value ) ? $value : '';
    }

    private static function active_checkout_token() {
        if ( ! function_exists( 'WC' ) || ! WC()->session ) {
            return '';
        }
        return self::clean_checkout_token( WC()->session->get( self::CHECKOUT_META_KEY ) );
    }

    public static function capture_checkout_token() {
        if ( ! function_exists( 'WC' ) || ! WC()->session || ! isset( $_GET[ self::CHECKOUT_QUERY_KEY ] ) ) {
            return;
        }
        $token = self::clean_checkout_token( $_GET[ self::CHECKOUT_QUERY_KEY ] );
        if ( $token ) {
            WC()->session->set( self::CHECKOUT_META_KEY, $token );
        }
    }

    public static function prepare_plan_add_to_cart( $passed, $product_id, $quantity, $variation_id = 0, $variation = array() ) {
        if ( ! $passed || ! self::is_mapped_product( $product_id, $variation_id ) ) {
            return $passed;
        }
        if ( function_exists( 'WC' ) && WC()->cart ) {
            foreach ( WC()->cart->get_cart() as $cart_item_key => $cart_item ) {
                $cart_product_id = isset( $cart_item['product_id'] ) ? absint( $cart_item['product_id'] ) : 0;
                $cart_variation_id = isset( $cart_item['variation_id'] ) ? absint( $cart_item['variation_id'] ) : 0;
                if ( self::is_mapped_product( $cart_product_id, $cart_variation_id ) ) {
                    WC()->cart->remove_cart_item( $cart_item_key );
                }
            }
        }
        return true;
    }

    public static function normalize_plan_after_add( $cart_item_key, $product_id, $quantity, $variation_id, $variation, $cart_item_data ) {
        if ( ! self::is_mapped_product( $product_id, $variation_id ) || ! function_exists( 'WC' ) || ! WC()->cart ) {
            return;
        }
        foreach ( WC()->cart->get_cart() as $other_key => $cart_item ) {
            $cart_product_id = isset( $cart_item['product_id'] ) ? absint( $cart_item['product_id'] ) : 0;
            $cart_variation_id = isset( $cart_item['variation_id'] ) ? absint( $cart_item['variation_id'] ) : 0;
            if ( $other_key !== $cart_item_key && self::is_mapped_product( $cart_product_id, $cart_variation_id ) ) {
                WC()->cart->remove_cart_item( $other_key );
            }
        }
        if ( isset( WC()->cart->cart_contents[ $cart_item_key ] ) ) {
            WC()->cart->set_quantity( $cart_item_key, 1, false );
        }
    }

    public static function sell_plan_individually( $sold_individually, $product ) {
        if ( $sold_individually || ! is_a( $product, 'WC_Product' ) ) {
            return $sold_individually;
        }
        return self::is_mapped_product( $product->get_id(), $product->get_parent_id() );
    }

    private static function order_wordpress_user_id( $order ) {
        if ( ! is_a( $order, 'WC_Order' ) ) {
            return 0;
        }
        $customer_id = absint( $order->get_customer_id() );
        return $customer_id ? $customer_id : absint( get_current_user_id() );
    }

    public static function attach_metadata_to_order( $order, $data ) {
        if ( ! is_a( $order, 'WC_Order' ) || ! self::order_has_mapped_product( $order ) ) {
            return;
        }
        $token = self::active_checkout_token();
        if ( $token ) {
            $order->update_meta_data( self::CHECKOUT_META_KEY, $token );
        }
        $wordpress_user_id = self::order_wordpress_user_id( $order );
        if ( $wordpress_user_id ) {
            $order->update_meta_data( self::WORDPRESS_USER_KEY, $wordpress_user_id );
        }
    }

    public static function attach_metadata_to_store_order( $order ) {
        if ( ! is_a( $order, 'WC_Order' ) || ! self::order_has_mapped_product( $order ) ) {
            return;
        }
        self::attach_metadata_to_order( $order, array() );
        $order->save();
    }

    public static function copy_metadata_to_subscription( $subscription, $order, $recurring_cart ) {
        if ( ! is_a( $subscription, 'WC_Subscription' ) || ! is_a( $order, 'WC_Order' ) ) {
            return;
        }
        $token = self::clean_checkout_token( $order->get_meta( self::CHECKOUT_META_KEY, true ) );
        if ( ! $token ) {
            $token = self::active_checkout_token();
        }
        if ( $token ) {
            $subscription->update_meta_data( self::CHECKOUT_META_KEY, $token );
        }
        $wordpress_user_id = absint( $order->get_meta( self::WORDPRESS_USER_KEY, true ) );
        if ( ! $wordpress_user_id ) {
            $wordpress_user_id = self::order_wordpress_user_id( $order );
        }
        if ( $wordpress_user_id ) {
            $subscription->update_meta_data( self::WORDPRESS_USER_KEY, $wordpress_user_id );
        }
        $subscription->save();
    }

    public static function clear_checkout_token( $order_id ) {
        if ( function_exists( 'WC' ) && WC()->session ) {
            WC()->session->__unset( self::CHECKOUT_META_KEY );
        }
    }

    public static function maybe_install_schema() {
        if ( ! current_user_can( 'manage_options' ) || get_option( self::INSTALL_OPTION ) === self::VERSION ) {
            return;
        }
        try {
            Tun_Translator_SSO_Provider::ensure_schema();
            update_option( self::INSTALL_OPTION, self::VERSION, false );
            delete_option( self::INSTALL_ERROR_OPTION );
        } catch ( Throwable $error ) {
            update_option( self::INSTALL_ERROR_OPTION, 'Tun SSO database setup could not complete. Please contact the site administrator.', false );
        }
    }

    public static function admin_notice() {
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }
        $message = get_option( self::INSTALL_ERROR_OPTION );
        if ( is_string( $message ) && '' !== trim( $message ) ) {
            echo '<div class="notice notice-error"><p><strong>Tun Translator SSO:</strong> ' . esc_html( $message ) . '</p></div>';
        }
    }
}

final class Tun_Translator_SSO_Provider {
    const REST_NAMESPACE = 'tun-sso/v1';
    const GRANT_TABLE_SUFFIX = 'tun_sso_grants';
    const AUTH_CODE_TTL = 300;
    const ACCESS_TOKEN_TTL = 600;

    public static function init() {
        add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
        add_action( 'tun_saas_sso_cleanup', array( __CLASS__, 'cleanup_expired_grants' ) );
        add_filter( 'woocommerce_checkout_registration_required', array( __CLASS__, 'require_registration_for_mapped_cart' ) );
        add_filter( 'woocommerce_checkout_registration_enabled', array( __CLASS__, 'enable_registration_for_mapped_cart' ) );
        add_action( 'woocommerce_checkout_order_processed', array( __CLASS__, 'attach_post_checkout_identity' ), 30, 3 );
        add_action( 'woocommerce_thankyou', array( __CLASS__, 'render_continue_to_translator' ), 40, 1 );
    }

    private static function table_name() {
        global $wpdb;
        return $wpdb->prefix . self::GRANT_TABLE_SUFFIX;
    }

    public static function ensure_schema() {
        global $wpdb;
        $table = self::table_name();
        $charset_collate = $wpdb->get_charset_collate();
        $sql = "CREATE TABLE IF NOT EXISTS {$table} (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            user_id bigint(20) unsigned NOT NULL,
            client_id varchar(128) NOT NULL,
            redirect_uri text NOT NULL,
            scope varchar(255) NOT NULL,
            code_hash char(64) NOT NULL,
            code_challenge varchar(128) NOT NULL,
            code_expires_at datetime NOT NULL,
            code_used_at datetime NULL,
            access_token_hash char(64) NULL,
            access_token_expires_at datetime NULL,
            created_at datetime NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY code_hash (code_hash),
            KEY access_token_hash (access_token_hash),
            KEY code_expires_at (code_expires_at),
            KEY access_token_expires_at (access_token_expires_at)
        ) {$charset_collate}";
        if ( false === $wpdb->query( $sql ) ) {
            throw new RuntimeException( 'Could not create Tun SSO grant table.' );
        }
        if ( ! wp_next_scheduled( 'tun_saas_sso_cleanup' ) ) {
            wp_schedule_event( time() + HOUR_IN_SECONDS, 'hourly', 'tun_saas_sso_cleanup' );
        }
    }

    public static function register_routes() {
        register_rest_route( self::REST_NAMESPACE, '/authorize', array( 'methods' => WP_REST_Server::READABLE, 'callback' => array( __CLASS__, 'authorize' ), 'permission_callback' => '__return_true' ) );
        register_rest_route( self::REST_NAMESPACE, '/token', array( 'methods' => WP_REST_Server::CREATABLE, 'callback' => array( __CLASS__, 'token' ), 'permission_callback' => '__return_true' ) );
        register_rest_route( self::REST_NAMESPACE, '/userinfo', array( 'methods' => WP_REST_Server::READABLE, 'callback' => array( __CLASS__, 'userinfo' ), 'permission_callback' => '__return_true' ) );
    }

    private static function response( $body, $status = 200 ) {
        $response = new WP_REST_Response( $body, $status );
        $response->header( 'Cache-Control', 'no-store' );
        $response->header( 'Pragma', 'no-cache' );
        $response->header( 'X-Content-Type-Options', 'nosniff' );
        return $response;
    }

    private static function oauth_error( $code, $description, $status = 400 ) {
        return self::response( array( 'error' => $code, 'error_description' => $description ), $status );
    }

    private static function redirect_response( $url ) {
        $response = new WP_REST_Response( null, 302 );
        $response->header( 'Location', $url );
        $response->header( 'Cache-Control', 'no-store' );
        return $response;
    }

    private static function valid_redirect_uri( $redirect_uri ) {
        $configured = Tun_Translator_SSO_Settings::redirect_uri();
        return $configured && is_string( $redirect_uri ) && hash_equals( $configured, $redirect_uri );
    }

    private static function clean_scope( $scope ) {
        $requested = preg_split( '/\s+/', trim( (string) $scope ) );
        $requested = array_values( array_unique( array_filter( $requested ) ) );
        $allowed = array( 'profile', 'email' );
        foreach ( $requested as $item ) {
            if ( ! in_array( $item, $allowed, true ) ) {
                return false;
            }
        }
        return implode( ' ', empty( $requested ) ? $allowed : $requested );
    }

    private static function base64url( $bytes ) {
        return rtrim( strtr( base64_encode( $bytes ), '+/', '-_' ), '=' );
    }

    private static function random_token() {
        return self::base64url( random_bytes( 32 ) );
    }

    private static function pkce_challenge( $verifier ) {
        return self::base64url( hash( 'sha256', $verifier, true ) );
    }

    private static function configured() {
        return Tun_Translator_SSO_Settings::enabled()
            && Tun_Translator_SSO_Settings::client_id()
            && Tun_Translator_SSO_Settings::secret_hash()
            && Tun_Translator_SSO_Settings::redirect_uri();
    }

    public static function authorize( $request ) {
        $client_id = trim( (string) $request->get_param( 'client_id' ) );
        $redirect_uri = trim( (string) $request->get_param( 'redirect_uri' ) );
        $response_type = trim( (string) $request->get_param( 'response_type' ) );
        $state = trim( (string) $request->get_param( 'state' ) );
        $code_challenge = trim( (string) $request->get_param( 'code_challenge' ) );
        $code_challenge_method = trim( (string) $request->get_param( 'code_challenge_method' ) );
        $scope = self::clean_scope( $request->get_param( 'scope' ) );

        if ( ! self::valid_redirect_uri( $redirect_uri ) ) {
            return self::oauth_error( 'invalid_request', 'The redirect URI is not registered.', 400 );
        }
        if ( ! self::configured() || ! hash_equals( Tun_Translator_SSO_Settings::client_id(), $client_id ) ) {
            return self::oauth_error( 'invalid_client', 'Unknown or disabled OAuth client.', 401 );
        }
        if ( 'code' !== $response_type || '' === $state || false === $scope ) {
            return self::oauth_error( 'invalid_request', 'The authorization request is invalid.', 400 );
        }
        if ( 'S256' !== $code_challenge_method || ! preg_match( '/^[A-Za-z0-9_-]{43,128}$/', $code_challenge ) ) {
            return self::oauth_error( 'invalid_request', 'PKCE S256 is required.', 400 );
        }
        if ( ! is_user_logged_in() ) {
            $resume = add_query_arg( array(
                'client_id' => $client_id,
                'redirect_uri' => $redirect_uri,
                'response_type' => 'code',
                'state' => $state,
                'code_challenge' => $code_challenge,
                'code_challenge_method' => 'S256',
                'scope' => $scope,
            ), rest_url( self::REST_NAMESPACE . '/authorize' ) );
            return self::redirect_response( wp_login_url( $resume ) );
        }

        try {
            $code = self::random_token();
        } catch ( Throwable $error ) {
            return self::oauth_error( 'server_error', 'Authorization could not be created.', 500 );
        }

        global $wpdb;
        $inserted = $wpdb->insert( self::table_name(), array(
            'user_id' => get_current_user_id(),
            'client_id' => $client_id,
            'redirect_uri' => $redirect_uri,
            'scope' => $scope,
            'code_hash' => hash( 'sha256', $code ),
            'code_challenge' => $code_challenge,
            'code_expires_at' => gmdate( 'Y-m-d H:i:s', time() + self::AUTH_CODE_TTL ),
            'created_at' => gmdate( 'Y-m-d H:i:s' ),
        ) );
        if ( false === $inserted ) {
            return self::oauth_error( 'server_error', 'Authorization could not be stored.', 500 );
        }
        return self::redirect_response( add_query_arg( array( 'code' => $code, 'state' => $state ), $redirect_uri ) );
    }

    private static function client_credentials( $request ) {
        $authorization = trim( (string) $request->get_header( 'Authorization' ) );
        if ( preg_match( '/^Basic\s+(.+)$/i', $authorization, $matches ) ) {
            $decoded = base64_decode( $matches[1], true );
            if ( false !== $decoded && false !== strpos( $decoded, ':' ) ) {
                return explode( ':', $decoded, 2 );
            }
        }
        return array( trim( (string) $request->get_param( 'client_id' ) ), (string) $request->get_param( 'client_secret' ) );
    }

    public static function token( $request ) {
        if ( ! self::configured() ) {
            return self::oauth_error( 'invalid_client', 'Tun SSO is not configured.', 401 );
        }
        list( $client_id, $client_secret ) = self::client_credentials( $request );
        $grant_type = trim( (string) $request->get_param( 'grant_type' ) );
        $code = trim( (string) $request->get_param( 'code' ) );
        $redirect_uri = trim( (string) $request->get_param( 'redirect_uri' ) );
        $verifier = trim( (string) $request->get_param( 'code_verifier' ) );

        if ( 'authorization_code' !== $grant_type ) {
            return self::oauth_error( 'unsupported_grant_type', 'Only authorization_code is supported.', 400 );
        }
        if ( ! hash_equals( Tun_Translator_SSO_Settings::client_id(), trim( (string) $client_id ) ) || ! wp_check_password( (string) $client_secret, Tun_Translator_SSO_Settings::secret_hash() ) ) {
            return self::oauth_error( 'invalid_client', 'Client authentication failed.', 401 );
        }
        if ( ! self::valid_redirect_uri( $redirect_uri ) || ! preg_match( '/^[A-Za-z0-9\-._~]{43,128}$/', $verifier ) || '' === $code ) {
            return self::oauth_error( 'invalid_grant', 'The authorization grant is invalid.', 400 );
        }

        global $wpdb;
        $table = self::table_name();
        $row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE code_hash = %s LIMIT 1", hash( 'sha256', $code ) ), ARRAY_A );
        if ( ! $row || ! empty( $row['code_used_at'] ) || strtotime( $row['code_expires_at'] . ' UTC' ) <= time() ) {
            return self::oauth_error( 'invalid_grant', 'The authorization grant is expired or already used.', 400 );
        }
        if ( ! hash_equals( (string) $row['client_id'], trim( (string) $client_id ) ) || ! hash_equals( (string) $row['redirect_uri'], $redirect_uri ) || ! hash_equals( (string) $row['code_challenge'], self::pkce_challenge( $verifier ) ) ) {
            return self::oauth_error( 'invalid_grant', 'The authorization grant does not match this client.', 400 );
        }

        try {
            $access_token = self::random_token();
        } catch ( Throwable $error ) {
            return self::oauth_error( 'server_error', 'Access token creation failed.', 500 );
        }

        $updated = $wpdb->query( $wpdb->prepare(
            "UPDATE {$table} SET code_used_at = %s, access_token_hash = %s, access_token_expires_at = %s WHERE id = %d AND code_used_at IS NULL AND code_expires_at > UTC_TIMESTAMP()",
            gmdate( 'Y-m-d H:i:s' ),
            hash( 'sha256', $access_token ),
            gmdate( 'Y-m-d H:i:s', time() + self::ACCESS_TOKEN_TTL ),
            (int) $row['id']
        ) );
        if ( 1 !== $updated ) {
            return self::oauth_error( 'invalid_grant', 'The authorization grant was already consumed.', 400 );
        }
        return self::response( array( 'access_token' => $access_token, 'token_type' => 'Bearer', 'expires_in' => self::ACCESS_TOKEN_TTL, 'scope' => (string) $row['scope'] ) );
    }

    public static function userinfo( $request ) {
        $authorization = trim( (string) $request->get_header( 'Authorization' ) );
        if ( ! preg_match( '/^Bearer\s+(.+)$/i', $authorization, $matches ) ) {
            return self::oauth_error( 'invalid_token', 'A bearer access token is required.', 401 );
        }
        $token = trim( (string) $matches[1] );
        global $wpdb;
        $table = self::table_name();
        $row = $wpdb->get_row( $wpdb->prepare(
            "SELECT * FROM {$table} WHERE access_token_hash = %s AND access_token_expires_at > UTC_TIMESTAMP() LIMIT 1",
            hash( 'sha256', $token )
        ), ARRAY_A );
        if ( ! $row ) {
            return self::oauth_error( 'invalid_token', 'The access token is invalid or expired.', 401 );
        }
        $user = get_user_by( 'id', (int) $row['user_id'] );
        if ( ! $user ) {
            return self::oauth_error( 'invalid_token', 'The Tun account no longer exists.', 401 );
        }
        return self::response( array(
            'sub' => (string) $user->ID,
            'id' => (string) $user->ID,
            'wordpress_user_id' => (int) $user->ID,
            'email' => (string) $user->user_email,
            'name' => (string) $user->display_name,
        ) );
    }

    public static function cleanup_expired_grants() {
        global $wpdb;
        $table = self::table_name();
        $wpdb->query( "DELETE FROM {$table} WHERE (access_token_expires_at IS NOT NULL AND access_token_expires_at < UTC_TIMESTAMP()) OR (access_token_expires_at IS NULL AND code_expires_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 HOUR))" );
    }

    public static function require_registration_for_mapped_cart( $required ) {
        if ( is_user_logged_in() ) {
            return $required;
        }
        return Tun_Translator_SSO_Bridge::cart_contains_mapped_product() ? true : $required;
    }

    public static function enable_registration_for_mapped_cart( $enabled ) {
        if ( is_user_logged_in() ) {
            return $enabled;
        }
        return Tun_Translator_SSO_Bridge::cart_contains_mapped_product() ? true : $enabled;
    }

    public static function attach_post_checkout_identity( $order_id, $posted_data, $order ) {
        if ( ! is_a( $order, 'WC_Order' ) && function_exists( 'wc_get_order' ) ) {
            $order = wc_get_order( $order_id );
        }
        if ( ! is_a( $order, 'WC_Order' ) || ! Tun_Translator_SSO_Bridge::order_has_mapped_product( $order ) ) {
            return;
        }
        $wordpress_user_id = absint( $order->get_customer_id() );
        if ( $wordpress_user_id ) {
            $order->update_meta_data( Tun_Translator_SSO_Bridge::WORDPRESS_USER_KEY, $wordpress_user_id );
            $order->save();
        }
    }

    public static function render_continue_to_translator( $order_id ) {
        if ( ! $order_id || ! function_exists( 'wc_get_order' ) ) {
            return;
        }
        $order = wc_get_order( $order_id );
        if ( ! is_a( $order, 'WC_Order' ) || ! Tun_Translator_SSO_Bridge::order_has_mapped_product( $order ) ) {
            return;
        }
        $translator = Tun_Translator_SSO_Settings::translator_url();
        if ( ! $translator ) {
            return;
        }

        $url = rtrim( $translator, '/' ) . '/auth/tun?checkout=1&next=%2Fdashboard';
        $paid = method_exists( $order, 'is_paid' ) && $order->is_paid();

        echo '<div class="tun-saas-continue-to-translator" style="margin-top:24px;">';
        if ( $paid ) {
            echo '<p>' . esc_html__( 'Payment confirmed. Connecting you to the Translator…', 'tun-translator-sso-bridge' ) . '</p>';
        }
        echo '<p><a class="button" href="' . esc_url( $url ) . '">' . esc_html__( 'Continue to Translator', 'tun-translator-sso-bridge' ) . '</a></p>';
        echo '</div>';

        if ( $paid ) {
            echo '<script>(function(){var u=' . wp_json_encode( $url ) . ';window.setTimeout(function(){window.location.assign(u);},2500);}());</script>';
        }
    }
}

Tun_Translator_SSO_Settings::init();
Tun_Translator_SSO_Bridge::init();
Tun_Translator_SSO_Provider::init();
