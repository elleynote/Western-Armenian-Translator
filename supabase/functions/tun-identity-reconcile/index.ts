import { createClient, type User, type UserIdentity } from "@supabase/supabase-js";
import { buildCorsHeaders, isOriginAllowed } from "../_shared/cors.ts";
import { getRuntimeConfig } from "../_shared/env.ts";
import { requireUser } from "../_shared/function-auth.ts";
import { isPublishableKeyAccepted } from "../_shared/security.ts";

function reply(body: Record<string, unknown>, status: number, headers: Record<string, string>) {
  return Response.json(body, {
    status,
    headers: {
      ...headers,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function identityRecord(identity: UserIdentity): Record<string, unknown> {
  return identity as unknown as Record<string, unknown>;
}

function identityData(identity: UserIdentity): Record<string, unknown> {
  const value = identityRecord(identity).identity_data;
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function providerLabel(identity: UserIdentity): string {
  const value = identityRecord(identity).provider;
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function candidateSubject(identity: UserIdentity): string {
  const data = identityData(identity);
  const fromSub = typeof data.sub === "string" || typeof data.sub === "number" ? String(data.sub).trim() : "";
  if (fromSub) return fromSub;

  const record = identityRecord(identity);
  const providerId = typeof record.provider_id === "string" || typeof record.provider_id === "number"
    ? String(record.provider_id).trim()
    : "";
  if (providerId) return providerId;

  const id = typeof record.id === "string" || typeof record.id === "number" ? String(record.id).trim() : "";
  return id;
}

function findTunSubject(user: User): string | null {
  const identities = Array.isArray(user.identities) ? user.identities : [];

  for (const identity of identities) {
    const provider = providerLabel(identity);
    if (provider !== "custom:tunapp" && provider !== "tunapp") continue;

    const subject = candidateSubject(identity);
    if (/^[1-9]\d*$/u.test(subject)) return subject;
  }

  return null;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const config = getRuntimeConfig();
    const origin = request.headers.get("origin");
    const headers = buildCorsHeaders(origin);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return reply({ error: "Only POST is supported." }, 405, headers);
    if (!isOriginAllowed(origin, config.allowedOrigins)) return reply({ error: "Origin not allowed." }, 403, headers);
    if (!isPublishableKeyAccepted(request.headers.get("apikey"), config.publishableKeys)) {
      return reply({ error: "Invalid project key." }, 401, headers);
    }
    if (!config.supabaseUrl || !config.adminKey) {
      return reply({ error: "Tun account linking is not configured." }, 503, headers);
    }

    const admin = createClient(config.supabaseUrl, config.adminKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    try {
      const user = await requireUser(admin, request);
      const subject = findTunSubject(user);

      if (!subject) {
        return reply({
          error: "Your Supabase session does not contain a verified TunApp identity. Please sign in with Tun again."
        }, 409, headers);
      }

      const wordpressUserId = Number(subject);
      if (!Number.isSafeInteger(wordpressUserId) || wordpressUserId <= 0) {
        return reply({ error: "The TunApp account identifier is invalid." }, 409, headers);
      }

      const { data, error } = await admin.rpc("reconcile_tun_identity", {
        p_user_id: user.id,
        p_provider_subject: subject,
        p_wordpress_user_id: wordpressUserId,
        p_email: user.email || null
      });

      if (error) {
        const message = error.message || "";
        if (
          message.includes("TUN_SSO_IDENTITY_CONFLICT")
          || message.includes("TUN_SSO_CUSTOMER_CONFLICT")
          || message.includes("TUN_SSO_INVALID_SUBJECT")
        ) {
          return reply({
            error: "This TunApp account is already linked to a different Translator account."
          }, 409, headers);
        }
        throw error;
      }

      const result = data && typeof data === "object" && !Array.isArray(data)
        ? data as Record<string, unknown>
        : { linked: true };

      return reply(result, 200, headers);
    } catch (error) {
      if (error instanceof Error && error.message === "AUTH_REQUIRED") {
        return reply({ error: "Sign in with Tun before linking your account." }, 401, headers);
      }

      await admin.from("system_errors").insert({
        error_code: "tun_identity_reconcile",
        safe_message: "A verified TunApp identity could not be reconciled with WooCommerce entitlement state.",
        function_name: "tun-identity-reconcile"
      });

      return reply({ error: "Could not link the TunApp account right now." }, 500, headers);
    }
  }
};
