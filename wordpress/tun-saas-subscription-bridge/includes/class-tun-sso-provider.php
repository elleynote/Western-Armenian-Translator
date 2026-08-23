<?php

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class Tun_SSO_Provider {
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

    public static function activate() {
        global $wpdb;

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';

        $table = self::table_name();
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE {$table} (
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
            PRIMARY KEY  (id),
            UNIQUE KEY code_hash (code_hash),
            KEY access_token_hash (access_token_hash),
            KEY code_expires_at (code_expires_at),
            KEY access_token_expires_at (access_token_expires_at)
        ) {$charset_collate};";

        dbDelta( $sql );

        if ( ! wp_next_scheduled( 'tun_saas_sso_cleanup' ) ) {
            wp_schedule_event( time() + HOUR_IN_SECONDS, 'hourly', 'tun_saas_sso_cleanup' );
        }
    }

    private static function table_name() {
        global $wpdb;
        return $wpdb->prefix . self::GRANT_TABLE_SUFFIX;
    }

    public static function register_routes() {
        register_rest_route(
            self::REST_NAMESPACE,
            '/authorize',
            array(
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => array( __CLASS__, 'authorize' ),
                'permission_callback' => '__return_true',
            )
        );

        register_rest_route(
            self::REST_NAMESPACE,
            '/token',
            array(
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => array( __CLASS__, 'token' ),
                'permission_callback' => '__return_true',
            )
        );

        register_rest_route(
            self::REST_NAMESPACE,
            '/userinfo',
            array(
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => array( __CLASS__, 'userinfo' ),
                'permission_callback' => '__return_true',
            )
        );
    }

    private static function no_store_response( $body, $status = 200 ) {
        $response = new WP_REST_Response( $body, $status );
        $response->header( 'Cache-Control', 'no-store' );
        $response->header( 'Pragma', 'no-cache' );
        $response->header( 'X-Content-Type-Options', 'nosniff' );
        return $response;
    }

    private static function oauth_error( $code, $description, $status = 400 ) {
        return self::no_store_response(
            array(
                'error'             => $code,
                'error_description' => $description,
            ),
            $status
        );
    }

    private static function redirect_response( $url ) {
        $response = new WP_REST_Response( null, 302 );
        $response->header( 'Location', $url );
        $response->header( 'Cache-Control', 'no-store' );
        return $response;
    }

    private static function authorize_error( $code, $description, $redirect_uri, $state ) {
        if ( ! self::valid_redirect_uri( $redirect_uri ) ) {
            return self::oauth_error( $code, $description, 400 );
        }

        $args = array( 'error' => $code );
        if ( $state ) {
            $args['state'] = $state;
        }

        return self::redirect_response( add_query_arg( $args, $redirect_uri ) );
    }

    private static function valid_redirect_uri( $redirect_uri ) {
        $configured = Tun_SSO_Settings::redirect_uri();
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

        if ( empty( $requested ) ) {
            $requested = $allowed;
        }

        return implode( ' ', $requested );
    }

    private static function base64url( $bytes ) {
        return rtrim( strtr( base64_encode( $bytes ), '+/', '-_' ), '=' );
    }

    private static function pkce_challenge( $verifier ) {
        return self::base64url( hash( 'sha256', $verifier, true ) );
    }

    private static function random_token() {
        return self::base64url( random_bytes( 32 ) );
    }

    private static function request_ip() {
        $value = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : 'unknown';
        return $value ? $value : 'unknown';
    }

    private static function rate_limited( $bucket, $limit ) {
        $minute = gmdate( 'YmdHi' );
        $key = 'tun_sso_rl_' . substr( hash( 'sha256', $bucket . '|' . self::request_ip() . '|' . $minute ), 0, 32 );
        $count = (int) get_transient( $key );

        if ( $count >= $limit ) {
            return true;
        }

        set_transient( $key, $count + 1, 2 * MINUTE_IN_SECONDS );
        return false;
    }

    private static function configured() {
        return Tun_SSO_Settings::enabled()
            && Tun_SSO_Settings::client_id()
            && Tun_SSO_Settings::secret_hash()
            && Tun_SSO_Settings::redirect_uri();
    }

    public static function authorize( WP_REST_Request $request ) {
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

        if ( ! self::configured() ) {
            return self::authorize_error( 'temporarily_unavailable', 'Tun SSO is not configured.', $redirect_uri, $state );
        }

        if ( ! hash_equals( Tun_SSO_Settings::client_id(), $client_id ) ) {
            return self::authorize_error( 'invalid_client', 'Unknown OAuth client.', $redirect_uri, $state );
        }

        if ( 'code' !== $response_type ) {
            return self::authorize_error( 'unsupported_response_type', 'Only authorization code is supported.', $redirect_uri, $state );
        }

        if ( '' === $state ) {
            return self::authorize_error( 'invalid_request', 'State is required.', $redirect_uri, '' );
        }

        if ( false === $scope ) {
            return self::authorize_error( 'invalid_scope', 'Only profile and email scopes are supported.', $redirect_uri, $state );
        }

        if ( 'S256' !== $code_challenge_method || ! preg_match( '/^[A-Za-z0-9_-]{43,128}$/', $code_challenge ) ) {
            return self::authorize_error( 'invalid_request', 'PKCE S256 is required.', $redirect_uri, $state );
        }

        if ( ! is_user_logged_in() ) {
            $resume = add_query_arg(
                array(
                    'client_id'             => $client_id,
                    'redirect_uri'          => $redirect_uri,
                    'response_type'         => 'code',
                    'state'                 => $state,
                    'code_challenge'        => $code_challenge,
                    'code_challenge_method' => 'S256',
                    'scope'                 => $scope,
                ),
                rest_url( self::REST_NAMESPACE . '/authorize' )
            );
            return self::redirect_response( wp_login_url( $resume ) );
        }

        try {
            $code = self::random_token();
        } catch ( Exception $error ) {
            return self::authorize_error( 'server_error', 'Authorization could not be created.', $redirect_uri, $state );
        }

        global $wpdb;
        $inserted = $wpdb->insert(
            self::table_name(),
            array(
                'user_id'         => get_current_user_id(),
                'client_id'       => $client_id,
                'redirect_uri'    => $redirect_uri,
                'scope'           => $scope,
                'code_hash'       => hash( 'sha256', $code ),
                'code_challenge'  => $code_challenge,
                'code_expires_at' => gmdate( 'Y-m-d H:i:s', time() + self::AUTH_CODE_TTL ),
                'created_at'      => gmdate( 'Y-m-d H:i:s' ),
            ),
            array( '%d', '%s', '%s', '%s', '%s', '%s', '%s', '%s' )
        );

        if ( false === $inserted ) {
            return self::authorize_error( 'server_error', 'Authorization could not be stored.', $redirect_uri, $state );
        }

        return self::redirect_response(
            add_query_arg(
                array(
                    'code'  => $code,
                    'state' => $state,
                ),
                $redirect_uri
            )
        );
    }

    public static function token( WP_REST_Request $request ) {
        if ( self::rate_limited( 'token', 600 ) ) {
            return self::oauth_error( 'temporarily_unavailable', 'Too many token requests.', 429 );
        }

        if ( ! self::configured() ) {
            return self::oauth_error( 'invalid_client', 'Tun SSO is not configured.', 401 );
        }

        $grant_type = trim( (string) $request->get_param( 'grant_type' ) );
        $client_id = trim( (string) $request->get_param( 'client_id' ) );
        $client_secret = (string) $request->get_param( 'client_secret' );
        $code = trim( (string) $request->get_param( 'code' ) );
        $redirect_uri = trim( (string) $request->get_param( 'redirect_uri' ) );
        $verifier = trim( (string) $request->get_param( 'code_verifier' ) );

        if ( 'authorization_code' !== $grant_type ) {
            return self::oauth_error( 'unsupported_grant_type', 'Only authorization_code is supported.', 400 );
        }

        if ( ! hash_equals( Tun_SSO_Settings::client_id(), $client_id ) || ! wp_check_password( $client_secret, Tun_SSO_Settings::secret_hash() ) ) {
            return self::oauth_error( 'invalid_client', 'Client authentication failed.', 401 );
        }

        if ( ! self::valid_redirect_uri( $redirect_uri ) || ! preg_match( '/^[A-Za-z0-9\-._~]{43,128}$/', $verifier ) || '' === $code ) {
            return self::oauth_error( 'invalid_grant', 'The authorization grant is invalid.', 400 );
        }

        global $wpdb;
        $table = self::table_name();
        $row = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE code_hash = %s LIMIT 1",
                hash( 'sha256', $code )
            ),
            ARRAY_A
        );

        if ( ! $row || ! empty( $row['code_used_at'] ) || strtotime( $row['code_expires_at'] . ' UTC' ) <= time() ) {
            return self::oauth_error( 'invalid_grant', 'The authorization grant is expired or already used.', 400 );
        }

        if ( ! hash_equals( (string) $row['client_id'], $client_id ) || ! hash_equals( (string) $row['redirect_uri'], $redirect_uri ) ) {
            return self::oauth_error( 'invalid_grant', 'The authorization grant does not match this client.', 400 );
        }

        $calculated_challenge = self::pkce_challenge( $verifier );
        if ( ! hash_equals( (string) $row['code_challenge'], $calculated_challenge ) ) {
            return self::oauth_error( 'invalid_grant', 'PKCE verification failed.', 400 );
        }

        try {
            $access_token = self::random_token();
        } catch ( Exception $error ) {
            return self::oauth_error( 'server_error', 'Access token creation failed.', 500 );
        }

        $now = gmdate( 'Y-m-d H:i:s' );
        $expires = gmdate( 'Y-m-d H:i:s', time() + self::ACCESS_TOKEN_TTL );
        $updated = $wpdb->query(
            $wpdb->prepare(
                "UPDATE {$table}
                 SET code_used_at = %s, access_token_hash = %s, access_token_expires_at = %s
                 WHERE id = %d AND code_used_at IS NULL AND code_expires_at > UTC_TIMESTAMP()",
                $now,
                hash( 'sha256', $access_token ),
                $expires,
                (int) $row['id']
            )
        );

        if ( 1 !== $updated ) {
            return self::oauth_error( 'invalid_grant', 'The authorization grant was already consumed.', 400 );
        }

        return self::no_store_response(
            array(
                'access_token' => $access_token,
                'token_type'   => 'Bearer',
                'expires_in'   => self::ACCESS_TOKEN_TTL,
                'scope'        => (string) $row['scope'],
            )
        );
    }

    public static function userinfo( WP_REST_Request $request ) {
        if ( self::rate_limited( 'userinfo', 1200 ) ) {
            return self::oauth_error( 'temporarily_unavailable', 'Too many userinfo requests.', 429 );
        }

        $authorization = trim( (string) $request->get_header( 'authorization' ) );
        if ( ! preg_match( '/^Bearer\s+(.+)$/i', $authorization, $matches ) ) {
            return self::oauth_error( 'invalid_token', 'A bearer access token is required.', 401 );
        }

        $token = trim( $matches[1] );
        if ( '' === $token ) {
            return self::oauth_error( 'invalid_token', 'A bearer access token is required.', 401 );
        }

        global $wpdb;
        $table = self::table_name();
        $row = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$table}
                 WHERE access_token_hash = %s
                   AND access_token_expires_at > UTC_TIMESTAMP()
                 LIMIT 1",
                hash( 'sha256', $token )
            ),
            ARRAY_A
        );

        if ( ! $row ) {
            return self::oauth_error( 'invalid_token', 'The access token is invalid or expired.', 401 );
        }

        $user = get_user_by( 'id', (int) $row['user_id'] );
        if ( ! $user ) {
            return self::oauth_error( 'invalid_token', 'The Tun account no longer exists.', 401 );
        }

        return self::no_store_response(
            array(
                'sub'               => (string) $user->ID,
                'id'                => (string) $user->ID,
                'wordpress_user_id' => (int) $user->ID,
                'email'             => (string) $user->user_email,
                'name'              => (string) $user->display_name,
            )
        );
    }

    public static function cleanup_expired_grants() {
        global $wpdb;
        $table = self::table_name();
        $wpdb->query(
            "DELETE FROM {$table}
             WHERE (access_token_expires_at IS NOT NULL AND access_token_expires_at < UTC_TIMESTAMP())
                OR (access_token_expires_at IS NULL AND code_expires_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 HOUR))"
        );
    }

    private static function cart_contains_mapped_product() {
        if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
            return false;
        }

        foreach ( WC()->cart->get_cart() as $cart_item ) {
            $product_id = isset( $cart_item['product_id'] ) ? absint( $cart_item['product_id'] ) : 0;
            $variation_id = isset( $cart_item['variation_id'] ) ? absint( $cart_item['variation_id'] ) : 0;
            if ( tun_saas_is_mapped_product( $product_id, $variation_id ) ) {
                return true;
            }
        }

        return false;
    }

    public static function require_registration_for_mapped_cart( $required ) {
        if ( is_user_logged_in() ) {
            return $required;
        }
        return self::cart_contains_mapped_product() ? true : $required;
    }

    public static function enable_registration_for_mapped_cart( $enabled ) {
        if ( is_user_logged_in() ) {
            return $enabled;
        }
        return self::cart_contains_mapped_product() ? true : $enabled;
    }

    public static function attach_post_checkout_identity( $order_id, $posted_data, $order ) {
        if ( ! is_a( $order, 'WC_Order' ) ) {
            $order = wc_get_order( $order_id );
        }

        if ( ! is_a( $order, 'WC_Order' ) || ! tun_saas_order_has_mapped_product( $order ) ) {
            return;
        }

        $wordpress_user_id = absint( $order->get_customer_id() );
        if ( $wordpress_user_id ) {
            $order->update_meta_data( TUN_SAAS_WORDPRESS_USER_META_KEY, $wordpress_user_id );
            $order->save();
        }
    }

    public static function render_continue_to_translator( $order_id ) {
        if ( ! $order_id || ! function_exists( 'wc_get_order' ) ) {
            return;
        }

        $order = wc_get_order( $order_id );
        if ( ! is_a( $order, 'WC_Order' ) || ! tun_saas_order_has_mapped_product( $order ) ) {
            return;
        }

        $translator = Tun_SSO_Settings::translator_url();
        if ( ! $translator ) {
            return;
        }

        $url = rtrim( $translator, '/' ) . '/auth/tun?next=%2Fdashboard';
        echo '<p class="tun-saas-continue-to-translator" style="margin-top:24px;">';
        echo '<a class="button" href="' . esc_url( $url ) . '">' . esc_html__( 'Continue to Translator', 'tun-saas-subscription-bridge' ) . '</a>';
        echo '</p>';
    }
}
