import fs from "node:fs";

const voice = fs.readFileSync("src/components/VoiceListenButton.tsx", "utf8");
const premium = fs.readFileSync("src/components/PremiumFeatureNavButton.tsx", "utf8");
const panelCss = fs.readFileSync("src/components/TranslationPanel.module.css", "utf8");
const clientPaidAccess = fs.readFileSync("src/lib/paid-feature-access.ts", "utf8");
const edgePaidAccess = fs.readFileSync("supabase/functions/_shared/paid-feature-access.ts", "utf8");
const voiceBackend = fs.readFileSync("supabase/functions/voice-tts/index.ts", "utf8");

if (!voice.includes('router.push("/pricing")')) {
  throw new Error("Locked voice control must route directly to pricing");
}

if (/disabled=\{\s*locked\s*\|\|/.test(voice)) {
  throw new Error("Voice speed must not be disabled only because audio is locked");
}

if (!voice.includes("(!locked &&")) {
  throw new Error("Locked voice button must remain clickable even when there is no translated text");
}

if (!voice.includes('hasPaidFeatureAccess(\n      voiceFeature')) {
  throw new Error("Voice control must use paid-feature entitlement checks on every viewport");
}

if (!premium.includes("locked &&\n    !systemDisabled") || !premium.includes('href="/pricing"')) {
  throw new Error("Locked premium controls must route directly to pricing");
}

function assertAudioPaidOnly(name, source) {
  const match = source.match(/audio:\s*new Set\(\[([\s\S]*?)\]\)/);
  if (!match) {
    throw new Error(`${name} is missing the audio entitlement set`);
  }

  const audioPlans = match[1];
  for (const required of ['"premium"', '"business"', '"admin"']) {
    if (!audioPlans.includes(required)) {
      throw new Error(`${name} audio entitlement is missing ${required}`);
    }
  }

  if (audioPlans.includes('"free"')) {
    throw new Error(`${name} must not grant audio to the free plan`);
  }
}

assertAudioPaidOnly("Client paid-feature access", clientPaidAccess);
assertAudioPaidOnly("Edge paid-feature access", edgePaidAccess);

if (!voiceBackend.includes("if (!account.userId)")) {
  throw new Error("Voice backend must reject non-logged-in users");
}

if (!voiceBackend.includes('hasPaidFeatureAccess(\n        "audio",')) {
  throw new Error("Voice backend must verify paid audio entitlement");
}

if (!voiceBackend.includes("if (!paidVoiceAccess)")) {
  throw new Error("Voice backend must reject logged-in users without paid audio access");
}

if (!voiceBackend.includes('code:\n            "PAID_PLAN_REQUIRED"')) {
  throw new Error("Voice backend must keep the paid-plan-required response for free users");
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
