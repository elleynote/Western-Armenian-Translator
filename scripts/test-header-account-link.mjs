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

console.log("Logged-in Account navigation checks passed.");
