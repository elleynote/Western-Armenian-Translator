import fs from "node:fs";

const voice = fs.readFileSync("src/components/VoiceListenButton.tsx", "utf8");
const premium = fs.readFileSync("src/components/PremiumFeatureNavButton.tsx", "utf8");
const panelCss = fs.readFileSync("src/components/TranslationPanel.module.css", "utf8");

if (!voice.includes('router.push("/pricing")')) {
  throw new Error("Locked voice control must route directly to pricing");
}

if (/disabled=\{\s*locked\s*\|\|/.test(voice)) {
  throw new Error("Voice speed must not be disabled only because audio is locked");
}

if (!voice.includes("(!locked &&")) {
  throw new Error("Locked voice button must remain clickable even when there is no translated text");
}

if (!premium.includes("locked &&\n    !systemDisabled") || !premium.includes('href="/pricing"')) {
  throw new Error("Locked premium controls must route directly to pricing");
}

for (const required of [
  "@media (max-width: 700px)",
  ":global(.translation-panel .panel-header)",
  ":global(.output-panel .panel-actions)",
  "grid-template-columns: minmax(0, 1fr) auto auto",
  ":global(.output-panel .panel-actions > .voice-listen-control)",
]) {
  if (!panelCss.includes(required)) {
    throw new Error(`Mobile paid controls CSS is missing: ${required}`);
  }
}

console.log("Mobile paid controls checks passed.");
