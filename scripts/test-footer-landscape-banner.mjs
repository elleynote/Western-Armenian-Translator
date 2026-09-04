import fs from "node:fs";

const footer = fs.readFileSync("src/components/Footer.tsx", "utf8");
const cssPath = "src/components/Footer.module.css";
const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, "utf8") : "";

for (const required of [
  "https://tunapp.com/wp-content/uploads/2026/09/Tun-Footer-Translate__.png",
  "tunapp-footer-curve",
  "tunapp-footer-scene",
  "tunapp-footer-artwork",
  "tunapp-footer-bar",
  "For every Armenian who loves their home.",
  "new Date().getFullYear()",
]) {
  if (!footer.includes(required)) {
    throw new Error(`TunApp footer missing required markup: ${required}`);
  }
}

for (const required of [
  ".root",
  "padding-top: 32px",
  ".curve",
  ".scene",
  ".artwork",
  "width: min(100%, 1600px)",
  "right: 0",
  ".footerBar",
  "background: #1f1f1f",
  "@media (max-width: 700px)",
  "min-height: 240px",
  "padding-top: 24px",
]) {
  if (!css.includes(required)) {
    throw new Error(`TunApp footer styling missing CSS: ${required}`);
  }
}

for (const removed of [
  "clip-path: ellipse(72% 100% at 50% 100%)",
  "clip-path: ellipse(82% 100% at 50% 100%)",
  "background: #e9e9e9",
]) {
  if (css.includes(removed)) {
    throw new Error(`TunApp footer should not include the old curved gray scene: ${removed}`);
  }
}

console.log("TunApp footer image-only checks passed.");
