"use client";

import { useState } from "react";
import { SiteFrame } from "@/components/SiteFrame";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./pricing.module.css";

const TUN_CHECKOUT_URLS = {
  premium: "https://tunapp.com/checkout?add-to-cart=13793",
  business: "https://tunapp.com/checkout?add-to-cart=13794",
} as const;

type IconName =
  | "gift"
  | "check"
  | "sparkles"
  | "origin"
  | "speaker"
  | "mic"
  | "bot"
  | "practice"
  | "feedback"
  | "support"
  | "shield"
  | "infinity"
  | "chat"
  | "heart"
  | "lock"
  | "star";

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "gift":
      return <svg {...common}><path d="M4 10h16v10H4z"/><path d="M2.8 7h18.4v3H2.8z"/><path d="M12 7v13"/><path d="M12 7H8.7A2.7 2.7 0 1 1 12 3.3V7Z"/><path d="M12 7h3.3A2.7 2.7 0 1 0 12 3.3V7Z"/></svg>;
    case "check":
      return <svg {...common}><path d="m5 12 4 4 10-10"/></svg>;
    case "sparkles":
      return <svg {...common}><path d="m12 3 1.3 3.2L16.5 7.5l-3.2 1.3L12 12l-1.3-3.2-3.2-1.3 3.2-1.3L12 3Z"/><path d="m18 13 .8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8L18 13Z"/><path d="M6 14.5 6.8 17 9 17.8l-2.2.8L6 21l-.8-2.4L3 17.8l2.2-.8L6 14.5Z"/></svg>;
    case "origin":
      return <svg {...common}><circle cx="12" cy="12" r="8"/><path d="M8.8 10.4c.8-1.7 2.1-2.5 3.8-2.5 2.1 0 3.5 1.1 3.5 2.7 0 1.4-.9 2.1-2.7 2.8-.9.4-1.4.8-1.4 1.6"/><path d="M12 17h.01"/></svg>;
    case "speaker":
      return <svg {...common}><path d="M4 10v4h4l5 4V6L8 10H4Z"/><path d="M16 9.5a4 4 0 0 1 0 5"/><path d="M18.7 7a7.5 7.5 0 0 1 0 10"/></svg>;
    case "mic":
      return <svg {...common}><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6.5 11.5a5.5 5.5 0 0 0 11 0"/><path d="M12 17v4"/><path d="M9 21h6"/></svg>;
    case "bot":
      return <svg {...common}><rect x="5" y="7" width="14" height="11" rx="3"/><path d="M12 4v3"/><path d="M9 12h.01M15 12h.01"/><path d="M9 15h6"/></svg>;
    case "practice":
      return <svg {...common}><circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 1.5"/><path d="M8 4.8 6.8 3.5M16 4.8l1.2-1.3"/></svg>;
    case "feedback":
      return <svg {...common}><path d="M12 3 9 9l-6 3 6 3 3 6 3-6 6-3-6-3-3-6Z"/><circle cx="12" cy="12" r="2.2"/></svg>;
    case "support":
      return <svg {...common}><path d="M5 18v-6a7 7 0 0 1 14 0v6"/><path d="M5 14H3.8A1.8 1.8 0 0 0 2 15.8v1.4A1.8 1.8 0 0 0 3.8 19H5v-5ZM19 14h1.2a1.8 1.8 0 0 1 1.8 1.8v1.4a1.8 1.8 0 0 1-1.8 1.8H19v-5Z"/><path d="M19 19c0 1.1-.9 2-2 2h-3"/></svg>;
    case "shield":
      return <svg {...common}><path d="M12 3 19 6v5.5c0 4.4-2.7 7.5-7 9.5-4.3-2-7-5.1-7-9.5V6l7-3Z"/><path d="m8.5 12 2.2 2.2 4.8-4.8"/></svg>;
    case "infinity":
      return <svg {...common}><path d="M8.4 8.5c-2 0-3.4 1.5-3.4 3.5s1.4 3.5 3.4 3.5c1.5 0 2.5-.8 3.6-2.1l1.7-2c.9-1.1 1.8-2 3.2-2 1.8 0 3.1 1.2 3.1 2.6s-1.3 2.6-3.1 2.6c-1.4 0-2.3-.9-3.2-2L12 10.6C10.9 9.3 9.9 8.5 8.4 8.5Z"/></svg>;
    case "chat":
      return <svg {...common}><path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4.5 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></svg>;
    case "heart":
      return <svg {...common}><path d="M20.8 5.7c-2-2-5.2-2-7.2 0L12 7.3l-1.6-1.6a5.1 5.1 0 0 0-7.2 7.2L12 21l8.8-8.1a5.1 5.1 0 0 0 0-7.2Z"/></svg>;
    case "lock":
      return <svg {...common}><rect x="6" y="10" width="12" height="10" rx="2"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/></svg>;
    case "star":
      return <svg {...common}><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/></svg>;
  }
}

