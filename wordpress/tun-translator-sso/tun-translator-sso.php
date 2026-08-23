<?php
/**
 * Plugin Name: Tun Translator SSO Bridge
 * Description: TunApp checkout identity and first-party OAuth SSO bridge for the Translator.
 * Version: 2.1.0
 * Author: Tun
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

const TUN_TRANSLATOR_SSO_VERSION = '2.1.0';
const TUN_TRANSLATOR_SSO_INSTALL_OPTION = 'tun_translator_sso_install_v210';
const TUN_TRANSLATOR_SSO_INSTALL_ERROR_OPTION = 'tun_translator_sso_install_error_v210';
const TUN_SAAS_CHECKOUT_QUERY_KEY       = 'tun_checkout';
const TUN_SAAS_CHECKOUT_META_KEY        = '_tun_checkout_token';
const TUN_SAAS_WORDPRESS_USER_META_KEY  = '_tun_wordpress_user_id';

require_once __DIR__ . '/includes/class-tun-sso-settings.php';
require_once __DIR__ . '/includes/class-tun-sso-provider.php';

Tun_SSO_Settings::init();
Tun_SSO_Provider::init();

function tun_saas_mapped_product_ids() {
    return array( 13793, 13794 );
}

function tun_saas_clean_checkout_token( $value ) {
    $value = is_string( $value ) ? strtolower( trim( wp_unslash( $value ) ) ) : '';
    return preg_match( '/^[a-f0-9]{64}$/', $value ) ? $value : '';
}

function tun_saas_active_checkout_token() {
    if ( ! function_exists( 'WC' ) || ! WC()->session ) {
        return '';
    }

    return tun_saas_clean_checkout_token( WC()->session->get( TUN_SAAS_CHECKOUT_META_KEY ) );
}

function tun_saas_is_mapped_product( $product_id, $variation_id = 0 ) {
    $mapped = tun_saas_mapped_product_ids();
    return in_array( absint( $product_id ), $mapped, true ) ||
        in_array( absint( $variation_id ), $mapped, true );
}

function tun_saas_order_has_mapped_product( $order ) {
    if ( ! is_a( $order, 'WC_Order' ) ) {
        return false;
    }

    foreach ( $order->get_items() as $item ) {
        if ( ! is_a( $item, 'WC_Order_Item_Product' ) ) {
            continue;
        }

        if ( tun_saas_is_mapped_product( $item->get_product_id(), $item->get_variation_id() ) ) {
            return true;
        }
    }

    return false;
}

function tun_saas_order_wordpress_user_id( $order ) {
    if ( ! is_a( $order, 'WC_Order' ) ) {
        return 0;
    }

    $customer_id = absint( $order->get_customer_id() );
    if ( $customer_id ) {
        return $customer_id;
    }

    return absint( get_current_user_id() );
}

function tun_saas_capture_checkout_token() {
    if ( ! function_exists( 'WC' ) || ! WC()->session ) {
        return;
    }

    if ( ! isset( $_GET[ TUN_SAAS_CHECKOUT_QUERY_KEY ] ) ) {
        return;
    }

    $token = tun_saas_clean_checkout_token( $_GET[ TUN_SAAS_CHECKOUT_QUERY_KEY ] );
    if ( $token ) {
        WC()->session->set( TUN_SAAS_CHECKOUT_META_KEY, $token );
    }
}
add_action( 'wp_loaded', 'tun_saas_capture_checkout_token', 12 );

function tun_saas_prepare_plan_add_to_cart( $passed, $product_id, $quantity, $variation_id = 0, $variation = array() ) {
    if ( ! $passed || ! tun_saas_is_mapped_product( $product_id, $variation_id ) ) {
        return $passed;
    }

    if ( function_exists( 'WC' ) && WC()->cart ) {
        foreach ( WC()->cart->get_cart() as $cart_item_key => $cart_item ) {
            $cart_product_id   = isset( $cart_item['product_id'] ) ? absint( $cart_item['product_id'] ) : 0;
            $cart_variation_id = isset( $cart_item['variation_id'] ) ? absint( $cart_item['variation_id'] ) : 0;

            if ( tun_saas_is_mapped_product( $cart_product_id, $cart_variation_id ) ) {
                WC()->cart->remove_cart_item( $cart_item_key );
            }
        }
    }

    return true;
}
add_filter( 'woocommerce_add_to_cart_validation', 'tun_saas_prepare_plan_add_to_cart', 5, 5 );

function tun_saas_normalize_plan_after_add( $cart_item_key, $product_id, $quantity, $variation_id, $variation, $cart_item_data ) {
    if ( ! tun_saas_is_mapped_product( $product_id, $variation_id ) ) {
        return;
    }

    if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
        return;
    }

    foreach ( WC()->cart->get_cart() as $other_key => $cart_item ) {
        $cart_product_id   = isset( $cart_item['product_id'] ) ? absint( $cart_item['product_id'] ) : 0;
        $cart_variation_id = isset( $cart_item['variation_id'] ) ? absint( $cart_item['variation_id'] ) : 0;

        if ( $other_key !== $cart_item_key && tun_saas_is_mapped_product( $cart_product_id, $cart_variation_id ) ) {
            WC()->cart->remove_cart_item( $other_key );
        }
    }

    if ( isset( WC()->cart->cart_contents[ $cart_item_key ] ) ) {
        WC()->cart->set_quantity( $cart_item_key, 1, false );
    }
}
add_action( 'woocommerce_add_to_cart', 'tun_saas_normalize_plan_after_add', 100, 6 );

function tun_saas_sell_checkout_plan_individually( $sold_individually, $product ) {
    if ( $sold_individually || ! is_a( $product, 'WC_Product' ) ) {
        return $sold_individually;
    }

    return tun_saas_is_mapped_product( $product->get_id(), $product->get_parent_id() );
}
add_filter( 'woocommerce_is_sold_individually', 'tun_saas_sell_checkout_plan_individually', 20, 2 );

function tun_saas_add_token_to_order( $order, $data ) {
    if ( ! function_exists( 'WC' ) || ! WC()->session || ! is_a( $order, 'WC_Order' ) ) {
        return;
    }

    $token = tun_saas_active_checkout_token();
    if ( $token ) {
        $order->update_meta_data( TUN_SAAS_CHECKOUT_META_KEY, $token );
    }
}
add_action( 'woocommerce_checkout_create_order', 'tun_saas_add_token_to_order', 20, 2 );

function tun_saas_attach_identity_to_order( $order, $data = array() ) {
    if ( ! is_a( $order, 'WC_Order' ) || ! tun_saas_order_has_mapped_product( $order ) ) {
        return;
    }

    $wordpress_user_id = tun_saas_order_wordpress_user_id( $order );
    if ( $wordpress_user_id ) {
        $order->update_meta_data( TUN_SAAS_WORDPRESS_USER_META_KEY, $wordpress_user_id );
    }
}
add_action( 'woocommerce_checkout_create_order', 'tun_saas_attach_identity_to_order', 30, 2 );

function tun_saas_add_token_to_store_api_order( $order ) {
    if ( ! function_exists( 'WC' ) || ! WC()->session || ! is_a( $order, 'WC_Order' ) ) {
        return;
    }

    $token = tun_saas_active_checkout_token();
    if ( $token ) {
        $order->update_meta_data( TUN_SAAS_CHECKOUT_META_KEY, $token );
        $order->save();
    }
}
add_action( 'woocommerce_store_api_checkout_order_processed', 'tun_saas_add_token_to_store_api_order', 20, 1 );

function tun_saas_attach_identity_to_store_api_order( $order ) {
    if ( ! is_a( $order, 'WC_Order' ) || ! tun_saas_order_has_mapped_product( $order ) ) {
        return;
    }

    $wordpress_user_id = tun_saas_order_wordpress_user_id( $order );
    if ( $wordpress_user_id ) {
        $order->update_meta_data( TUN_SAAS_WORDPRESS_USER_META_KEY, $wordpress_user_id );
        $order->save();
    }
}
add_action( 'woocommerce_store_api_checkout_order_processed', 'tun_saas_attach_identity_to_store_api_order', 30, 1 );

function tun_saas_copy_token_to_subscription( $subscription, $order, $recurring_cart ) {
    if ( ! is_a( $subscription, 'WC_Subscription' ) || ! is_a( $order, 'WC_Order' ) ) {
        return;
    }

    $token = tun_saas_clean_checkout_token( $order->get_meta( TUN_SAAS_CHECKOUT_META_KEY, true ) );
    if ( ! $token ) {
        $token = tun_saas_active_checkout_token();
    }

    if ( $token ) {
        $subscription->update_meta_data( TUN_SAAS_CHECKOUT_META_KEY, $token );
        $subscription->save();
    }
}
add_action( 'woocommerce_checkout_subscription_created', 'tun_saas_copy_token_to_subscription', 20, 3 );

function tun_saas_copy_identity_to_subscription( $subscription, $order, $recurring_cart ) {
    if ( ! is_a( $subscription, 'WC_Subscription' ) || ! is_a( $order, 'WC_Order' ) ) {
        return;
    }

    $wordpress_user_id = absint( $order->get_meta( TUN_SAAS_WORDPRESS_USER_META_KEY, true ) );
    if ( ! $wordpress_user_id ) {
        $wordpress_user_id = tun_saas_order_wordpress_user_id( $order );
    }

    if ( $wordpress_user_id ) {
        $subscription->update_meta_data( TUN_SAAS_WORDPRESS_USER_META_KEY, $wordpress_user_id );
        $subscription->save();
    }
}
add_action( 'woocommerce_checkout_subscription_created', 'tun_saas_copy_identity_to_subscription', 30, 3 );

function tun_saas_clear_checkout_token( $order_id ) {
    if ( function_exists( 'WC' ) && WC()->session ) {
        WC()->session->__unset( TUN_SAAS_CHECKOUT_META_KEY );
    }
}
add_action( 'woocommerce_thankyou', 'tun_saas_clear_checkout_token', 20, 1 );

function tun_translator_sso_maybe_install() {
    if ( ! current_user_can( 'manage_options' ) ) {
        return;
    }

    if ( get_option( TUN_TRANSLATOR_SSO_INSTALL_OPTION ) === TUN_TRANSLATOR_SSO_VERSION ) {
        return;
    }

    try {
        Tun_SSO_Provider::activate();
        update_option( TUN_TRANSLATOR_SSO_INSTALL_OPTION, TUN_TRANSLATOR_SSO_VERSION, false );
        delete_option( TUN_TRANSLATOR_SSO_INSTALL_ERROR_OPTION );
    } catch ( Throwable $error ) {
        update_option(
            TUN_TRANSLATOR_SSO_INSTALL_ERROR_OPTION,
            'Tun SSO database setup could not complete: ' . sanitize_text_field( $error->getMessage() ),
            false
        );
    }
}
add_action( 'admin_init', 'tun_translator_sso_maybe_install', 50 );

function tun_translator_sso_admin_notice() {
    if ( ! current_user_can( 'manage_options' ) ) {
        return;
    }

    $message = get_option( TUN_TRANSLATOR_SSO_INSTALL_ERROR_OPTION );
    if ( ! is_string( $message ) || '' === trim( $message ) ) {
        return;
    }

    echo '<div class="notice notice-error"><p><strong>Tun Translator SSO:</strong> ' . esc_html( $message ) . '</p></div>';
}
add_action( 'admin_notices', 'tun_translator_sso_admin_notice' );
