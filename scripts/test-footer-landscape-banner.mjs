import fs from "node:fs";

const footer = fs.readFileSync("src/components/Footer.tsx", "utf8");
const cssPath = "src/components/Footer.module.css";
const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, "utf8") : "";

for (const required of [
  "https://tunapp.com/wp-content/uploads/2020/09/Tun-App_Footer_Shiraz.png",
  "tunapp-footer-curve",
  "tunapp-footer-scene",
  "tunapp-footer-artwork",
  "tunapp-footer-bar",
  "For every Armenian who loves their home.",
  "new Date().getFullYear()",
]) {
  if (!footer.includes(required)) {
    throw new Error(`TunApp dome wrapper missing required markup: ${required}`);
  }
}

for (const required of [
  ".curve",
  ".scene",
  "clip-path: ellipse(72% 100% at 50% 100%)",
  "background: #e9e9e9",
  ".artwork",
  "width: min(100%, 1600px)",
  "right: 0",
  ".footerBar",
  "background: #1f1f1f",
  "@media (max-width: 700px)",
  "min-height: 240px",
  "clip-path: ellipse(82% 100% at 50% 100%)",
]) {
  if (!css.includes(required)) {
    throw new Error(`TunApp dome wrapper missing CSS: ${required}`);
  }
}

if (css.includes("clip-path: ellipse(72% 100% at 50% 100%);\n  pointer-events")) {
  throw new Error("The artwork itself should not own the dome clip; the scene wrapper must own it");
}

console.log("TunApp footer dome wrapper checks passed.");
