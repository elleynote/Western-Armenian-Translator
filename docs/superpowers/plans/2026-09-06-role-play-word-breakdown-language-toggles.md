# Role-Play and Word Breakdown Language Toggles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Western/Eastern Armenian language selection to Role-Play and Word Breakdown, add per-message English translation in Role-Play, and expose Eastern Armenian in Role-Play speech input while preserving current Western defaults.

**Architecture:** Keep the existing Supabase schema unchanged. Persist the Role-Play conversation language in the existing `role_play_sessions.metadata` JSON so the backend, not the browser, is authoritative for the active session language. Add a Role-Play `translate` action that translates an owned assistant turn to English without writing to normal translation history. Word Breakdown sends an explicit Armenian language code with each request and selects matching knowledge/prompt rules.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase Edge Functions, OpenAI Responses API, existing Node regression scripts.

**Spec:** Approved design in the 2026-09-06 project conversation.

## Global Constraints

- Preserve `gpt-5.4` as the configured translator/AI model and do not alter translator streaming.
- Default all new Armenian-language controls to Western Armenian (`hyw`).
- Supported conversation/breakdown varieties are only Western Armenian (`hyw`) and Eastern Armenian (`hye`).
- Role-Play speech input must offer Western Armenian, Eastern Armenian, and English.
- Do not add or modify database migrations; use existing `role_play_sessions.metadata` for session language.
- Do not route Role-Play message translation through normal translator history or usage flows.
- Do not show the Western-Armenian transliterator for Eastern Armenian content.
- Keep existing paid-feature, Tun SSO, WooCommerce billing, and account behavior unchanged.
- Edge Function changes are not auto-deployed by Netlify; provide manual deploy commands only after merge.

---

### Task 1: Add regression coverage for the approved language behavior

