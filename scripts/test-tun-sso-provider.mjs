import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  const full = path.join(root, relativePath);
  if (!fs.existsSync(full)) throw new Error(`Missing ${relativePath}`);
  return fs.readFileSync(full, "utf8");
}

function expectTerms(name, source, terms) {
  for (const term of terms) {
    if (!source.includes(term)) throw new Error(`${name} missing ${term}`);
  }
}

const required = [
  "wordpress/tun-translator-sso/tun-translator-sso.php",
  "wordpress/tun-saas-subscription-bridge/includes/class-tun-sso-provider.php",
  "wordpress/tun-saas-subscription-bridge/includes/class-tun-sso-settings.php",
  "supabase/migrations/20260824000100_tun_sso_reconciliation.sql",
  "supabase/functions/tun-identity-reconcile/index.ts",
  "supabase/functions/tun-identity-reconcile/deno.json",
  "src/lib/tun-sso.ts",
  "src/app/auth/tun/page.tsx",
];

for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing ${file}`);
}

const plugin = read("wordpress/tun-translator-sso/tun-translator-sso.php");
expectTerms("WordPress SSO plugin", plugin, [
  "Plugin Name: Tun Translator SSO Bridge",
  "Version: 2.1.0",
  "includes/class-tun-sso-settings.php",
  "includes/class-tun-sso-provider.php",
  "Tun_SSO_Settings::init();",
  "Tun_SSO_Provider::init();",
  "woocommerce_checkout_create_order",
  "woocommerce_checkout_subscription_created",
]);

const provider = read("wordpress/tun-saas-subscription-bridge/includes/class-tun-sso-provider.php");
expectTerms("Tun SSO provider", provider, [
  "tun-sso/v1",
  "/authorize",
  "/token",
  "/userinfo",
  "code_challenge_method",
  "S256",
  "wp_login_url",
  "sha256",
  "wp_check_password",
  "hash_equals",
  "Authorization",
  "Basic",
  "base64_decode",
  "access_token_hash",
  "woocommerce_checkout_registration_required",
  "woocommerce_checkout_registration_enabled",
  "Continue to Translator",
  "tun_saas_sso_cleanup",
]);

const settings = read("wordpress/tun-saas-subscription-bridge/includes/class-tun-sso-settings.php");
expectTerms("Tun SSO settings", settings, [
  "tun_saas_sso_settings",
  "indgjoridkhnazitubom.supabase.co/auth/v1/callback",
  "western-armenian-translator.netlify.app",
  "wp_hash_password",
  "random_bytes",
  "manage_options",
]);

const migration = read("supabase/migrations/20260824000100_tun_sso_reconciliation.sql");
expectTerms("Tun reconciliation migration", migration, [
  "reconcile_tun_identity",
  "tun_identity_links",
  "woocommerce_pending_entitlements",
  "status = 'active'",
  "effective_plan_for_user",
  "to service_role",
]);

const reconcile = read("supabase/functions/tun-identity-reconcile/index.ts");
expectTerms("Tun reconciliation function", reconcile, [
  "requireUser",
  "user.identities",
  "custom:tunapp",
  "reconcile_tun_identity",
  "p_provider_subject",
  "p_wordpress_user_id",
]);
if (/wordpress_user_id\s*[:=]\s*body/u.test(reconcile) || /provider_subject\s*[:=]\s*body/u.test(reconcile)) {
  throw new Error("Reconciliation must not trust browser-supplied identity values");
}

const sso = read("src/lib/tun-sso.ts");
expectTerms("Translator Tun SSO helper", sso, [
  "custom:tunapp",
  "signInWithOAuth",
  "profile email",
  "tun-identity-reconcile",
  "safeTunNext",
]);

const route = read("src/app/auth/tun/page.tsx");
expectTerms("Translator Tun callback", route, [
  "Connecting to Tun",
  "reconcileTunIdentity",
  "refreshProfile",
  "Retry",
]);

const pricing = read("src/app/pricing/page.tsx");
expectTerms("Pricing direct Tun checkout", pricing, [
  'premium: "https://tunapp.com/checkout?add-to-cart=13793"',
  'business: "https://tunapp.com/checkout?add-to-cart=13794"',
  'location.href = TUN_CHECKOUT_URLS[slug]',
]);
if (pricing.includes('location.href = `/signup?next=') || pricing.includes("startCheckout(session, slug)")) {
  throw new Error("Pricing still requires Translator signup before Tun checkout");
}

const env = read("supabase/functions/_shared/env.ts");
if (!env.includes('openAiModel: Deno.env.get("OPENAI_MODEL")?.trim() || "gpt-5.4"')) {
  throw new Error("OpenAI model fallback changed from gpt-5.4");
}

console.log("TunApp first-party SSO provider static checks passed.");
