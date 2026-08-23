import fs from "node:fs";

const plugin = fs.readFileSync("wordpress/tun-translator-sso-bridge/tun-translator-sso-bridge.php", "utf8");

if (!plugin.includes("site_url( 'wp-login.php', 'login' )")) {
  throw new Error("Tun SSO authorize must bypass filtered wp_login_url() to avoid the TunApp custom /login/ redirect loop");
}

if (!plugin.includes("add_query_arg( 'redirect_to', rawurlencode( $resume ), $login_url )")) {
  throw new Error("Tun SSO login URL must preserve the authorization resume URL");
}

if (plugin.includes("return self::redirect_response( wp_login_url( $resume ) );")) {
  throw new Error("Filtered wp_login_url() still used by Tun SSO authorize and can loop through TunApp /login/");
}

console.log("Tun SSO login redirect-loop regression checks passed.");