const premiumFeatures = [
  { icon: "sparkles" as const, title: "Unlimited translations" },
  { icon: "sparkles" as const, title: "Thesaurus", note: "Find synonyms and related words" },
  { icon: "origin" as const, title: "Word Origin", note: "Explore word history" },
  { icon: "speaker" as const, title: "Text to Speech", note: "Listen to translations" },
  { icon: "mic" as const, title: "Voice Input", note: "Speak to translate" },
];

const eliteFeatures = [
  { icon: "check" as const, title: "Everything in Premium" },
  { icon: "bot" as const, title: "AI Chatbot", note: "Live Armenian conversations" },
  { icon: "practice" as const, title: "Practice speaking in real time" },
  { icon: "feedback" as const, title: "Get feedback and improve faster" },
  { icon: "support" as const, title: "Priority support" },
];

export default function PricingPage() {
  const { plan: current } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);

  function beginBilling(slug: "premium" | "business") {
    setBusy(slug);
    location.href = TUN_CHECKOUT_URLS[slug];
  }

  const premiumCurrent = current?.slug === "premium" && current?.source === "woocommerce";
  const eliteCurrent = current?.slug === "business" && current?.source === "woocommerce";

  return (
    <SiteFrame>
      <div className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.eyebrow}>SIMPLE PRICING, POWERFUL TOOLS</div>
          <h1>Choose the plan that’s right for you</h1>
          <p>Start free with 5 translations each day. Upgrade anytime to unlock unlimited translations<br className={styles.desktopBreak} /> and powerful tools to learn, listen and speak Armenian with confidence.</p>
        </section>

        <section className={styles.grid} aria-label="Pricing plans">
          <article className={`${styles.card} ${styles.freeCard}`}>
            <div className={styles.cardTop}>
              <div className={`${styles.planKicker} ${styles.freeKicker}`}>FREE</div>
              <h2>Free</h2>
              <p className={styles.description}>Perfect for trying out the basics.</p>
            </div>

            <div className={styles.freeHighlight}>
              <div className={styles.highlightIcon}><Icon name="gift" size={27} /></div>
              <div><strong>5 translations per day</strong><span>Free forever</span></div>
            </div>

            <ul className={styles.featureList}>
              {[
                "Translate English to Eastern and Western Armenian",
                "5 translations per day",
                "Basic translation history",
                "Copy and download translations",
              ].map(feature => (
                <li key={feature}><span className={`${styles.checkIcon} ${styles.freeIcon}`}><Icon name="check" size={18} /></span><span>{feature}</span></li>
              ))}
            </ul>

            <div className={styles.cardFooter}>
              <button className={`${styles.cta} ${styles.freeCta}`} disabled>Get started free</button>
              <span className={styles.ctaNote}>No credit card required</span>
            </div>
          </article>

          <article className={`${styles.card} ${styles.premiumCard}`}>
            <div className={styles.popularRibbon}>MOST POPULAR</div>
            <div className={styles.cardTop}>
              <div className={`${styles.planKicker} ${styles.premiumKicker}`}>PREMIUM</div>
              <h2>Premium</h2>
              <p className={styles.description}>Affordable access to premium features</p>
            </div>

            <div className={`${styles.price} ${styles.premiumPrice}`}><strong>US$189</strong><span>/ year</span></div>
            <div className={`${styles.valuePill} ${styles.premiumPill}`}>Save compared to monthly</div>

            <ul className={styles.featureList}>
              {premiumFeatures.map(feature => (
                <li key={feature.title}>
                  <span className={`${styles.checkIcon} ${styles.premiumIcon}`}><Icon name="check" size={18} /></span>
                  <span className={styles.featureGlyph}><Icon name={feature.icon} size={17} /></span>
                  <span><strong>{feature.title}</strong>{feature.note && <small>{feature.note}</small>}</span>
                </li>
              ))}
            </ul>

            <div className={styles.cardFooter}>
              <button className={`${styles.cta} ${styles.premiumCta}`} disabled={premiumCurrent || !!busy} onClick={() => beginBilling("premium")}>
                {premiumCurrent ? "Current plan" : busy === "premium" ? "Opening Tun checkout…" : "Upgrade to Premium"}
              </button>
              <span className={styles.ctaNote}><Icon name="shield" size={15} /> Secure checkout <b>•</b> Cancel anytime</span>
            </div>
          </article>

          <article className={`${styles.card} ${styles.eliteCard}`}>
            <div className={styles.cardTop}>
              <div className={`${styles.planKicker} ${styles.eliteKicker}`}>ELITE</div>
              <div className={styles.eliteTitleRow}><h2>Elite</h2><span className={styles.eliteStar}><Icon name="star" size={20} /></span></div>
              <p className={styles.description}>The complete learning and conversation experience.</p>
            </div>

            <div className={`${styles.price} ${styles.elitePrice}`}><strong>US$589</strong><span>/ year</span></div>
            <div className={`${styles.valuePill} ${styles.elitePill}`}>Best value for serious learners</div>

            <ul className={styles.featureList}>
              {eliteFeatures.map(feature => (
                <li key={feature.title}>
                  <span className={`${styles.checkIcon} ${styles.eliteIcon}`}><Icon name="check" size={18} /></span>
                  {feature.icon !== "check" && <span className={`${styles.featureGlyph} ${styles.eliteGlyph}`}><Icon name={feature.icon} size={17} /></span>}
                  <span><strong>{feature.title}</strong>{feature.note && <small>{feature.note}</small>}</span>
                </li>
              ))}
            </ul>

            <div className={styles.cardFooter}>
              <button className={`${styles.cta} ${styles.eliteCta}`} disabled={eliteCurrent || !!busy} onClick={() => beginBilling("business")}>
                {eliteCurrent ? "Current plan" : busy === "business" ? "Opening Tun checkout…" : "Upgrade to Elite"}
              </button>
              <span className={styles.ctaNote}><Icon name="shield" size={15} /> Secure checkout <b>•</b> Cancel anytime</span>
            </div>
          </article>
        </section>

        <section className={styles.benefits} aria-label="Plan benefits">
          <div className={styles.benefitItem}>
            <span className={`${styles.benefitIcon} ${styles.safe}`}><Icon name="shield" size={27} /></span>
            <div><h3>Safe and Private</h3><p>Your data is never shared with third parties. We respect your privacy.</p></div>
          </div>
          <div className={styles.benefitItem}>
            <span className={`${styles.benefitIcon} ${styles.unlimited}`}><Icon name="infinity" size={28} /></span>
            <div><h3>Unlimited Potential</h3><p>Learn at your own pace with powerful tools designed to help you succeed.</p></div>
          </div>
          <div className={styles.benefitItem}>
            <span className={`${styles.benefitIcon} ${styles.learners}`}><Icon name="chat" size={27} /></span>
            <div><h3>Made for Learners</h3><p>Built for the Armenian community and their loved ones worldwide.</p></div>
          </div>
          <div className={styles.benefitItem}>
            <span className={`${styles.benefitIcon} ${styles.love}`}><Icon name="heart" size={27} /></span>
            <div><h3>Made with Love</h3><p>Created with care to keep our language alive for future generations.</p></div>
          </div>
        </section>

        <div className={styles.billingNote}><Icon name="lock" size={15} /> All plans are billed securely in USD. You can cancel anytime.</div>
      </div>
    </SiteFrame>
  );
}
