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

const migration = read("supabase/migrations/20260823000100_tun_identity_foundation.sql");
expectTerms("Tun identity migration", migration, [
  "create table if not exists public.tun_identity_links",
  "provider_subject text not null",
  "wordpress_user_id bigint",
  "woocommerce_customer_id bigint",
  "create table if not exists public.woocommerce_pending_entitlements",
  "woocommerce_subscription_id bigint not null unique",
  "linked_user_id uuid",
  "link_status text not null",
  "enable row level security",
  "to service_role"
]);

const webhook = read("supabase/functions/woocommerce-webhook/index.ts");
expectTerms("WooCommerce webhook", webhook, [
  "resolveTunIdentityUserId",
  "woocommerce_pending_entitlements",
  "tun_identity_links",
  "pending_entitlement",
  "wordpress_user_id",
  "checkout_token",
  "legacy_fallback"
]);

const plugin = read("wordpress/tun-saas-subscription-bridge/tun-saas-subscription-bridge.php");
expectTerms("WordPress bridge", plugin, [
  "Version: 1.1.0",
  "_tun_wordpress_user_id",
  "tun_saas_attach_identity_to_order",
  "tun_saas_copy_identity_to_subscription",
  "woocommerce_is_sold_individually"
]);

// Direct add-to-cart purchases must still be normalized even when the old
// Translator-generated tun_checkout token is absent.
const sellIndividually = plugin.match(/function tun_saas_sell_checkout_plan_individually[\s\S]*?\n}/)?.[0] || "";
if (sellIndividually.includes("tun_saas_active_checkout_token")) {
  throw new Error("Mapped product sold-individually guard still depends on tun_checkout");
}

console.log("Tun SSO identity foundation static checks passed.");
