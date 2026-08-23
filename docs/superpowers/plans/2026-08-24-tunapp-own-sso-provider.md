# TunApp Custom SSO Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a first-party TunApp OAuth 2.0 provider inside the existing WordPress bridge, connect it to Supabase Auth, reconcile WooCommerce entitlements to normal Supabase users, and add a Translator SSO entry flow without switching paid pricing yet.

**Architecture:** WordPress proves TunApp identity through a fixed first-party OAuth Authorization Code + PKCE provider. Supabase Auth remains the Translator session authority, and an authenticated Edge Function calls an atomic database reconciliation RPC to bind the verified Tun provider subject to the existing Stage 1 Woo pending-entitlement foundation. WooCommerce remains the sole paid-access authority.

**Tech Stack:** WordPress/PHP, WooCommerce + WooCommerce Subscriptions, OAuth 2.0 Authorization Code + PKCE S256, PostgreSQL/Supabase Auth/RLS, Supabase Edge Functions/Deno/TypeScript, Next.js 16/React 19/TypeScript.

**Spec:** `docs/superpowers/specs/2026-08-24-tunapp-own-sso-provider-design.md`

## Global Constraints

- Work only on `feature/tun-sso-identity-foundation`; do not modify `main`.
- Do not mutate the production database from ChatGPT. New migrations are committed only; the user applies them manually.
- Do not switch `/pricing` to the direct Tun checkout until hosted SSO + reconciliation is proven.
- Preserve the legacy `tun_checkout` path and all legacy Stripe data.
- WooCommerce `status === 'active'` is the only Woo paid-access state; every other Woo status resolves to Free.
- Supabase Auth UUIDs remain the internal identity key for all Translator-owned data/RLS.
- The WordPress plugin must never contain a Supabase service-role key, OpenAI key, Woo webhook secret, or browser-readable OAuth client secret.
- Keep `OPENAI_MODEL` fallback exactly `gpt-5.4`; do not alter translation streaming behavior.
- Do not use billing email as durable account ownership proof.
- The user does not want local testing. Verification is performed through repository static tests and GitHub Actions on a draft pull request.

---

### Task 1: Add failing v2 architecture checks and remote CI gate

