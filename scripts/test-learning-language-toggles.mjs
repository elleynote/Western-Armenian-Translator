import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const rolePlayPage = await readFile(
  new URL("../src/app/role-play/page.tsx", import.meta.url),
  "utf8",
);

const rolePlayApi = await readFile(
  new URL("../src/lib/role-play-api.ts", import.meta.url),
  "utf8",
);

const rolePlayFunction = await readFile(
  new URL("../supabase/functions/role-play/index.ts", import.meta.url),
  "utf8",
);

const wordBreakdownPage = await readFile(
  new URL("../src/app/word-breakdown/page.tsx", import.meta.url),
  "utf8",
);

const wordBreakdownApi = await readFile(
  new URL("../src/lib/word-breakdown-api.ts", import.meta.url),
  "utf8",
);

const wordBreakdownFunction = await readFile(
  new URL("../supabase/functions/word-breakdown/index.ts", import.meta.url),
  "utf8",
);

assert.match(
  rolePlayPage,
  /Conversation language/u,
  "Role-Play should expose a conversation-language control.",
);
assert.match(
  rolePlayPage,
  /<option value="hye">\s*Eastern Armenian\s*<\/option>/u,
  "Role-Play should expose Eastern Armenian as a conversation/speech option.",
);
assert.match(
  rolePlayPage,
  /Translate to English/u,
  "Role-Play assistant turns should offer English translation.",
);
assert.match(
  rolePlayPage,
  /conversationLanguage ===\s*"hyw"/u,
  "Role-Play should limit the Western transliterator to Western Armenian sessions.",
);
assert.match(
  rolePlayApi,
  /export type RolePlayConversationLanguage\s*=\s*\|?\s*"hyw"\s*\|\s*"hye"/u,
  "Role-Play API should type the two supported Armenian conversation varieties.",
);
assert.match(
  rolePlayApi,
  /conversationLanguage,/u,
  "Role-Play start requests should send the selected conversation language.",
);
assert.match(
  rolePlayApi,
  /export async function translateRolePlayTurn/u,
  "Role-Play API should expose a dedicated assistant-turn translation action.",
);
assert.match(
  rolePlayFunction,
  /\|\s*"translate";/u,
  "Role-Play Edge Function should accept the translate action.",
);
assert.match(
  rolePlayFunction,
  /parseConversationLanguage/u,
  "Role-Play Edge Function should validate conversation language.",
);
assert.match(
  rolePlayFunction,
  /session\.metadata[\s\S]*conversationLanguage/u,
  "Role-Play should read the active conversation language from persisted session metadata.",
);
assert.match(
  rolePlayFunction,
  /metadata:\s*\{[\s\S]*conversationLanguage,/u,
  "Role-Play should persist the chosen conversation language in existing session metadata.",
);
assert.match(
  rolePlayFunction,
  /action ===\s*"translate"[\s\S]*\.eq\(\s*"user_id",[\s\S]*user\.id/u,
  "Role-Play translation should verify that the session belongs to the current user.",
);
assert.doesNotMatch(
  rolePlayFunction,
  /translation_history/u,
  "Role-Play message translation should stay isolated from normal translation history.",
);
assert.match(
  rolePlayFunction,
  /Respond primarily in Eastern Armenian/u,
  "Role-Play Eastern sessions should have an Eastern-Armenian AI prompt.",
);
assert.match(
  rolePlayFunction,
  /Respond primarily in Western Armenian/u,
  "Role-Play Western sessions should preserve the Western-Armenian AI prompt.",
);
assert.match(
  wordBreakdownPage,
  /Western Armenian[\s\S]*Eastern Armenian/u,
  "Word Breakdown should expose both Armenian varieties.",
);
assert.match(
  wordBreakdownPage,
  /requestWordBreakdown\([\s\S]*language/u,
  "Word Breakdown UI should send the selected language.",
);
assert.match(
  wordBreakdownPage,
  /language ===\s*"hyw"/u,
  "Word Breakdown should only show Western transliteration in Western mode.",
);
assert.match(
  wordBreakdownApi,
  /export type WordBreakdownLanguage\s*=\s*\|?\s*"hyw"\s*\|\s*"hye"/u,
  "Word Breakdown API should type the supported Armenian varieties.",
);
assert.match(
  wordBreakdownApi,
  /JSON\.stringify\(\{[\s\S]*text,[\s\S]*language/u,
  "Word Breakdown API should send language with the text.",
);
assert.match(
  wordBreakdownFunction,
  /language\?: unknown/u,
  "Word Breakdown Edge Function should accept a language field.",
);
assert.match(
  wordBreakdownFunction,
  /language === "hye"/u,
  "Word Breakdown Edge Function should validate Eastern Armenian explicitly.",
);
assert.match(
  wordBreakdownFunction,
  /findRelevantContext\([\s\S]*admin,[\s\S]*analysisText,[\s\S]*language,[\s\S]*"en"/u,
  "Word Breakdown knowledge lookup should follow the selected Armenian variety using the Armenian text being analysed.",
);

console.log("Learning language toggle checks passed.");
