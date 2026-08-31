import fs from "node:fs";

const footer = fs.readFileSync("src/components/Footer.tsx", "utf8");
const cssPath = "src/components/Footer.module.css";
const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, "utf8") : "";

for (const required of [
  "https://tunapp.com/wp-content/uploads/2020/09/Tun-App_Footer_Shiraz.png",
  "tunapp-footer-curve",
  "tunapp-footer-artwork",
  "tunapp-footer-bar",
  "For every Armenian who loves their home.",
  "new Date().getFullYear()",
]) {
  if (!footer.includes(required)) {
    throw new Error(`TunApp exact footer missing required markup: ${required}`);
  }
}

for (const required of [
  ".curve",
  ".curve::before",
  "width: 110%",
  "height: 100%",
  "border-radius: 50% 50% 0 0 / 35% 35% 0 0",
  ".artwork",
  "width: min(100%, 1600px)",
  "right: 0",
  ".footerBar",
  "background: #1f1f1f",
  "@media (max-width: 700px)",
  "min-height: 240px",
  "width: 116%",
  "border-radius: 50% 50% 0 0 / 34% 34% 0 0",
]) {
  if (!css.includes(required)) {
    throw new Error(`TunApp final footer curve missing CSS: ${required}`);
  }
}

console.log("TunApp final footer curve checks passed.");
