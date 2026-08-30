import fs from "node:fs";

const source = fs.readFileSync(
  "src/components/PremiumFeatureNavButton.tsx",
  "utf8",
);

for (const required of [
  "!loading",
  "!toggleLoading",
  "locked",
  "!systemDisabled",
]) {
  if (!source.includes(required)) {
    throw new Error(`Locked direct-pricing guard is missing: ${required}`);
  }
}

if (!source.includes('href="/pricing"')) {
  throw new Error("Locked premium features do not link directly to pricing");
}

for (const forbidden of [
  'href="/signup?next=%2Fpricing"',
  'href="/login"',
  "Create an account or log in to continue.",
]) {
  if (source.includes(forbidden)) {
    throw new Error(`Premium flow still includes legacy guest action/copy: ${forbidden}`);
  }
}

if (!source.includes("systemDisabled ?")) {
  throw new Error("Temporarily disabled feature messaging must remain separate from pricing routing");
}

console.log("Premium paid-link behavior checks passed.");
