import fs from "node:fs";

const header = fs.readFileSync("src/components/Header.tsx", "utf8");

for (const required of [
  "Try 4 Armenian lessons for $1 →",
  'href="https://tunapp.com/get-started/"',
  'target="_blank"',
  'rel="noopener noreferrer"',
]) {
  if (!header.includes(required)) {
    throw new Error(`Top promo bar missing required behavior: ${required}`);
  }
}

for (const oldCopy of [
  "Western Armenian language technology by Tun",
  "English · Western Armenian · Eastern Armenian",
]) {
  if (header.includes(oldCopy)) {
    throw new Error(`Top promo bar still includes old copy: ${oldCopy}`);
  }
}

console.log("Top promotional bar checks passed.");
