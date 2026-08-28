import fs from "node:fs";

const componentUrl = new URL("../src/components/GoogleAnalytics.tsx", import.meta.url);
const layoutUrl = new URL("../src/app/layout.tsx", import.meta.url);

if (!fs.existsSync(componentUrl)) {
  throw new Error("Google Analytics component is missing");
}

const component = fs.readFileSync(componentUrl, "utf8");
const layout = fs.readFileSync(layoutUrl, "utf8");
const measurementId = "G-V0RC6RM1XM";

if (!component.includes(measurementId)) {
  throw new Error("Google Analytics measurement ID is missing");
}

for (const host of ["translatearmenian.com", "www.translatearmenian.com"]) {
  if (!component.includes(host)) {
    throw new Error(`Google Analytics production host guard is missing: ${host}`);
  }
}

if (!component.includes("googletagmanager.com/gtag/js")) {
  throw new Error("Google Analytics gtag loader is missing");
}

if (!component.includes("window.dataLayer")) {
  throw new Error("Google Analytics dataLayer initialization is missing");
}

if (!component.includes("gtag('config'")) {
  throw new Error("Google Analytics config call is missing");
}

if (!layout.includes("<GoogleAnalytics />")) {
  throw new Error("Google Analytics is not mounted in the root layout");
}

console.log("Google Analytics production-only setup checks passed.");
