# Tun Verified Email & Entitlement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let TunApp-verified users complete Supabase SSO without a second email-confirmation step and immediately reconcile an already-active WooCommerce subscription into the correct Translator paid plan.

**Architecture:** TunApp remains the upstream identity/email-verification authority, Supabase Auth remains the Translator session/RLS authority, and WooCommerce remains the billing authority. The WordPress OAuth provider will emit an explicit verified-email claim for the authenticated Tun account, while the existing signed Woo webhook and `reconcile_tun_identity` RPC continue to determine Person/Elite entitlement from immutable Tun/Woo identifiers and `status = active`.

**Tech Stack:** WordPress/PHP, WooCommerce Subscriptions, Supabase Auth custom OAuth provider, Supabase Edge Functions, PostgreSQL/RPC, Next.js/TypeScript.

**Spec:** `docs/superpowers/specs/2026-08-24-tun-verified-email-entitlement-design.md`

## Global Constraints

- Do not disable Supabase email confirmation globally.
- Do not trust browser-supplied identity or plan data.
- WooCommerce remains the billing source of truth.
- Only Woo subscription status exactly `active` grants paid access.
- Product `13793` maps to `premium` / Person.
- Product `13794` maps to `business` / Elite.
- Existing Stripe data must remain untouched.
- OpenAI model fallback must remain exactly `gpt-5.4`.
- Translation streaming and unrelated Translator features must remain untouched.
- Do not mutate the production Supabase database directly.

---

### Task 1: Add verified-email claim to Tun OAuth UserInfo

**Files:**
- Modify: `wordpress/tun-translator-sso-bridge/tun-translator-sso-bridge.php`
- Modify: `scripts/test-tun-sso-provider.mjs`

**Interfaces:**
- Consumes: authenticated WordPress user returned by the Tun OAuth access token.
- Produces: UserInfo JSON containing immutable Tun subject, email, display name, and `email_verified: true`.

- [ ] **Step 1: Write the failing static regression test**

Update `scripts/test-tun-sso-provider.mjs` to require both:

```js
"'email_verified' => true"
```

and the final plugin version string. The test must fail against the current plugin source because `email_verified` is not yet present.

- [ ] **Step 2: Verify the test fails for the intended reason**

Run the repository's existing Tun SSO static test command in CI or a supported workspace. Expected failure: `WordPress SSO plugin missing 'email_verified' => true`.

- [ ] **Step 3: Implement the minimal provider change**

In the OAuth UserInfo response for an access token already bound to an authenticated WordPress user, add:

```php
'email_verified' => true,
```

Do not add any client-side verification bypass and do not disable Supabase email confirmation globally.

- [ ] **Step 4: Synchronize the plugin version and endpoint display**

Bump the plugin version consistently and ensure the admin settings page displays the selected non-REST authorization endpoint while Token/UserInfo remain REST endpoints.

- [ ] **Step 5: Run PHP/static checks**

Expected: PHP syntax passes and `scripts/test-tun-sso-provider.mjs` passes.

- [ ] **Step 6: Commit**

```bash
git add wordpress/tun-translator-sso-bridge/tun-translator-sso-bridge.php scripts/test-tun-sso-provider.mjs
git commit -m "fix: trust Tun verified email for SSO"
```

### Task 2: Verify existing Woo entitlement reconciliation remains authoritative

**Files:**
- Read/verify: `supabase/functions/woocommerce-webhook/index.ts`
- Read/verify: `supabase/functions/tun-identity-reconcile/index.ts`
- Read/verify: `supabase/migrations/20260824000100_tun_sso_reconciliation.sql`
- Modify only if a regression test exposes a mismatch: `scripts/test-tun-sso-provider.mjs`

**Interfaces:**
- Consumes: Tun OAuth subject/WordPress user ID from the accepted Supabase identity plus pending Woo entitlement rows created by the signed webhook.
- Produces: `subscriptions` row, `profiles.current_plan_id`, linked `tun_identity_links`, and linked pending entitlement state.

- [ ] **Step 1: Add assertions for entitlement invariants**

Require the existing code to preserve these exact invariants:

```text
status === "active"
reconcile_tun_identity
woocommerce_pending_entitlements
woocommerce_subscription_id
plan_slug
```

and reject any implementation that grants paid access from OAuth identity alone.

- [ ] **Step 2: Run the regression test**

Expected: current entitlement code passes; no billing rewrite is needed.

- [ ] **Step 3: Confirm the already-paid-user path**

Verify from code that if the signed Woo webhook arrived before SSO, a pending entitlement can be matched by immutable WordPress user ID/customer ID and copied into the normal `subscriptions` row during `reconcile_tun_identity`.

- [ ] **Step 4: Commit only if test coverage changed**

```bash
git add scripts/test-tun-sso-provider.mjs
git commit -m "test: protect Tun Woo entitlement reconciliation"
```

### Task 3: Remote verification and release preparation

**Files:**
- No production DB mutation.
- PR from `fix/tun-sso-login-redirect-loop` to `main`.

**Interfaces:**
- Consumes: completed plugin/provider changes from Tasks 1-2.
- Produces: one reviewed feature branch ready for WordPress replacement and later merge to `main`.

- [ ] **Step 1: Run repository CI checks**

Verify PHP lint/static checks, TypeScript lint, tests, and production build. Confirm OpenAI fallback remains `gpt-5.4`.

- [ ] **Step 2: Build the WordPress ZIP from the exact branch source**

Package the plugin folder so WordPress replaces the existing `tun-translator-sso-bridge` plugin rather than creating a duplicate directory.

- [ ] **Step 3: Install the new plugin in WordPress**

Replace the current plugin. Do not regenerate Client ID/Secret. Keep `Allow Translator SSO` enabled.

- [ ] **Step 4: Test without another payment**

Use the already-active Woo customer. Expected flow:

```text
Continue with Tun
-> Tun login/authorize
-> Supabase accepts verified upstream email
-> /auth/tun obtains a Supabase session
-> tun-identity-reconcile links existing active Woo subscription
-> dashboard shows Person/Elite instead of Free
```

- [ ] **Step 5: Verify cancellation rule remains unchanged**

No code change is expected. Confirm only Woo `active` grants paid access; all other statuses remain Free under the existing policy.

- [ ] **Step 6: Merge only after the hosted SSO test succeeds**

Merge the PR to `main` so Netlify deploys the matching Translator branch state.