**Files:**
- Create: `scripts/test-tun-sso-provider.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: the approved design spec.
- Produces: a repository-level contract test that fails until the WordPress OAuth provider, Supabase reconciliation function/RPC, and Translator SSO entry files exist.

- [ ] **Step 1: Write the failing static contract test**

The script must require these paths and behaviors before implementation exists:

```js
const required = [
  "wordpress/tun-saas-subscription-bridge/includes/class-tun-sso-provider.php",
  "wordpress/tun-saas-subscription-bridge/includes/class-tun-sso-settings.php",
  "supabase/migrations/20260824000100_tun_sso_reconciliation.sql",
  "supabase/functions/tun-identity-reconcile/index.ts",
  "supabase/functions/tun-identity-reconcile/deno.json",
  "src/lib/tun-sso.ts",
  "src/app/auth/tun/page.tsx",
];
```

Assert the plugin contains `Version: 2.0.0`, the three REST routes, PKCE S256, hashed OAuth grant/token storage, mapped-product account requirement, and Continue-to-Translator hook. Assert the Supabase migration exposes `reconcile_tun_identity`, uses `tun_identity_links`, `woocommerce_pending_entitlements`, and preserves active-only Woo plan behavior. Assert the Edge Function requires a Supabase JWT and inspects provider identities. Assert the Translator helper invokes `signInWithOAuth` for `custom:tunapp` and does not alter pricing.

- [ ] **Step 2: Add the new script to `npm test`**

Keep all existing tests and insert:

```json
"test": "node scripts/test-critical.mjs && node scripts/test-tun-identity-foundation.mjs && node scripts/test-tun-sso-provider.mjs && node scripts/test-manual-plan.mjs && node --experimental-strip-types scripts/test-widget.mjs && node --experimental-strip-types scripts/test-transliteration.mjs"
```

- [ ] **Step 3: Open a draft PR to `main` to run GitHub Actions**

Expected: `Quality checks` fails specifically because the v2 provider/reconciliation files do not exist yet. This is the RED evidence for the new behavior. Keep the PR draft and never merge it during implementation.

- [ ] **Step 4: Commit**

Commit message:

```text
test: define TunApp SSO provider contract
```

---

### Task 2: Upgrade the WordPress bridge to first-party SSO provider v2.0

**Files:**
- Create: `wordpress/tun-saas-subscription-bridge/includes/class-tun-sso-settings.php`
- Create: `wordpress/tun-saas-subscription-bridge/includes/class-tun-sso-provider.php`
- Modify: `wordpress/tun-saas-subscription-bridge/tun-saas-subscription-bridge.php`
- Modify: `wordpress/tun-saas-subscription-bridge/README.md`

**Interfaces:**
- Consumes: fixed first-party client settings and normal WordPress logged-in users.
- Produces:
  - `GET /wp-json/tun-sso/v1/authorize`
  - `POST /wp-json/tun-sso/v1/token`
  - `GET /wp-json/tun-sso/v1/userinfo`
  - admin settings for client credentials/callback/Translator return URL
  - `{prefix}tun_sso_grants`

- [ ] **Step 1: Implement focused settings class**

`Tun_SSO_Settings` owns the option name `tun_saas_sso_settings` and defaults:

```php
array(
    'enabled'        => false,
    'client_id'      => '',
    'secret_hash'    => '',
    'redirect_uri'   => 'https://indgjoridkhnazitubom.supabase.co/auth/v1/callback',
    'translator_url' => 'https://western-armenian-translator.netlify.app',
)
```

Expose helpers:

```php
public static function get();
public static function client_id();
public static function secret_hash();
public static function redirect_uri();
public static function translator_url();
public static function enabled();
```

Add an admin page under **Settings → Tun Translator SSO**. Saving only changes enabled/callback/Translator URL after `manage_options` + nonce validation. A separate `admin_post_tun_saas_generate_sso_credentials` action generates a client ID and 32-byte secret with `random_bytes`, stores only `wp_hash_password($secret)`, and renders the plaintext secret once in the immediate admin response without storing it in options/transients/query strings.

- [ ] **Step 2: Implement grant table activation/cleanup**

`Tun_SSO_Provider::activate()` uses `dbDelta()` to create `$wpdb->prefix . 'tun_sso_grants'` with:

```text
id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
user_id BIGINT UNSIGNED NOT NULL
client_id VARCHAR(128) NOT NULL
redirect_uri TEXT NOT NULL
scope VARCHAR(255) NOT NULL
code_hash CHAR(64) NOT NULL UNIQUE
code_challenge VARCHAR(128) NOT NULL
code_expires_at DATETIME NOT NULL
code_used_at DATETIME NULL
access_token_hash CHAR(64) NULL
access_token_expires_at DATETIME NULL
created_at DATETIME NOT NULL
```

Add indexes for `code_hash`, `access_token_hash`, and expiry. Schedule `tun_saas_sso_cleanup` hourly and delete expired grants/tokens without logging secret material.

- [ ] **Step 3: Implement `/authorize`**

Register REST routes under `tun-sso/v1` with public permission callbacks; each callback performs its own protocol checks.

Validation:

```text
client_id == configured client ID
redirect_uri == configured Supabase callback URI
response_type == code
state non-empty
code_challenge is base64url-safe and 43-128 chars
code_challenge_method == S256
scope subset of: profile email
provider enabled
```

If not logged in, redirect to `wp_login_url($complete_authorize_url)` so the same request resumes after TunApp login. If logged in, create 32 random bytes, encode as base64url authorization code, store only `hash('sha256', $code)`, bind the current WordPress user ID/client/redirect/scope/challenge, expire in five minutes, and return a 302 Location to the already-validated callback containing the code and original state.

- [ ] **Step 4: Implement `/token` with one-time PKCE exchange**

Accept form fields:

```text
grant_type=authorization_code
client_id
client_secret
code
redirect_uri
code_verifier
```

Require the fixed client ID, `wp_check_password($client_secret, $secret_hash)`, unexpired unused code hash, exact bound redirect URI, RFC7636-style verifier length/charset, and `base64url(sha256(code_verifier)) == code_challenge` via `hash_equals`.

Generate a 32-byte opaque access token; store only its SHA-256 hash. Consume the code atomically with a conditional SQL update where `code_used_at IS NULL` and `code_expires_at > UTC_TIMESTAMP()`. Access token lifetime is 600 seconds. Return `Cache-Control: no-store` and:

```json
{"access_token":"...","token_type":"Bearer","expires_in":600,"scope":"profile email"}
```

Do not issue refresh tokens.

- [ ] **Step 5: Implement `/userinfo`**

Read `Authorization: Bearer ...`, hash the token, locate an unexpired grant, load its WordPress user, and return only:

```json
{
  "sub": "123",
  "id": "123",
  "wordpress_user_id": 123,
  "email": "person@example.com",
  "name": "Display Name"
}
```

Do not return `email_verified: true`.

- [ ] **Step 6: Add lightweight abuse throttling**

Use short-lived transients keyed by a SHA-256 digest of endpoint + remote IP. Set ceilings high enough for legitimate Supabase server traffic while reducing brute force, e.g. 120 token requests/minute and 240 userinfo requests/minute. OAuth errors use standard `invalid_request`, `invalid_client`, `invalid_grant`, `invalid_scope`, `unsupported_response_type` responses and never include stack traces/secrets.

- [ ] **Step 7: Preserve Woo bridge and require a real Tun account for mapped purchases**

Keep every v1.1 legacy token/identity hook. Add filters:

```php
woocommerce_checkout_registration_required
woocommerce_checkout_registration_enabled
```

that return `true` only when cart contains product `13793` or `13794` and the visitor is logged out. Add a post-order hook so `_tun_wordpress_user_id` is attached after Woo assigns a newly created customer ID as well as in the existing create-order/Store API hooks. Never infer the account from billing email.

- [ ] **Step 8: Add Continue to Translator on mapped order-received pages**

For a mapped completed checkout/order, render a prominent link to the configured Translator origin plus `/auth/tun?next=%2Fdashboard`. The link carries no plan/user/entitlement assertion.

- [ ] **Step 9: Update plugin bootstrap/version/docs**

Set plugin name to **Tun SaaS Subscription & SSO Bridge**, version `2.0.0`, require the two includes, register activation hook, initialize settings/provider, and document the provider endpoints, one-time secret handling, callback URI, and safe rollback to v1.1 behavior.

- [ ] **Step 10: Commit**

Commit message:

```text
feat: add first-party TunApp OAuth provider
```

---

### Task 3: Add atomic Supabase identity/entitlement reconciliation

**Files:**
- Create: `supabase/migrations/20260824000100_tun_sso_reconciliation.sql`
- Create: `supabase/functions/tun-identity-reconcile/index.ts`
- Create: `supabase/functions/tun-identity-reconcile/deno.json`
- Modify: `supabase/config.toml`

**Interfaces:**
- Consumes: authenticated Supabase user UUID plus verified Tun provider subject/WordPress ID derived server-side.
- Produces: `public.reconcile_tun_identity(p_user_id uuid, p_provider_subject text, p_wordpress_user_id bigint, p_email text)` returning JSON reconciliation status and effective plan.

- [ ] **Step 1: Create transactional reconciliation RPC**

Create a `security definer` PL/pgSQL function with `set search_path = public` and revoke execution from `anon, authenticated`; grant to `service_role` only.

The function must:

1. validate positive `p_wordpress_user_id` and require `p_provider_subject = p_wordpress_user_id::text`;
2. lock/check any existing `tun_identity_links` rows for that provider subject, user, or WordPress ID;
3. raise a conflict if the subject/WP ID belongs to another Supabase UUID;
4. insert/update the single `tunapp` identity link and informational email/last_verified_at;
5. locate at most one pending entitlement by `wordpress_user_id`; if none, optionally match an unambiguous Woo customer ID already present on the identity link;
6. if pending exists, upsert `subscriptions` for `p_user_id` with its Woo subscription/order/customer/product/status/provider timestamps while preserving local `access_suspended` fields;
7. mark that pending row `linked`, set `linked_user_id`, clear `last_error`;
8. update `profiles.current_plan_id` to the Woo paid plan only for `status = 'active'`, otherwise to Free;
9. return `jsonb_build_object('linked', true, 'entitlement_linked', ..., 'status', ..., 'plan', public.effective_plan_for_user(p_user_id))`.

If multiple unlinked pending rows exist for the same WP ID, choose the newest `provider_updated_at/updated_at` for the active subscription record and mark older resolved rows linked to the same user without granting from them. Existing uniqueness constraints remain the safety boundary.

- [ ] **Step 2: Implement authenticated `tun-identity-reconcile` Edge Function**

Use existing `getRuntimeConfig`, CORS helpers, publishable-key validation, and `requireUser`.

After JWT validation, retrieve the authoritative Supabase user with `admin.auth.getUser()` and inspect `user.identities`. Find the identity whose provider equals `custom:tunapp` (accept `tunapp` only as a backward-compatible provider label if Supabase normalizes it that way). Extract provider subject from identity `id`/`identity_data.sub`; require a positive integer string. Do not accept subject/WP ID from the request body.

Call:

```ts
admin.rpc("reconcile_tun_identity", {
  p_user_id: user.id,
  p_provider_subject: subject,
  p_wordpress_user_id: Number(subject),
  p_email: user.email || null,
});
```

Return the RPC JSON. Auth missing → 401, missing verified Tun identity → 409, identity conflict → 409, server/reconciliation failures → safe 500 with `system_errors` logging that contains no tokens/JWTs.

- [ ] **Step 3: Configure function deployment behavior**

Add:

```toml
[functions.tun-identity-reconcile]
verify_jwt = false
```

because the function performs authoritative JWT validation itself, matching existing project convention.

Pin its `deno.json` Supabase client to the same `2.95.0` used by current Woo Edge Functions.

- [ ] **Step 4: Commit**

Commit message:

```text
feat: reconcile Tun SSO identities with Woo entitlements
```

---

### Task 4: Add Translator “Continue with Tun” SSO entry and hosted reconciliation

**Files:**
- Create: `src/lib/tun-sso.ts`
- Create: `src/app/auth/tun/page.tsx`
- Modify: `src/components/AuthForm.tsx`
- Modify: `.env.example` only if a browser-safe provider identifier toggle is required

**Interfaces:**
- Consumes: configured Supabase custom provider `custom:tunapp` and current Supabase session after OAuth callback.
- Produces: `startTunSignIn(next?: string)` and `reconcileTunIdentity(session)`.

- [ ] **Step 1: Implement safe SSO helper**

`src/lib/tun-sso.ts` exports:

```ts
export const TUN_OAUTH_PROVIDER = "custom:tunapp";
export function safeTunNext(value: string | null): string;
export async function startTunSignIn(next?: string): Promise<void>;
export async function reconcileTunIdentity(session: Session): Promise<...>;
```

`safeTunNext` accepts only same-site absolute paths beginning with `/` but not `//`.