**Files:**
- Create: `scripts/test-learning-language-toggles.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: repository source files as text, following the project’s existing regression-script pattern.
- Produces: a deterministic `npm test` guard for the new Role-Play and Word Breakdown language contracts.

- [ ] **Step 1: Write the failing regression script**

Create a script that asserts all of the following source contracts exist: Role-Play exposes Western/Eastern conversation selection, Role-Play speech exposes `hye`, assistant messages expose `Translate to English`, Role-Play API has a `translateRolePlayTurn` client function, Role-Play start sends `conversationLanguage`, Role-Play backend accepts a `translate` action and persists `conversationLanguage` in session metadata, Eastern mode does not use Western transliteration, Word Breakdown exposes Western/Eastern selection, Word Breakdown API sends `language`, and Word Breakdown backend validates and uses `hyw`/`hye`.

- [ ] **Step 2: Add the script to `npm test`**

Append `node scripts/test-learning-language-toggles.mjs` to the existing test command without removing or reordering unrelated tests.

- [ ] **Step 3: Open a Draft PR and verify RED**

Use the test-only commit to trigger the existing pull-request Quality checks. Expected result: `npm test` fails because the approved language behavior is not implemented yet.

### Task 2: Make Role-Play conversation language session-authoritative

**Files:**
- Modify: `src/lib/role-play-api.ts`
- Modify: `supabase/functions/role-play/index.ts`

**Interfaces:**
- Consumes: `RolePlayConversationLanguage = "hyw" | "hye"`, existing `role_play_sessions.metadata`, existing OpenAI config/model.
- Produces: `startRolePlaySession(..., conversationLanguage, ...)`, session responses with `conversationLanguage`, language-aware AI replies, Eastern opening generation, and `translateRolePlayTurn(sessionId, turnIndex, ...)`.

- [ ] **Step 1: Extend client types and request bodies**

Add `RolePlayConversationLanguage`, add `conversationLanguage` to `RolePlaySession`, send it on `start`, and add a typed `translateRolePlayTurn` function that sends `{ action: "translate", sessionId, turnIndex }` and returns an English translation.

- [ ] **Step 2: Parse and persist conversation language on start**

Add a backend parser that only accepts `hyw` or `hye`, defaulting `start` to `hyw`. Store it under `metadata.conversationLanguage` while preserving existing category/difficulty metadata.

- [ ] **Step 3: Read conversation language from session metadata for later actions**

Include `metadata` in session selection, derive `hyw` when legacy rows have no language, and return `conversationLanguage` in session responses. Message generation must use the stored session value rather than trusting a per-message browser value.

- [ ] **Step 4: Make knowledge retrieval and prompts language-aware**

For Western sessions preserve the current English→Western, Western→English, and Eastern→Western context behavior. For Eastern sessions retrieve English→Eastern and Eastern→English guidance and instruct the model to respond in natural Eastern Armenian rather than Western Armenian.

- [ ] **Step 5: Generate an Eastern opening turn only for Eastern sessions**

Keep the stored scenario opening unchanged for Western sessions. For Eastern sessions, use the existing configured OpenAI model to convert the opening to natural Eastern Armenian before saving the first turn; if generation fails, clean up the newly created session just like the existing opening-turn failure path.

- [ ] **Step 6: Add the Role-Play translate action**

Validate `sessionId` and `turnIndex`, verify the session belongs to the current user, load only the requested assistant turn, derive its source variety from stored session metadata, and use the existing configured model to return concise English translation text without inserting any new database row.

### Task 3: Add Role-Play language controls and message translation UI

**Files:**
- Modify: `src/app/role-play/page.tsx`
- Modify: `src/app/globals.css` only if existing classes cannot present the controls cleanly.

**Interfaces:**
- Consumes: `RolePlayConversationLanguage`, `translateRolePlayTurn`, session `conversationLanguage`, existing `VoiceListenButton` and `SpeechToTextButton`.
- Produces: pre-session Western/Eastern selector, stable active-session language display/behavior, Eastern speech option, per-assistant-turn cached English translation UI.

- [ ] **Step 1: Add conversation language state**

Default to `hyw`. Pass the chosen value to `startRolePlaySession`; after start, use `result.session.conversationLanguage` as the authoritative active language.

- [ ] **Step 2: Add the pre-session language selector**

Place `Conversation language` beside the selected scenario start controls with options `Western Armenian` and `Eastern Armenian`. Disable it while starting.

- [ ] **Step 3: Make assistant rendering language-aware**

Pass the active conversation language into each assistant message. Use it for `VoiceListenButton`. Compute/show Western transliteration only for `hyw`; render no Western transliteration in `hye` mode.

- [ ] **Step 4: Add cached English translation per assistant turn**

Track translated text by `turnIndex`, track which translation is visible, and track the currently translating turn. First click calls `translateRolePlayTurn`; later clicks show/hide the cached result without another request. Labels are `Translate to English`, `Translating...`, and `Hide English`.

- [ ] **Step 5: Add Eastern Armenian to speech input**

Expand local Role-Play speech-language state to `hyw | hye | en`, add the `Eastern Armenian` option, and pass the selected value unchanged to `SpeechToTextButton`.

### Task 4: Make Word Breakdown explicitly Western/Eastern

**Files:**
- Modify: `src/lib/word-breakdown-api.ts`
- Modify: `supabase/functions/word-breakdown/index.ts`
- Modify: `src/app/word-breakdown/page.tsx`
- Modify: `src/app/globals.css` only for minimal control styling if necessary.

**Interfaces:**
- Consumes: `WordBreakdownLanguage = "hyw" | "hye"`, existing knowledge-base lookup, existing OpenAI config/model.
- Produces: language-aware breakdown request, knowledge lookup, prompt, labels, and Western-only transliteration.

- [ ] **Step 1: Extend the client request**

Add `WordBreakdownLanguage` and require the UI to send `{ text, language }`.

- [ ] **Step 2: Validate language in the Edge Function**

Accept only `hyw` and `hye`, defaulting missing language to `hyw` for backward compatibility.

- [ ] **Step 3: Switch knowledge lookup and prompt wording**

Use `${language} -> en` knowledge. Western mode keeps traditional Western rules; Eastern mode instructs the model to analyse Eastern Armenian and not silently convert it to Western.

- [ ] **Step 4: Add the Word Breakdown selector and dynamic copy**

Default to Western Armenian. Add a `Language` selector above the text area, update heading/label/placeholder/tip to the selected variety, and pass the selected language to the API.

- [ ] **Step 5: Restrict transliteration to Western mode**

Pass the selected language into Armenian rendering helpers and only calculate/display `transliterateWesternArmenian` when `language === "hyw"`.

### Task 5: Verify and prepare the branch for review

**Files:**
- No new production files beyond Tasks 1–4.

**Interfaces:**
- Consumes: the completed branch.
- Produces: verified Draft PR ready for user review, but not merged.

- [ ] **Step 1: Verify focused regression test is GREEN**

Confirm the pull-request Quality check no longer fails on `scripts/test-learning-language-toggles.mjs`.

- [ ] **Step 2: Verify full CI**

Confirm the existing GitHub Quality job reports success for `npm install`, PHP lint, `npm run lint`, `npm run test`, `npm run verify`, and `npm run build`.

- [ ] **Step 3: Verify Netlify preview**

Confirm the branch/PR commit receives a successful Netlify deploy-preview status.

- [ ] **Step 4: Review exact diff**

Confirm only the approved Role-Play/Word Breakdown files, the focused regression test, package test registration, and this plan changed. Confirm no migration, translator model, streaming, auth, billing, or unrelated UI files changed.

- [ ] **Step 5: Leave the PR unmerged**

Report the Draft PR URL, changed files, CI evidence, and the exact post-merge Supabase Edge Function deploy commands for `role-play` and `word-breakdown`. Do not merge without explicit user approval.
