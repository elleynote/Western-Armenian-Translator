import fs from "node:fs";

const path = "wordpress/tun-translator-sso-safe/tun-translator-sso-safe.php";
if (!fs.existsSync(path)) throw new Error(`Missing ${path}`);

const source = fs.readFileSync(path, "utf8");
for (const term of [
  "Plugin Name: Tun Translator SSO Bridge",
  "Version: 2.0.3",
  "add_action( 'plugins_loaded'",
  "tun_translator_sso_safe_load_core",
  "is_readable",
  "/internal/core/tun-saas-subscription-bridge.php",
]) {
  if (!source.includes(term)) throw new Error(`Activation-safe wrapper missing ${term}`);
}

if (source.includes("__DIR__ . '/core/")) {
  throw new Error("Core must not live one directory below plugin root because WordPress scans that level for plugin headers");
}

if (source.includes("register_activation_hook")) {
  throw new Error("Activation-safe wrapper must not register an activation hook");
}

console.log("Activation-safe Tun SSO wrapper checks passed.");