`startTunSignIn` calls the existing browser client:

```ts
supabase.auth.signInWithOAuth({
  provider: TUN_OAUTH_PROVIDER as Parameters<typeof supabase.auth.signInWithOAuth>[0]["provider"],
  options: {
    scopes: "profile email",
    redirectTo: `${location.origin}/auth/tun?complete=1&next=${encodeURIComponent(safeNext)}`,
  },
});
```

If the pinned SDK type does not recognize `custom:${string}`, use this narrow type assertion only; do not upgrade dependencies solely for a compile-time union if runtime `signInWithOAuth` is compatible. If remote CI proves the pinned SDK cannot support the flow, then make the smallest SDK upgrade as a separate reviewed change.

`reconcileTunIdentity` POSTs to `/functions/v1/tun-identity-reconcile` with project apikey + bearer Supabase access token and no identity values in the body.

- [ ] **Step 2: Create `/auth/tun` route**

The route is a client page wrapped in `Suspense`.

Behavior:
- without `complete=1`: automatically start `startTunSignIn(next)` once and show “Connecting to Tun…”;
- with `complete=1`: wait for the normal Supabase session from `AuthContext`, call reconciliation once, call `refreshProfile()`, then `router.replace(safeNext(next))`;
- on provider/reconcile error: show a retry button and explain that no paid access is granted until account linking succeeds.

