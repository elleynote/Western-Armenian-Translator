import fs from "node:fs";

const footer = fs.readFileSync("src/components/Footer.tsx", "utf8");
const css = fs.readFileSync("src/app/globals.css", "utf8");

for (const required of [
  "/armenian-footer-landscape.jpeg",
  "footer-landscape-banner",
  "footer-landscape-image",
]) {
  if (!footer.includes(required)) {
    throw new Error(`Footer landscape banner missing required markup: ${required}`);
  }
}

for (const required of [
  ".footer-landscape-banner",
  ".footer-landscape-image",
  "width: 100%",
  "height: auto",
]) {
  if (!css.includes(required)) {
    throw new Error(`Footer landscape banner missing responsive CSS: ${required}`);
  }
}

if (!fs.existsSync("public/armenian-footer-landscape.jpeg")) {
  throw new Error("Footer landscape image asset is missing");
}

console.log("Footer landscape banner checks passed.");
