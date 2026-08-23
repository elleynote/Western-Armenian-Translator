# TunApp Custom SSO Provider Design

## Goal

Replace the miniOrange dependency with a first-party SSO provider implemented inside the existing Tun SaaS Subscription Bridge WordPress plugin, while preserving WooCommerce as the billing authority and Supabase Auth as the Translator session/user authority.

The desired customer flow is:

1. User visits Translator pricing.
2. User clicks Person or Elite.
3. Browser goes directly to TunApp WooCommerce checkout.
4. User logs in to an existing TunApp account or creates one during checkout.
5. User completes payment.
6. WooCommerce creates/updates the subscription and sends the signed webhook to Supabase.
7. Supabase stores or updates the entitlement, using the Stage 1 pending-entitlement path if the TunApp identity is not linked yet.
8. User returns to the Translator.
9. Translator starts TunApp SSO.
10. TunApp confirms the logged-in WordPress user and returns a short-lived OAuth authorization code.
11. Supabase Custom OAuth exchanges the code server-side, creates/links a normal Supabase Auth user, and issues the normal Translator session.
12. The Translator reconciles the stable TunApp/WordPress identity with any pending WooCommerce entitlement.
13. WooCommerce `active` unlocks Person/Elite; every other Woo status resolves to Free.

## Non-goals

- Do not replace Supabase Auth or Supabase user UUIDs.
- Do not let WordPress mint Supabase sessions directly.
- Do not let OAuth login determine paid access.
- Do not copy payment history into Supabase as a second billing source of truth.
- Do not remove legacy Stripe tables/data.
- Do not remove the existing `tun_checkout` path during migration.
- Do not auto-merge ambiguous existing Translator accounts by billing email.
- Do not implement a general-purpose multi-client OAuth platform in v2.0.
- Do not implement OIDC/JWKS unless generic OAuth proves insufficient for Supabase Custom OAuth.

## Authority boundaries

### TunApp WordPress

TunApp is the identity authority for this SSO flow. The stable provider subject is the numeric WordPress user ID represented as a string. The provider proves only identity.

### WooCommerce

WooCommerce remains the sole billing/entitlement authority. A paid plan is granted only when the signed Woo subscription webhook reports `status === active` for one of the server-owned mapped products:

- Product `13793` -> `premium` / Person
- Product `13794` -> `business` / Elite

Any other Woo status resolves to Free immediately, preserving the current production rule.

### Supabase Auth

Supabase Auth remains the Translator session and internal identity authority. A TunApp OAuth login must terminate in a normal Supabase session and a normal `auth.users.id` UUID so existing RLS, history, vocabulary, decks, saved phrases, admin rules, translation usage, widgets, and all other user-owned tables continue to work unchanged.

## WordPress plugin scope

The existing plugin becomes **Tun SaaS Subscription & SSO Bridge v2.0**. It has four focused responsibilities:

1. Preserve the existing Woo checkout-token bridge for backward compatibility.
2. Attach stable WordPress/Woo account identity metadata to mapped orders/subscriptions.
3. Expose a narrowly-scoped OAuth 2.0 authorization-code provider for the Translator.
4. Provide a safe post-payment continuation path back to the Translator.

The plugin must contain no Supabase service-role key, no OpenAI key, no Woo payment secret, and no client secret exposed to browser JavaScript.

## OAuth protocol choice

Use OAuth 2.0 Authorization Code with PKCE (S256), plus a confidential client secret for the Supabase server-side token exchange.

Version 2.0 intentionally implements only one first-party OAuth client: the Translator/Supabase project. This avoids miniOrange licensing and removes unnecessary multi-client complexity.

The plugin exposes these endpoints:

- `GET /wp-json/tun-sso/v1/authorize`
- `POST /wp-json/tun-sso/v1/token`
- `GET /wp-json/tun-sso/v1/userinfo`

### `/authorize`

Required query values:

- `client_id`
- `redirect_uri`
- `response_type=code`
- `state`
- `code_challenge`
- `code_challenge_method=S256`
- optional `scope`, limited to `profile email`

Validation rules:

- `client_id` must exactly match the one configured Translator client.
- `redirect_uri` must exactly match the configured Supabase callback URI.
- `response_type` must be `code`.
- PKCE is mandatory and only `S256` is accepted.
- `state` must be present and returned unchanged to the registered redirect URI.
- Unknown scopes are rejected.

If no WordPress user is logged in, the endpoint redirects to the normal TunApp WordPress login page with `redirect_to` set to the complete original authorize URL. After successful login the authorization request resumes.

Because TunApp and the Translator are first-party products, v2.0 does not add a separate consent screen. The endpoint automatically authorizes only the fixed first-party Translator client and only the minimal `profile email` scope.

On success, generate a cryptographically random single-use authorization code, store only its SHA-256 hash, and redirect to the registered callback with `code` and the original `state`.

Authorization-code lifetime: 5 minutes.

### `/token`

Accept `application/x-www-form-urlencoded` POST values:

- `grant_type=authorization_code`
- `client_id`
- `client_secret`
- `code`
- `redirect_uri`
- `code_verifier`

Validation rules:

- client ID must match the configured Translator client.
- client secret must verify against the stored one-way password hash.
- code hash must resolve to an unused, unexpired grant.
- redirect URI must exactly equal the URI bound to that grant.
- `code_verifier` must reproduce the stored S256 PKCE challenge.
- code may be consumed once only.

On success, atomically mark the authorization code used, generate a cryptographically random bearer access token, store only its SHA-256 hash, and return JSON compatible with a standard OAuth provider:

```json
{
  "access_token": "<opaque token>",
  "token_type": "Bearer",
  "expires_in": 600,
  "scope": "profile email"
}
```

Access-token lifetime: 10 minutes. No refresh token is issued because Supabase only needs the provider token long enough to obtain the user profile and create its own session.

### `/userinfo`

Require `Authorization: Bearer <token>`.

Hash the supplied token and resolve an unexpired grant. Return only the minimum identity payload:

```json
{
  "sub": "123",
  "id": "123",
  "wordpress_user_id": 123,
  "email": "person@example.com",
  "name": "Display Name"
}
```

`sub` is the WordPress user ID converted to a string. It is immutable for the lifetime of that TunApp account and becomes the provider subject stored in Supabase identity linking.

Do not claim `email_verified=true` unless TunApp later adds a real email-verification process that can prove it. Billing email is not an identity key.

## OAuth client configuration storage

The plugin has one settings panel for the first-party Translator client.

Stored settings:

- generated client ID
- one-way hash of the client secret
- exact allowed Supabase callback URI
- Translator return URL
- enabled/disabled flag

The client secret is generated with cryptographically secure randomness. Plaintext is shown once immediately after generation/regeneration so the administrator can paste it into Supabase Auth configuration. The plaintext secret is never written to GitHub and should not be pasted into ChatGPT.

Regenerating the secret invalidates the previous secret.

The initial registered OAuth redirect URI is:

`https://indgjoridkhnazitubom.supabase.co/auth/v1/callback`

The initial Translator return origin is:

`https://western-armenian-translator.netlify.app`

Both are admin settings so they can be deliberately updated later without code edits.

## OAuth grant storage

Create one WordPress database table, using the installation's real table prefix:

`{prefix}tun_sso_grants`

Columns conceptually include:

- primary key
- `user_id`
- `client_id`
- `redirect_uri`
- `scope`
- `code_hash`
- `code_challenge`
- `code_expires_at`
- `code_used_at`
- `access_token_hash`
- `access_token_expires_at`
- `created_at`

Security requirements:

- never store raw authorization codes
- never store raw bearer tokens
- never store the raw client secret
- indexed lookups on code hash and access-token hash
- authorization-code consumption must be atomic
- expired grants are removed by a scheduled cleanup job

## WooCommerce account requirement

Mapped SaaS products must not be purchasable as anonymous guest-owned subscriptions.

For carts containing products `13793` or `13794`, the plugin must require WooCommerce account creation/login. Existing TunApp users may log in; new buyers may create a TunApp account during checkout if Woo registration is enabled.

When the mapped order/subscription is created, the bridge stores `_tun_wordpress_user_id` using the Woo customer/WordPress user ID. Stage 1 behavior remains intact.

If a mapped order somehow has no stable WordPress customer ID, the plugin does not invent one from billing email. The signed webhook records the entitlement as unmatched/pending and access is not granted until a secure identity link exists.

## Supabase Custom OAuth configuration

Supabase Auth will be configured with a custom provider named conceptually `custom:tunapp` using:

- Authorization URL: `https://tunapp.com/wp-json/tun-sso/v1/authorize`
- Token URL: `https://tunapp.com/wp-json/tun-sso/v1/token`
- Userinfo URL: `https://tunapp.com/wp-json/tun-sso/v1/userinfo`
- Client ID: generated by the plugin
- Client secret: generated by the plugin and entered only in Supabase Auth configuration
- Scopes: `profile email`

Before frontend implementation, verify the currently pinned `@supabase/supabase-js` version (`2.57.4`) supports the custom-provider identifier/types used by the current Supabase Auth API. If not, make the smallest compatible Supabase JS update; do not perform an unrelated dependency upgrade.

## Translator frontend flow

The current email/password login remains available during migration.

Add a Tun login action using Supabase `signInWithOAuth` with the custom Tun provider and a Translator `redirectTo` route.

Paid pricing buttons are switched to direct TunApp Woo product checkout only after the provider and reconciliation path are remotely proven. Until that point, the current Translator-authenticated checkout path remains available as rollback.

After successful OAuth callback, the normal Supabase client receives a normal session. The app then invokes the authenticated reconciliation function described below and refreshes the effective plan.

## Identity reconciliation

Add an authenticated Supabase Edge Function named `tun-identity-reconcile`.

Inputs from the browser are not trusted as identity proof. The function derives the current Supabase user from the bearer JWT and inspects the authenticated Supabase user's provider identities server-side.

For the Tun provider, obtain the provider subject. Because this provider defines `sub` as the numeric WordPress user ID string, the function can safely derive:

- provider = `tunapp`
- provider_subject = WordPress user ID string
- wordpress_user_id = parsed positive integer

The function then performs an idempotent transaction-like reconciliation:

1. Create/update `tun_identity_links` for the current Supabase UUID and provider subject.
2. Reject any attempt to bind one Tun provider subject to a different Supabase UUID.
3. Find a pending Woo entitlement by `wordpress_user_id`, falling back to an already-known Woo customer link only when unambiguous.
4. If an entitlement is found, attach/update the normal `subscriptions` row for the current Supabase user.
5. Mark the pending entitlement linked.
6. Refresh the user's effective plan using the existing Woo status rule.
7. Return the reconciliation state to the frontend.

Billing email may be logged as informational metadata but is not used as permanent account ownership proof.

## Webhook behavior

The Stage 1 webhook remains the billing entry point. Its account-resolution priority remains:

1. valid legacy `tun_checkout` token
2. known Tun/WordPress identity link
3. known Woo customer link
4. pending entitlement

A supplied invalid legacy checkout token must still fail closed and must not silently fall back to email matching.

The webhook continues to validate Woo HMAC signatures and idempotency before changing entitlement state.

## Post-payment return

The Woo order-received page for mapped products gains a prominent **Continue to Translator** action pointing to the configured Translator return URL.

The return URL itself does not grant access and does not carry a trusted plan/user value. Its purpose is only to start/continue Tun SSO in the Translator.

