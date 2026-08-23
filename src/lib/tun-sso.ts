import type { Session } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export const TUN_OAUTH_PROVIDER = "custom:tunapp";

export function safeTunNext(value: string | null | undefined): string {
  return value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}

export async function startTunSignIn(
  next?: string,
  options?: { checkout?: boolean },
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const safeNext = safeTunNext(next);
  const provider = TUN_OAUTH_PROVIDER as Parameters<
    typeof supabase.auth.signInWithOAuth
  >[0]["provider"];
  const checkout = options?.checkout === true ? "&checkout=1" : "";

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      scopes: "profile email",
      redirectTo: `${location.origin}/auth/tun?complete=1&next=${encodeURIComponent(safeNext)}${checkout}`,
    },
  });

  if (error) throw error;
}

export interface TunReconciliationResult {
  linked: boolean;
  entitlement_linked?: boolean;
  status?: string | null;
  woocommerce_subscription_id?: number | null;
  plan?: Record<string, unknown> | null;
}

export function isActiveWooPlan(result: TunReconciliationResult): boolean {
  const plan = result.plan;
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) return false;

  return plan.source === "woocommerce"
    && (plan.slug === "premium" || plan.slug === "business")
    && plan.subscription_status === "active";
}

export async function reconcileTunIdentity(
  session: Session,
): Promise<TunReconciliationResult> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase.functions.invoke(
    "tun-identity-reconcile",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: {},
    },
  );

  if (error) throw error;

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Tun account linking returned an invalid response.");
  }

  return data as TunReconciliationResult;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export async function reconcileTunIdentityWithRetry(
  session: Session,
  attempts = 6,
  delayMs = 1500,
): Promise<TunReconciliationResult> {
  let result = await reconcileTunIdentity(session);

  for (let attempt = 1; attempt < attempts && !isActiveWooPlan(result); attempt += 1) {
    await wait(delayMs);
    result = await reconcileTunIdentity(session);
  }

  return result;
}
