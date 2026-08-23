import fs from "node:fs";

const wrapperPath = "wordpress/tun-translator-sso-safe/tun-translator-sso-safe.php";
if (!fs.existsSync(wrapperPath)) throw new Error(`Missing ${wrapperPath}`);

const wrapper = fs.readFileSync(wrapperPath, "utf8");

for (const term of [
  "Plugin Name: Tun Translator SSO Bridge",
  "Version: 2.0.4",
  "add_action( 'plugins_loaded'",
  "tun_translator_sso_safe_load_core",
  "is_readable",
  "/internal/core/tun-saas-core.inc",
]) {
  if (!wrapper.includes(term)) throw new Error(`Activation-safe wrapper missing ${term}`);
}

if (wrapper.includes("/internal/core/tun-saas-subscription-bridge.php")) {
  throw new Error("Internal core must not use a .php plugin-discoverable filename");
}

if (wrapper.includes("register_activation_hook")) {
  throw new Error("Activation-safe wrapper must not register an activation hook");
}

console.log("Non-plugin internal core activation-safe Tun SSO checks passed.");