For v2.0, use an explicit button rather than a forced automatic redirect. This lets Woo finish the order-received experience cleanly and avoids trapping users if the Translator is temporarily unavailable. A later UX iteration may add an optional timed redirect after remote testing.

## Existing Translator users

Do not delete or replace existing password-auth users.

New Tun-first buyers can create/link a normal Supabase user through the provider flow. Existing Translator accounts remain usable with email/password while the new flow is introduced.

Do not auto-merge duplicate or conflicting Supabase accounts solely because their email matches a TunApp account. Existing-user linking/migration is a separate controlled stage after the new-user path is proven.

## Error handling

Provider endpoints return standard OAuth-style errors without secrets or stack traces.

Examples:

- invalid client -> `invalid_client`
- invalid/expired/used code -> `invalid_grant`
- unsupported response type -> `unsupported_response_type`
- invalid scope -> `invalid_scope`
- malformed request -> `invalid_request`

Authorization errors redirect only to a previously validated registered redirect URI. If the redirect URI itself is invalid, return an HTTP error locally and do not redirect.

The Translator must treat failed reconciliation as Free access and display a retryable account-link message rather than granting paid features optimistically.

## Security requirements

- Exact redirect URI allowlisting; no wildcard redirect URIs.
- Mandatory PKCE S256.
- Cryptographically random authorization codes, client secrets, and access tokens.
- Store hashes only for codes/tokens/client secret.
- Single-use authorization codes with 5-minute expiry.
- 10-minute access tokens; no refresh token.
- HTTPS-only production endpoints.
- Constant-time or password-hash verification for secrets.
- No Supabase service-role secret in WordPress.
- No browser-supplied WordPress user ID accepted as identity proof.
- No paid access from OAuth success alone.
- No paid access from checkout success/return URL alone.
- Only signed Woo webhook state controls entitlement.
- Existing webhook idempotency and HMAC validation remain mandatory.
- One Tun provider subject cannot be linked to two Supabase users.
- Do not log raw OAuth codes, access tokens, client secrets, Woo checkout tokens, or Supabase JWTs.
- Add lightweight rate limiting to `/token` and `/userinfo` to reduce brute-force/abuse risk.

## Rollout sequence

### Stage 2A - WordPress SSO provider foundation

Upgrade the bridge to v2.0 with settings, grant storage, `/authorize`, `/token`, `/userinfo`, account-required checkout behavior, cleanup, and Continue to Translator action. Keep existing v1.1 Woo bridge behavior.

Do not switch Translator pricing yet.

### Stage 2B - Supabase provider configuration

Generate the WordPress client ID/secret in the plugin. Configure Supabase Custom OAuth manually with the exact endpoints. Never commit the secret.

### Stage 2C - Translator SSO + reconcile

Add `tun-identity-reconcile`, the Tun login action/callback completion flow, and effective-plan refresh.

### Stage 2D - Remote end-to-end proof

Test on real hosted environments without local testing:

- new Tun buyer -> Person
- new Tun buyer -> Elite
- OAuth login with no paid subscription -> Free
- webhook arrives before first SSO
- SSO occurs before webhook
- duplicate webhook delivery
- cancel/on-hold/expired -> Free
- invalid OAuth code/token -> no session/no access

### Stage 2E - Switch paid pricing

Only after 2D passes, change Translator Person/Elite pricing buttons to direct TunApp checkout URLs.

Keep the legacy authenticated checkout path available until the client approves the new flow.

## Success criteria

The work is successful when a new user can start from Translator pricing, create/login to a TunApp account while purchasing, pay in WooCommerce, return to the Translator, authenticate with the same TunApp account, receive a normal Supabase session, and have Person/Elite features unlocked only after the signed Woo subscription status is `active`.

No second Translator password is required for the new Tun-first buyer, and cancelling/leaving `active` removes paid Translator access according to the existing rule.
