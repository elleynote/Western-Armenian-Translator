import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(
  new URL("../src/app/word-breakdown/page.tsx", import.meta.url),
  "utf8",
);

const api = await readFile(
  new URL("../src/lib/word-breakdown-api.ts", import.meta.url),
  "utf8",
);

const edge = await readFile(
  new URL("../supabase/functions/word-breakdown/index.ts", import.meta.url),
  "utf8",
);

assert.match(
  page,
  /Armenian script or Latin transliteration/u,
  "Word Breakdown should tell users Latin transliteration is accepted.",
);

assert.match(
  page,
  /Interpreted as/u,
  "Word Breakdown should show the Armenian form used for Latin input.",
);

assert.match(
  api,
  /interpretedInput:\s*string/u,
  "Word Breakdown API result should expose interpreted Armenian text.",
);

assert.match(
  edge,
  /ARMENIAN_SCRIPT_PATTERN/u,
  "Word Breakdown should detect whether input already contains Armenian script.",
);

assert.match(
  edge,
  /async function normalizeLatinTransliteration/u,
  "Word Breakdown should normalize Latin transliteration before analysis.",
);

assert.match(
  edge,
  /Western Armenian[\s\S]*Eastern Armenian/u,
  "Latin normalization should be language-aware for both Armenian varieties.",
);

assert.match(
  edge,
  /const analysisText[\s\S]*ARMENIAN_SCRIPT_PATTERN/u,
  "Word Breakdown should preserve Armenian-script input and only normalize Latin input.",
);

assert.match(
  edge,
  /findRelevantContext\([\s\S]*analysisText,[\s\S]*language,[\s\S]*"en"/u,
  "Knowledge lookup should use the normalized Armenian text.",
);

assert.match(
  edge,
  /armenian:\s*analysisText/u,
  "AI breakdown should analyse the normalized Armenian text.",
);

assert.match(
  edge,
  /input:\s*analysisText/u,
  "Word Breakdown response should return the Armenian text actually analysed.",
);

assert.match(
  edge,
  /interpretedInput,/u,
  "Word Breakdown response should identify the interpreted Armenian form for Latin input.",
);

console.log("Word Breakdown Latin transliteration checks passed.");
