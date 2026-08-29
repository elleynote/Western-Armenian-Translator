import fs from "node:fs";

const footer = fs.readFileSync("src/components/Footer.tsx", "utf8");
const cssPath = "src/components/Footer.module.css";
const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, "utf8") : "";

for (const required of [
  "data:image/jpeg;base64",
  "footer-landscape-banner",
  "footer-landscape-image",
]) {
  if (!footer.includes(required)) {
    throw new Error(`Footer landscape banner missing required markup: ${required}`);
  }
}

for (const required of [
  ".banner",
  ".image",
  "width: 100%",
  "height: auto",
]) {
  if (!css.includes(required)) {
    throw new Error(`Footer landscape banner missing responsive CSS: ${required}`);
  }
}

for (let index = 1; index <= 5; index += 1) {
  if (!fs.existsSync(`src/components/footerLandscapeImage${index}.ts`)) {
    throw new Error(`Footer landscape image source chunk ${index} is missing`);
  }
}

console.log("Footer landscape banner checks passed.");
