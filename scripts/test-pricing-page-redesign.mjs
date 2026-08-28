import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/app/pricing/page.tsx", import.meta.url), "utf8");

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

console.log("Pricing page redesign checks passed.");
