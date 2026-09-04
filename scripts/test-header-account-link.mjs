import fs from "node:fs";

const source = fs.readFileSync("src/components/Header.tsx", "utf8");

if (!source.includes('https://tunapp.com/my-account/')) {
  throw new Error("Logged-in Account link is missing Tun my-account URL");
}

if (!source.includes("{user && (")) {
  throw new Error("Logged-in navigation guard is missing");
}

if (!source.includes(">Account<")) {
  throw new Error("Logged-in Account link label is missing");
}

if (
  source.includes('<span className="brand-title">Western Armenian Translator</span>') ||
  source.includes('<span className="brand-subtitle">Translate with Tun</span>') ||
  source.includes('<span className="brand-divider"')
) {
  throw new Error("Header logo companion text/divider should be removed");
}

const rolePlayIndex = source.indexOf('label="Role-Play"');
const learnArmenianIndex = source.indexOf('>Learn Armenian<');
const pricingIndex = source.indexOf('href="/pricing"');

if (learnArmenianIndex === -1 || !source.includes('href="https://tunapp.com/get-started/"')) {
  throw new Error("Learn Armenian navigation link is missing or has the wrong URL");
}

if (!(rolePlayIndex !== -1 && pricingIndex !== -1 && rolePlayIndex < learnArmenianIndex && learnArmenianIndex < pricingIndex)) {
  throw new Error("Learn Armenian must appear between Role-Play and Pricing");
}

console.log("Header navigation checks passed.");
