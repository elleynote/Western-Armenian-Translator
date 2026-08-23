import fs from "node:fs";

const pluginPath = "wordpress/tun-translator-sso/tun-translator-sso.php";
if (!fs.existsSync(pluginPath)) throw new Error(`Missing ${pluginPath}`);

const plugin = fs.readFileSync(pluginPath, "utf8");

for (const term of [
  "Plugin Name: Tun Translator SSO Bridge",
  "Version: 2.1.0",
  "includes/class-tun-sso-settings.php",
  "includes/class-tun-sso-provider.php",
  "Tun_SSO_Settings::init();",
  "Tun_SSO_Provider::init();",
  "add_action( 'admin_init', 'tun_translator_sso_maybe_install'",
]) {
  if (!plugin.includes(term)) throw new Error(`Standard Tun SSO plugin missing ${term}`);
}

for (const forbidden of [
  "tun_translator_sso_safe_load_core",
  "internal/core",
  "tun-saas-core.inc",
  "register_activation_hook",
]) {
  if (plugin.includes(forbidden)) throw new Error(`Standard Tun SSO plugin must not contain ${forbidden}`);
}

console.log("Standard single-file Tun SSO bootstrap checks passed.");