Do not derive plan state from URL parameters.

- [ ] **Step 3: Add a “Continue with Tun” option to existing login only**

Keep email/password login, signup, and password reset unchanged. On login mode add a separate button above/below the password form that calls `/auth/tun?next=<safe next>`. This is additive migration behavior.

Do not remove the old signup path yet.

- [ ] **Step 4: Verify `/pricing` is unchanged**

The v2 contract test explicitly rejects direct `https://tunapp.com/checkout?add-to-cart=...` paid-button behavior in `src/app/pricing/page.tsx` at this stage. It must still use `startCheckout(session, slug)` and require an existing Translator session until hosted SSO proof is complete.

- [ ] **Step 5: Commit**

Commit message:

```text
feat: add Tun SSO login and reconciliation flow
```

---

### Task 5: Remote verification, deployment package, and production handoff

**Files:**
- Modify: `wordpress/tun-saas-subscription-bridge/README.md` if CI/review reveals documentation gaps.
- No production mutation in this task.

**Interfaces:**
- Consumes: all prior tasks.
- Produces: remote CI evidence and exact user deployment instructions without merging to `main`.

- [ ] **Step 1: Verify draft PR CI turns GREEN**

Use the draft PR’s `Quality checks` workflow and inspect all job steps. Required fresh evidence:

