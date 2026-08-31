import fs from "node:fs";

const footer = fs.readFileSync("src/components/Footer.tsx", "utf8");
const cssPath = "src/components/Footer.module.css";
const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, "utf8") : "";

for (const required of [
  "/tun-footer-background.png",
  "tunapp-footer-curve",
  "tunapp-footer-artwork",
  "tunapp-footer-bar",
  "For every Armenian who loves their home.",
  "new Date().getFullYear()",
]) {
  if (!footer.includes(required)) {
    throw new Error(`TunApp-style footer missing required markup: ${required}`);
  }
}

for (const forbidden of [
  "data:image/webp;base64",
  "footer-landscape-banner",
  "footer-landscape-image",
  'href="/pricing"',
  'href="/privacy"',
  'href="/terms"',
]) {
  if (footer.includes(forbidden)) {
    throw new Error(`TunApp-style footer still includes legacy markup: ${forbidden}`);
  }
}

for (const required of [
  ".curve",
  ".curve::before",
  ".artwork",
  ".footerBar",
  "border-radius",
  "background: #1f1f1f",
  "@media (max-width: 700px)",
]) {
  if (!css.includes(required)) {
    throw new Error(`TunApp-style footer missing responsive CSS: ${required}`);
  }
}

console.log("TunApp-style footer checks passed.");
