import fs from "node:fs";

const path = "wordpress/tun-translator-sso-loader/tun-translator-sso-loader.php";
if (!fs.existsSync(path)) throw new Error(`Missing ${path}`);

const source = fs.readFileSync(path, "utf8");
for (const term of [
  "Plugin Name: Tun Translator SSO Bridge",
  "Version: 2.0.2",
  "add_action( 'init'",
  "tun_translator_sso_202_load_core",
  "is_readable",
  "tun_sso_grants",
  "CREATE TABLE IF NOT EXISTS",
]) {
  if (!source.includes(term)) throw new Error(`Activation-safe loader missing ${term}`);
}

if (source.includes("register_activation_hook")) {
  throw new Error("Activation-safe loader must not register an activation hook");
}

console.log("Activation-safe Tun SSO loader checks passed.");
