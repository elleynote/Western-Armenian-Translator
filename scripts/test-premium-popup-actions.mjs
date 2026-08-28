import fs from "node:fs";

const source = fs.readFileSync(
  "src/components/PremiumFeatureNavButton.tsx",
  "utf8",
);

for (const required of ["View plans", "Maybe later"]) {
  if (!source.includes(required)) {
    throw new Error(`Authenticated premium popup missing required action: ${required}`);
  }
}

if (!source.includes("if (!user && locked && !systemDisabled)")) {
  throw new Error("Guest locked premium features do not bypass the popup");
}

if (!source.includes('href="/pricing"')) {
  throw new Error("Guest locked premium features do not link directly to pricing");
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

console.log("Premium paid-link behavior checks passed.");
