import fs from "node:fs";

const source = fs.readFileSync(
  "src/components/PremiumFeatureNavButton.tsx",
  "utf8",
);

for (const required of ["View plans", "Maybe later"]) {
  if (!source.includes(required)) {
    throw new Error(`Premium popup missing required action: ${required}`);
  }
}

for (const forbidden of [
  'href="/signup?next=%2Fpricing"',
  'href="/login"',
  "Create an account or log in to continue.",
]) {
  if (source.includes(forbidden)) {
    throw new Error(`Premium popup still includes legacy guest action/copy: ${forbidden}`);
  }
}

console.log("Premium popup action checks passed.");