```text
npm install      exit 0
npm run lint     exit 0
npm run test     exit 0
npm run verify   exit 0
npm run build    exit 0
```

If any step fails, use systematic debugging, fix only the root cause on the feature branch, and wait for fresh CI.

- [ ] **Step 2: Review diff against security checklist**

Confirm from the PR diff:
- no raw secret/token/JWT logging;
- no service-role key in WordPress/browser files;
- exact OAuth redirect allowlist;
- mandatory PKCE S256;
- one-time 5-minute auth code;
- 10-minute access token, no refresh token;
- hashed client secret/auth code/access token storage;
- Woo signed webhook remains entitlement authority;
- pricing still uses legacy authenticated checkout;
- `gpt-5.4` and translation streaming untouched.

- [ ] **Step 3: Prepare WordPress v2 ZIP from the repository source**

Create a ZIP whose root directory has a unique install folder such as:

```text
tun-saas-subscription-sso-bridge-v200/
  tun-saas-subscription-bridge.php
  includes/
  README.md
```

The unique folder avoids the orphaned `tun-saas-subscription-bridge` directory previously left on the hosting server. Do not activate old and new copies simultaneously.

- [ ] **Step 4: Give the user production deployment steps in dependency order**

Order:
1. upload/activate WordPress v2 plugin;
2. open **Settings → Tun Translator SSO**, generate credentials, copy the client ID and one-time client secret;
3. configure Supabase Auth custom OAuth provider `custom:tunapp` with the three TunApp endpoints and exact callback;
4. user applies `20260824000100_tun_sso_reconciliation.sql` via `npx --yes supabase@latest db push`;
5. deploy `tun-identity-reconcile` via `npx --yes supabase@latest functions deploy tun-identity-reconcile --project-ref indgjoridkhnazitubom --no-verify-jwt`;
6. deploy the feature branch to a hosted Netlify preview/site before any pricing switch;
7. run hosted SSO tests for Free/no subscription and pending Woo entitlement orders.

Do not ask the user to run npm/local tests.

- [ ] **Step 5: Stop before pricing switch and merge**

Wait for the user’s hosted test results. Only after the Tun-first flow is proven should a separate stage change Person/Elite pricing buttons. Never merge to `main` until the user explicitly says **“merge it”**.
