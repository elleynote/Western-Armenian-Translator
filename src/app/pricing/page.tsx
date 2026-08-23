"use client";

import { useEffect, useState } from "react";
import { SiteFrame } from "@/components/SiteFrame";
import { useAuth } from "@/contexts/AuthContext";
import { FALLBACK_PLANS } from "@/lib/plans";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Plan, PlanSlug } from "@/types/database";

const TUN_CHECKOUT_URLS = {
  premium: "https://tunapp.com/checkout?add-to-cart=13793",
  business: "https://tunapp.com/checkout?add-to-cart=13794",
} as const;

function formatPrice(plan: Plan): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: (plan.currency || "usd").toUpperCase(),
    maximumFractionDigits: plan.price_monthly_cents % 100 === 0 ? 0 : 2
  }).format(plan.price_monthly_cents / 100);
}

function pricingPlanName(slug: PlanSlug): string {
  if (slug === "premium") return "Person";
  if (slug === "business") return "Elite";
  return "Free";
}

export default function PricingPage() {
  const { plan: current } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    void getSupabaseBrowserClient().from("plans").select("*").eq("active", true).order("sort_order")
      .then(({ data }) => setPlans((data as Plan[]) || []));
  }, []);

  const display = plans.length
    ? plans
    : Object.values(FALLBACK_PLANS).map((plan, index) => ({ ...plan, id: `${plan.slug}${index}` }));

  function beginBilling(slug: "premium" | "business") {
    setBusy(slug);
    location.href = TUN_CHECKOUT_URLS[slug];
  }

  return (
    <SiteFrame>
      <section className="page-intro">
        <p className="eyebrow">Plans</p>
        <h1>Choose your translation plan</h1>
        <p>Upgrade for a larger monthly allowance, longer requests and expanded account features.</p>
        <p>Paid subscriptions are billed annually on Tun&apos;s secure WooCommerce checkout, where the current price, tax and available payment methods are shown before payment.</p>
      </section>

      <div className="pricing-grid">
        {display.map(plan => {
          const sameEffectivePlan = current?.slug === plan.slug;
          const sameWooPlan = sameEffectivePlan && current?.source === "woocommerce";
          const displayName = pricingPlanName(plan.slug);
          const isPaidPlan = plan.slug === "premium" || plan.slug === "business";

          return (
            <article className={`pricing-card ${sameEffectivePlan ? "current" : ""}`} key={plan.slug}>
              <div>
                <span className="plan-label">
                  {sameWooPlan
                    ? "Current plan"
                    : sameEffectivePlan && current?.source === "manual"
                      ? "Manual access"
                      : displayName}
                </span>

                <h2>{displayName}</h2>

                <div className="price">
                  {isPaidPlan ? "Annual" : formatPrice(plan)}
                  <span>{isPaidPlan ? " subscription" : ""}</span>
                </div>
              </div>

              <ul>
                {plan.features.map(feature => <li key={feature}>✓ {feature}</li>)}
              </ul>

              <button
                className="primary-button full-button"
                disabled={sameWooPlan || plan.slug === "free" || !!busy}
                onClick={() => plan.slug !== "free" && beginBilling(plan.slug)}
              >
                {sameWooPlan
                  ? "Current plan"
                  : plan.slug === "free"
                    ? "Included"
                    : busy === plan.slug
                      ? "Opening Tun checkout…"
                      : sameEffectivePlan && current?.source === "manual"
                        ? "Subscribe"
                        : "Choose plan"}
              </button>
            </article>
          );
        })}
      </div>
    </SiteFrame>
  );
}
