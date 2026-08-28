import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/app/pricing/page.tsx", import.meta.url), "utf8");
const styles = fs.readFileSync(new URL("../src/app/pricing/pricing.module.css", import.meta.url), "utf8");

const requiredCopy = [
  "SIMPLE PRICING, POWERFUL TOOLS",
  "Choose the plan that’s right for you",
  "Translate English to Eastern and Western Armenian",
  "Copy and download translations",
  "Affordable access to premium features",
  "Find synonyms and related words",
  "The complete learning and conversation experience.",
  "Your data is never shared with third parties. We respect your privacy.",
  "Built for the Armenian community and their loved ones worldwide.",
  "US$189",
  "US$589",
  "Upgrade to Premium",
  "Upgrade to Elite"
];

for (const text of requiredCopy) {
  if (!source.includes(text)) {
    throw new Error(`Pricing redesign is missing required copy: ${text}`);
  }
}

if (!source.includes("https://tunapp.com/checkout?add-to-cart=13793")) {
  throw new Error("Premium WooCommerce checkout URL changed or is missing");
}

if (!source.includes("https://tunapp.com/checkout?add-to-cart=13794")) {
  throw new Error("Elite WooCommerce checkout URL changed or is missing");
}

const responsiveVisualRequirements = [
  ["transform: translateY(-12px) scale(1.01);", "Premium card is not elevated on desktop"],
  ["0 18px 48px rgba(93, 49, 216, .18)", "Premium card does not have the stronger featured shadow"],
  [".premiumCard { transform: none; }", "Premium elevation is not reset for stacked tablet/mobile layouts"],
];

for (const [needle, message] of responsiveVisualRequirements) {
  if (!styles.includes(needle)) {
    throw new Error(message);
  }
}

const desktopPageRule = styles.match(/\.page\s*\{([\s\S]*?)\}/)?.[1] ?? "";
const hasDesktopTopSpacing =
  /padding:\s*[1-9]\d*px\s+0\s+\d+px\s*;/.test(desktopPageRule) ||
  /padding-top:\s*[1-9]\d*px\s*;/.test(desktopPageRule);

if (!hasDesktopTopSpacing) {
  throw new Error("Pricing content is not spaced safely below the site header");
}

const responsiveTopSpacingRules = styles.match(/\.page\s*\{\s*padding-top:\s*[1-9]\d*px;\s*\}/g) ?? [];
if (responsiveTopSpacingRules.length < 2) {
  throw new Error("Pricing header spacing is not adjusted for tablet and mobile layouts");
}

console.log("Pricing page redesign checks passed.");
