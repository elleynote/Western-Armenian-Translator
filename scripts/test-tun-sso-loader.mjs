import fs from "node:fs";

const wrapperPath = "wordpress/tun-translator-sso-safe/tun-translator-sso-safe.php";
const corePath = "wordpress/tun-saas-subscription-bridge/tun-saas-subscription-bridge.php";

if (!fs.existsSync(wrapperPath)) throw new Error(`Missing ${wrapperPath}`);
if (!fs.existsSync(corePath)) throw new Error(`Missing ${corePath}`);

const wrapper = fs.readFileSync(wrapperPath, "utf8");
const core = fs.readFileSync(corePath, "utf8");

for (const term of [
  "Plugin Name: Tun Translator SSO Bridge",
  "Version: 2.0.3",
  "add_action( 'plugins_loaded'",
  "tun_translator_sso_safe_load_core",
  "is_readable",
  "/internal/core/tun-saas-subscription-bridge.php",
]) {
  if (!wrapper.includes(term)) throw new Error(`Activation-safe wrapper missing ${term}`);
}

if (wrapper.includes("register_activation_hook")) {
  throw new Error("Activation-safe wrapper must not register an activation hook");
}

if (/Plugin Name\s*:/u.test(core)) {
  throw new Error("Nested Tun SSO core must not contain a WordPress Plugin Name header");
}

if (/register_activation_hook\s*\(/u.test(core)) {
  throw new Error("Nested Tun SSO core must not register its own activation hook");
}

console.log("Single-header activation-safe Tun SSO checks passed.");
