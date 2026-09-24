import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

const prompt = read("supabase/functions/_shared/translation-prompt.ts");
const openai = read("supabase/functions/_shared/openai-translation.ts");
const translate = read("supabase/functions/translate/index.ts");
const widget = read("supabase/functions/widget-translate/index.ts");
const env = read("supabase/functions/_shared/env.ts");

for (const term of [
  "WESTERN ARMENIAN DIALECT CONTROL",
  "Audit EVERY verb phrase",
  "irregular and suppletive verbs",
  "yertetsi",
  "buildTranslationVerificationInstructions",
  "buildTranslationVerificationInput",
  "requiresDialectVerification",
  "Return ONLY the final corrected translation",
]) {
  if (!prompt.includes(term)) {
    throw new Error(`Dialect accuracy prompt is missing: ${term}`);
  }
}

if (openai.includes('return { effort: "none" }')) {
  throw new Error("Translation still explicitly disables reasoning.");
}

for (const term of [
  'reasoningEffort?: "low" | "medium"',
  'requested ?? "low"',
]) {
  if (!openai.includes(term)) {
    throw new Error(`OpenAI translation helper is missing: ${term}`);
  }
}

for (const [name, source] of [
  ["translate", translate],
  ["widget", widget],
]) {
  for (const term of [
    "requiresDialectVerification",
    "buildTranslationVerificationInstructions",
    "buildTranslationVerificationInput",
    'reasoningEffort: "medium"',
  ]) {
    if (!source.includes(term)) {
      throw new Error(`${name} pipeline is missing: ${term}`);
    }
  }
}

if (!translate.includes("translateWithOpenAIStream")) {
  throw new Error("Non-Armenian streaming path was accidentally removed.");
}

if (!env.includes("OPENAI_VERIFIER_MODEL")) {
  throw new Error("Optional verifier model configuration is missing.");
}

console.log("Dialect accuracy translation/verification architecture checks passed.");
