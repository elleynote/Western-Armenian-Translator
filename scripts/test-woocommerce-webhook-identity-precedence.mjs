import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const webhookPath = path.join(root, "supabase/functions/woocommerce-webhook/index.ts");
const source = fs.readFileSync(webhookPath, "utf8");

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

expect(
  !source.includes("if (checkout.tokenPresent && !checkout.link) {"),
  "Webhook still rejects an invalid legacy checkout token before Tun identity resolution.",
);

expect(
  source.includes("const tunIdentity = checkout.link"),
  "Webhook must still resolve the immutable Tun/WordPress identity when no valid checkout link exists.",
);

expect(
  source.includes("|| checkout.tokenPresent\n      ? null\n      : await resolveLegacyUserId(admin, payload);"),
  "An invalid/present checkout token must block legacy email/user fallback while allowing Tun identity resolution or pending entitlement storage.",
);

expect(
  source.includes("pending_entitlement: true"),
  "Unresolved signed Woo subscriptions must still be stored as pending entitlements for later Tun SSO reconciliation.",
);

console.log("WooCommerce webhook identity precedence checks passed.");
