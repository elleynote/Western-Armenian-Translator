# Tun SaaS Subscription Bridge

This WordPress/WooCommerce plugin supports both the existing Translator-first checkout flow and the new Tun-first identity foundation.

It does **not** process payments, store card data, call Supabase directly, or contain secrets. WooCommerce/WooPayments remains the billing source of truth.

## What version 1.1.0 does

- Preserves the existing short-lived `tun_checkout` token flow for authenticated Translator users.
- Stores the logged-in Tun/WordPress user ID on mapped Person/Elite orders as private meta `_tun_wordpress_user_id` when WooCommerce has a real customer account.
- Copies the private WordPress user ID onto the WooCommerce Subscription so the existing signed subscription webhook can receive it.
- Normalizes mapped Person/Elite cart products to quantity 1 even when there is no legacy `tun_checkout` token. This prepares the checkout for the future direct `/pricing -> TunApp` journey.
- Never grants Translator access by itself. Supabase only grants paid access from the verified WooCommerce subscription webhook.

## Installation

1. Zip the `tun-saas-subscription-bridge` folder so the PHP file is at the root of the ZIP.
2. In WordPress Admin open **Plugins > Add New Plugin > Upload Plugin**.
3. Upload the ZIP and activate **Tun SaaS Subscription Bridge**.
4. Leave the existing WooCommerce webhook enabled:
   - Topic: `Subscription updated`
   - Delivery URL: `https://indgjoridkhnazitubom.supabase.co/functions/v1/woocommerce-webhook`

No WordPress secret or API credential is required by this plugin.

## Current legacy account-link flow

1. An authenticated Translator user chooses Person or Elite.
2. `woocommerce-checkout` creates a 30-minute opaque token and stores only its SHA-256 hash in Supabase.
3. The browser is redirected to the mapped `tunapp.com` checkout URL with `tun_checkout=<token>`.
4. This plugin stores the token on the WooCommerce order and subscription as private meta `_tun_checkout_token`.
5. The signed WooCommerce subscription webhook returns that private meta to Supabase.
6. Supabase verifies the WooCommerce HMAC signature, hashes the returned token, resolves the exact Supabase user and selected server-owned product mapping, and consumes the checkout session.
7. WooCommerce `active` grants the mapped SaaS plan. Leaving `active` removes paid SaaS access according to the current project rule.

## Tun-first identity foundation

For a future direct Tun checkout where the customer does not yet have a Translator/Supabase account:

1. WooCommerce creates or uses the Tun WordPress account during checkout.
2. This plugin stores the WordPress user ID on the mapped order/subscription when available.
3. The signed WooCommerce webhook sends the subscription, Woo customer ID, private WordPress user ID, product and status to Supabase.
4. If a verified `tun_identity_links` mapping already exists, Supabase attaches the subscription to that existing Supabase Auth user.
5. If no verified identity link exists yet, Supabase stores the verified subscription state in `woocommerce_pending_entitlements` instead of trusting email or losing the purchase.
6. A later Tun OAuth/OIDC reconciliation stage will create/link the normal Supabase Auth user and consume the pending entitlement.

The plugin does not treat the WordPress user ID as an authentication token. It is only a stable account identifier transported inside the signed WooCommerce lifecycle flow.
