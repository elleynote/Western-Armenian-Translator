# Tun SaaS Subscription & SSO Bridge

Version 2.0 adds a first-party TunApp OAuth 2.0 provider to the existing WooCommerce subscription bridge. It supports the client flow:

**Translator → TunApp account/checkout → WooCommerce subscription → signed Supabase webhook → Tun SSO → normal Supabase session → paid access only when Woo status is `active`.**

The plugin does **not** process payments, store card data, mint Supabase sessions, contain a Supabase service-role key, or decide whether a customer is paid. WooCommerce remains the billing/entitlement source of truth and Supabase Auth remains the Translator session authority.

## Existing Woo bridge behavior preserved

- Preserves the short-lived `tun_checkout` token flow for the current Translator-first checkout.
- Stores the Tun/WordPress user ID as private meta `_tun_wordpress_user_id` on mapped Person/Elite orders/subscriptions when WooCommerce has a real customer account.
- Normalizes mapped products `13793` and `13794` to one plan item.
- Requires a real Woo/WordPress account for mapped plan checkout so direct Tun-first purchases do not become anonymous subscriptions.
- Never grants Translator access from checkout success alone.

## First-party OAuth endpoints

The plugin exposes one fixed first-party OAuth client for the Translator:

- Authorization: `https://tunapp.com/wp-json/tun-sso/v1/authorize`
- Token: `https://tunapp.com/wp-json/tun-sso/v1/token`
- Userinfo: `https://tunapp.com/wp-json/tun-sso/v1/userinfo`

The provider implements Authorization Code + mandatory PKCE S256. Authorization codes are single-use, expire after five minutes, and are stored only as SHA-256 hashes. Opaque access tokens expire after ten minutes and are also stored only as SHA-256 hashes. No refresh token is issued.

The userinfo response contains only the stable WordPress user ID (`sub`), `id`, `wordpress_user_id`, email and display name. It does not claim `email_verified=true`.

## WordPress SSO settings

After activation open:

**Settings → Tun Translator SSO**

Default callback URI:

`https://indgjoridkhnazitubom.supabase.co/auth/v1/callback`

Default Translator URL:

`https://western-armenian-translator.netlify.app`

Use **Generate client credentials** once. The plugin generates a random client ID and 32-byte client secret. Only the WordPress password hash of the secret is stored. The plaintext secret is displayed once on the immediate admin response so it can be copied directly into Supabase Auth.

Do not place the client secret in GitHub, browser JavaScript, WordPress source files, support messages, or chat. Regenerating credentials invalidates the previous client ID/secret.

## Supabase Custom OAuth configuration

Configure a generic/custom OAuth provider in Supabase Auth with the provider identifier `custom:tunapp` and these values:

- Authorization URL: `https://tunapp.com/wp-json/tun-sso/v1/authorize`
- Token URL: `https://tunapp.com/wp-json/tun-sso/v1/token`
- Userinfo URL: `https://tunapp.com/wp-json/tun-sso/v1/userinfo`
- Client ID: generated in WordPress
- Client secret: one-time value generated in WordPress
- Scopes: `profile email`

The callback must exactly match the configured WordPress callback URI. Wildcard callback URLs are intentionally not accepted by the plugin.

## WooCommerce subscription flow

For mapped Person/Elite products:

1. WooCommerce requires login/account creation.
2. The plugin transports `_tun_wordpress_user_id` onto the order and subscription.
3. The existing signed Woo subscription webhook sends the verified billing state to Supabase.
4. If a Tun identity link exists, the webhook updates that Supabase user's subscription.
5. If SSO has not happened yet, the webhook stores the verified state in `woocommerce_pending_entitlements`.
6. After Tun SSO, `tun-identity-reconcile` binds the verified provider subject to the normal Supabase user and consumes the pending entitlement.
7. Woo `active` grants the mapped plan. Any other Woo status resolves to Free according to the current product rule.

Billing email is informational only and is not treated as durable account ownership proof.

## Post-payment continuation

Mapped Woo order-received pages show **Continue to Translator**. The link points only to the configured Translator `/auth/tun` route and contains no trusted plan, payment, or user assertion. The Translator must complete Tun SSO and Supabase entitlement reconciliation before paid features are available.

## Legacy checkout rollback

The existing Translator-authenticated `tun_checkout` path remains intact while the new hosted flow is tested. The Translator pricing page must not be switched to direct Tun checkout until the SSO/reconciliation path is proven remotely.

## Security notes

- Exact redirect URI allowlist; no wildcard callbacks.
- PKCE S256 is mandatory.
- Client secret is stored only through `wp_hash_password`.
- Authorization codes and access tokens are stored only as SHA-256 hashes.
- No Supabase service-role credential is stored in WordPress.
- OAuth identity alone cannot grant Person/Elite access.
- Only the signed WooCommerce subscription webhook controls paid entitlement state.
- The plugin does not log raw OAuth codes, access tokens, client secrets, Woo checkout tokens, or Supabase JWTs.
