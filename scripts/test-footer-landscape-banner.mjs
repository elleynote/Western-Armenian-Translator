import fs from "node:fs";

const footer = fs.readFileSync("src/components/Footer.tsx", "utf8");
const cssPath = "src/components/Footer.module.css";
const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, "utf8") : "";

for (const required of [
  "/tun-footer-background-reference.png",
  "tunapp-footer-curve",
  "tunapp-footer-artwork",
  "tunapp-footer-bar",
  "For every Armenian who loves their home.",
  "new Date().getFullYear()",
]) {
  if (!footer.includes(required)) {
    throw new Error(`TunApp footer refinement missing required markup: ${required}`);
  }
}

for (const required of [
  ".curve",
  ".curve::before",
  "width: 200%",
  "height: 118%",
  "border-radius: 50% 50% 0 0 / 42% 42% 0 0",
  ".artwork",
  "width: min(78vw, 1200px)",
  "right: 2%",
  ".footerBar",
  "background: #1f1f1f",
  "@media (max-width: 700px)",
  "width: 165vw",
]) {
  if (!css.includes(required)) {
    throw new Error(`TunApp footer refinement missing CSS: ${required}`);
  }
}

console.log("TunApp footer refinement checks passed.");
