# Tun Verified Email & Entitlement Design

## Goal

Make TunApp the single email-verification authority for Tun SSO while keeping Supabase Auth as the Translator session/RLS authority and WooCommerce as the paid-entitlement authority.

## Current Failure

A WooCommerce subscription can be active while Supabase rejects the Tun OAuth login with `provider_email_needs_verification`. The Tun provider currently returns `email` but does not return an `email_verified` claim. Because SSO stops before a Supabase session exists, `tun-identity-reconcile` never runs, so the active Woo entitlement remains pending and the Translator admin still shows Free.

## Design

1. TunApp remains responsible for verifying ownership of the user email before that account is trusted for Translator SSO.
2. The Tun OAuth UserInfo response returns `email_verified: true` for the authenticated Tun account. This tells Supabase that the upstream identity provider already verified the email; Supabase must not send a second confirmation email for Tun SSO.
3. Supabase Auth remains in place. The Translator still receives a normal Supabase user/session, preserving existing RLS, profiles, history, usage, admin, and legacy email/password behavior.
4. WooCommerce remains the only billing authority. OAuth identity alone never grants Person/Elite. Only a verified Woo subscription with `status = active` grants paid access.
5. Existing pending Woo entitlements are reconciled after Tun SSO using the immutable WordPress/Tun user ID and Woo customer/subscription metadata. Existing active purchases do not require a second payment.
6. The WordPress plugin source in GitHub is synchronized to the actual final SSO implementation, including the non-REST authorization handoff already selected for the login-loop fix.

## Security Boundaries

- Do not disable email confirmation globally in Supabase; that would weaken legacy email/password accounts.
- Do not trust a browser-supplied email, WordPress user ID, plan, product, or subscription status.
- `email_verified: true` is emitted only by the authenticated Tun provider for the Tun account returned by WordPress.
- Paid plan mapping remains server-owned: product `13793` -> `premium` (Person), product `13794` -> `business` (Elite).
- Paid access remains `Woo status === active` only.
- Existing Stripe records are not deleted or altered.
- OpenAI model fallback remains exactly `gpt-5.4`; translation streaming is untouched.

## Expected Flow

Translator Pricing -> TunApp checkout -> Tun account/login -> payment -> Woo subscription active -> signed Woo webhook records/updates entitlement -> Translator Tun SSO -> Supabase accepts verified Tun email -> normal Supabase session -> `tun-identity-reconcile` links the pending/active Woo subscription -> dashboard shows Person/Elite -> paid features unlock.

For an already-paid customer, the flow starts at Tun SSO; no new purchase is required.

## Cancellation

When Woo status is no longer `active`, the existing webhook/effective-plan logic returns the user to Free. This policy remains unchanged.
