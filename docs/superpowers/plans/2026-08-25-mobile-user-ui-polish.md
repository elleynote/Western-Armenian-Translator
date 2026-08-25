# Mobile User UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every customer-facing phone experience in the Tun Western Armenian Translator feel intentionally mobile-designed without changing desktop/laptop presentation, admin UI, or product behavior.

**Architecture:** Extend the existing responsive system with one dedicated customer mobile stylesheet imported last, plus targeted mobile-only rules inside existing feature CSS files where CSS Modules or feature-specific layout require them. Add user-only dashboard navigation scoping so mobile dashboard polish does not leak into admin. All visual changes are constrained to `max-width: 760px` (with narrow-phone refinements at 480/359px), while logic, data flow, billing, SSO, voice, translation, streaming, and plan gating remain untouched.

**Tech Stack:** Next.js 16.2.12, React 19.2.8, TypeScript 5.8.3, CSS/CSS Modules, Node static regression tests, GitHub Actions, Netlify preview.

**Spec:** `docs/superpowers/specs/2026-08-25-mobile-user-ui-polish-design.md`

## Global Constraints

- Customer-facing mobile UI only.
- Desktop and laptop presentation is frozen; no intentional visual change above 760px.
- Admin UI is out of scope and must not be redesigned.
- Do not delete, hide, rename, disable, or change any customer functionality.
- Do not change translation logic, streaming, OpenAI model selection, voice, Supabase behavior, WooCommerce billing, Tun SSO, legacy auth, feature gates, or plan logic.
- Preserve dark mode, Armenian typography, focus-visible behavior, reduced-motion handling, and all existing routes.
- Mobile primary/repeated actions target 48px height; compact directly interactive chips target at least 44px.
- Mobile form controls use at least 16px text.
- Customer pages must reflow at 320 CSS px without unintended page-level horizontal scrolling.
- Existing `gpt-5.4` behavior and all production invariants remain unchanged.

---

## File Structure

### Create

- `src/app/mobile-user-polish.css` — shared customer-only mobile rules, entirely media-scoped.
- `scripts/test-mobile-user-ui.mjs` — static regression guard for mobile-only isolation and key UX invariants.

### Modify

- `src/app/layout.tsx` — import `mobile-user-polish.css` after the existing responsive styles.
- `package.json` — append mobile UI regression test to `npm test`.
- `src/components/DashboardNav.tsx` — add a customer-only class to the user dashboard nav, no behavior change.
- `src/components/HomeTranslatorExperience.module.css` — translator/quick-actions/learning/history phone polish inside existing mobile media blocks.
- `src/app/dashboard/dashboard-overview.module.css` — phone typography, streak layout, cards, links.
- `src/app/dashboard/history/history.css` — 48px controls, readable stacked history content.
- `src/app/dashboard/flashcards/flashcards-mastery.css` — touch-friendly ratings and mobile typography.
- `src/app/dashboard/vocabulary-decks/vocabulary-decks-polish.css` — 48px mobile actions and form readability.
- `src/app/dashboard/practice-analytics/practice-analytics.module.css` — 44-48px period/retry controls and mobile card readability while preserving bounded chart scrolling.
- `src/app/dashboard/settings/settings.module.css` — 48px/16px mobile selects.
- `src/app/thesaurus/thesaurus-upgrades.css` — phone input/result/chip spacing if required by current selectors.
- `src/app/role-play/feedback/voice-feedback.module.css` — mobile feedback cards/actions if current selectors require feature-local changes.
- `src/app/responsive-polish.css` — only if an existing generic phone rule must be corrected at its current source rather than duplicated; do not change desktop rules.

No backend, migration, WordPress, translation API, auth, or billing files are part of this plan.

---

### Task 1: Add a mobile-only regression guard and stylesheet entry point

**Files:**
- Create: `scripts/test-mobile-user-ui.mjs`
- Create: `src/app/mobile-user-polish.css`
- Modify: `src/app/layout.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: existing `src/app/responsive-polish.css` loaded from root layout.
- Produces: a last-loaded `mobile-user-polish.css` and an `npm test` guard that later tasks must satisfy.

- [ ] **Step 1: Write the failing static regression test**

Create `scripts/test-mobile-user-ui.mjs` with checks equivalent to:

```js
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const layout = read("src/app/layout.tsx");
const mobile = fs.existsSync("src/app/mobile-user-polish.css")
  ? read("src/app/mobile-user-polish.css")
  : "";
const nav = read("src/components/DashboardNav.tsx");

if (!layout.includes('import "./mobile-user-polish.css";')) {
  throw new Error("Root layout must import the dedicated customer mobile stylesheet");
}
if (!mobile.includes("@media (max-width: 760px)")) {
  throw new Error("Mobile stylesheet must be scoped to max-width 760px");
}
if (/\.admin[-_a-zA-Z0-9]*/.test(mobile)) {
  throw new Error("Customer mobile stylesheet must not target admin UI");
}
if (!mobile.includes("min-height: 48px")) {
  throw new Error("Mobile stylesheet must include 48px touch-target rules");
}
if (!mobile.includes("font-size: 16px")) {
  throw new Error("Mobile stylesheet must include 16px form/body readability rules");
}
if (!nav.includes("user-dashboard-nav")) {
  throw new Error("User dashboard navigation needs a customer-only mobile scope class");
}

console.log("Customer mobile UI isolation checks passed.");
```

- [ ] **Step 2: Add the test to `npm test` and run it to verify failure**

Append `&& node scripts/test-mobile-user-ui.mjs` to the current `test` script in `package.json`.

Run:

```bash
npm test
```

Expected: existing tests pass until the new mobile UI test fails because the stylesheet/import/user nav class do not exist yet.

- [ ] **Step 3: Add the empty mobile stylesheet, layout import, and user nav scope**

In `src/app/layout.tsx`, import the new sheet last:

```ts
import "./globals.css";
import "./responsive-polish.css";
import "./responsive-navigation.css";
import "./mobile-user-polish.css";
```

In the user branch of `DashboardNav.tsx`, change only the class attribute:

```tsx
<nav
  className="dashboard-nav user-dashboard-nav"
  aria-label="Dashboard navigation"
>
```

Create `src/app/mobile-user-polish.css` with only mobile media blocks and initial invariant rules:

```css
@media (max-width: 760px) {
  .user-dashboard-nav a,
  .main-nav .nav-link,
  .main-nav .premium-feature-nav-link,
  .main-nav .mobile-session-action {
    min-height: 48px;
  }

  .auth-form input,
  .pricing-card button,
  .pricing-card a {
    font-size: 16px;
  }
}
```

- [ ] **Step 4: Run the new regression test**

Run:

```bash
node scripts/test-mobile-user-ui.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json scripts/test-mobile-user-ui.mjs src/app/layout.tsx src/app/mobile-user-polish.css src/components/DashboardNav.tsx
git commit -m "test: guard customer mobile UI isolation"
```

---

### Task 2: Build the shared mobile customer design layer

**Files:**
- Modify: `src/app/mobile-user-polish.css`
- Test: `scripts/test-mobile-user-ui.mjs`

**Interfaces:**
- Consumes: current global classes from `globals.css`, `responsive-polish.css`, header/footer/auth/pricing/dashboard components.
- Produces: consistent phone gutters, typography, 48px actions, form sizing, user dashboard rail, pricing/auth/footer/modal mobile behavior.

- [ ] **Step 1: Extend the regression test with shared invariants**

Add static checks for these required selectors/tokens:

```js
for (const required of [
  "--mobile-page-gutter: 16px",
  ".mobile-nav-toggle",
  ".user-dashboard-nav",
  ".pricing-card",
  ".auth-card",
  ".upgrade-modal",
  "env(safe-area-inset-bottom)",
]) {
  if (!mobile.includes(required)) {
    throw new Error(`Mobile stylesheet missing ${required}`);
  }
}
```

Run `node scripts/test-mobile-user-ui.mjs` and confirm FAIL.

- [ ] **Step 2: Implement shared phone tokens and layout rules**

Inside `@media (max-width: 760px)`, add the mobile system, keeping every rule inside the media query:

```css
@media (max-width: 760px) {
  :root {
    --mobile-page-gutter: 16px;
    --mobile-control-height: 48px;
    --mobile-compact-control-height: 44px;
    --mobile-card-padding: 16px;
  }

  .shell {
    width: calc(100% - (var(--mobile-page-gutter) * 2));
  }

  .main-content,
  .main-content-compact {
    padding-top: 20px;
    padding-bottom: calc(36px + env(safe-area-inset-bottom));
  }

  .page-intro h1,
  .dashboard-heading h1,
  .intro-section h1,
  .auth-card h1,
  .legal-page h1 {
    font-size: clamp(28px, 8vw, 32px);
    line-height: 1.12;
  }

  .page-intro p,
  .dashboard-heading p,
  .auth-card p,
  .legal-page p {
    font-size: 16px;
    line-height: 1.6;
  }

  .mobile-nav-toggle,
  .main-nav .nav-link,
  .main-nav .premium-feature-nav-link,
  .main-nav .mobile-session-action,
  .primary-button,
  .danger-button {
    min-height: var(--mobile-control-height);
  }

  .auth-form input,
  .auth-form select,
  .auth-form textarea,
  .pricing-card button,
  .pricing-card a,
  .user-dashboard-content input,
  .user-dashboard-content select,
  .user-dashboard-content textarea {
    font-size: 16px;
  }

  .user-dashboard-nav {
    gap: 8px;
    padding-block: 2px 8px;
  }

  .user-dashboard-nav a {
    min-height: 48px;
    padding-inline: 14px;
    white-space: nowrap;
  }

  .pricing-card {
    padding: 18px;
  }

  .pricing-card .primary-button,
  .pricing-card > a {
    width: 100%;
    min-height: 48px;
  }

  .upgrade-modal {
    padding-bottom: max(18px, env(safe-area-inset-bottom));
  }
}
```

Do not introduce a `.user-dashboard-content` selector unless the class already exists; when user-dashboard scoping is needed, use existing user-only descendants or add a nonvisual class in a later step only after inspecting the component. Never use unscoped `.dashboard-card` mobile rules that would redesign admin.

- [ ] **Step 3: Add narrow-phone refinement**

```css
@media (max-width: 359px) {
  :root {
    --mobile-page-gutter: 12px;
  }

  .page-intro h1,
  .dashboard-heading h1,
  .intro-section h1,
  .auth-card h1,
  .legal-page h1 {
    font-size: 26px;
  }
}
```

- [ ] **Step 4: Verify static checks and project lint**

Run:

```bash
node scripts/test-mobile-user-ui.mjs
npm run lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/mobile-user-polish.css scripts/test-mobile-user-ui.mjs
git commit -m "style: add shared customer mobile design layer"
```

---

### Task 3: Polish the translator and home learning experience

**Files:**
- Modify: `src/components/HomeTranslatorExperience.module.css`
- Modify: `src/app/mobile-user-polish.css` only for shared translator classes that cannot be handled safely in the module.
- Test: `scripts/test-mobile-user-ui.mjs`

**Interfaces:**
- Consumes: existing translator DOM/classes and all current translate/listen/copy/swap/voice behavior.
- Produces: stacked, readable, thumb-friendly translator and home learning cards on phones.

- [ ] **Step 1: Add translator mobile invariants to the test**

Require the home module to include phone rules with 48px targets and readable text:

```js
const home = read("src/components/HomeTranslatorExperience.module.css");
for (const required of [
  "@media (max-width: 600px)",
  "min-height: 48px",
  "font-size: 16px",
]) {
  if (!home.includes(required)) {
    throw new Error(`Home translator mobile CSS missing ${required}`);
  }
}
```

Run the test and confirm FAIL before implementation.

- [ ] **Step 2: Upgrade panel actions and selectors**

Inside the existing `@media (max-width: 600px)` block, override current 38px actions to 48px and make controls readable:

```css
.experience :global(.panel-action),
.experience :global(.output-secondary-action),
.experience :global(.speech-input-button),
.experience :global(.swap-button) {
  min-width: 48px;
  min-height: 48px;
}

.experience :global(.output-panel .voice-listen-control .panel-action) {
  width: 48px;
  min-width: 48px;
}

.experience :global(.output-panel .voice-speed-select) {
  min-height: 48px;
  font-size: 16px;
}

.experience :global(.select-wrap select),
.experience :global(.panel-body textarea),
.experience :global(.translation-output) {
  font-size: 16px;
}
```

Keep hidden text labels accessible exactly as they are; do not remove labels or handlers.

- [ ] **Step 3: Improve translator reflow and primary action**

Use module/global selectors already present in the feature to ensure:

```css
.experience :global(.translator-grid) {
  padding: 8px;
  gap: 12px;
}

.experience :global(.select-wrap) {
  min-width: 0;
  width: 100%;
}

.experience :global(.mobile-translate-button) {
  width: 100%;
  min-height: 48px;
  font-size: 16px;
}
```

Preserve the current vertical panel order, streaming output, swap action, and mobile keyboard behavior.

- [ ] **Step 4: Improve quick actions, learning tools, AI card, example chips, and history**

Inside phone media blocks:

```css
.quickAction {
  min-height: 76px;
  padding: 12px;
}

.quickAction strong,
.learningTool strong {
  font-size: 15px;
}

.quickAction small,
.learningTool small,
.aiCard p,
.aiCard li {
  font-size: 14px;
  line-height: 1.5;
}

.aiButton,
.exampleChips button {
  min-height: 44px;
  font-size: 14px;
}

.aiButton {
  width: 100%;
  min-height: 48px;
}

.historyList article {
  grid-template-columns: 1fr;
  gap: 6px;
  font-size: 14px;
}

.historyList span,
.historyList strong {
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
}
```

- [ ] **Step 5: Run tests and lint**

```bash
node scripts/test-mobile-user-ui.mjs
npm run lint
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/HomeTranslatorExperience.module.css src/app/mobile-user-polish.css scripts/test-mobile-user-ui.mjs
git commit -m "style: optimize translator experience for phones"
```

---

### Task 4: Polish user dashboard overview and navigation

**Files:**
- Modify: `src/app/dashboard/dashboard-overview.module.css`
- Modify: `src/app/mobile-user-polish.css`
- Test: `scripts/test-mobile-user-ui.mjs`

**Interfaces:**
- Consumes: current dashboard overview/streak markup and `user-dashboard-nav` class from Task 1.
- Produces: readable account overview, streak cards, status pills, links, and navigation on phones.

- [ ] **Step 1: Add dashboard checks**

```js
const overview = read("src/app/dashboard/dashboard-overview.module.css");
if (!overview.includes("@media (max-width: 700px)")) {
  throw new Error("Dashboard overview mobile breakpoint missing");
}
if (!overview.includes("min-height: 44px")) {
  throw new Error("Dashboard overview needs touch-friendly mobile actions");
}
```

Run the test and confirm FAIL.

- [ ] **Step 2: Improve streak mobile typography and spacing**

Inside the existing `@media (max-width: 700px)` block, add:

```css
.streakCard {
  gap: 16px;
}

.streakHeading h2 {
  font-size: 21px;
  line-height: 1.25;
}

.streakHeading p,
.currentStreak p,
.streakLocked p {
  font-size: 15px;
  line-height: 1.55;
}

.currentStreak,
.streakMetric,
.streakLocked {
  padding: 16px;
}

.streakStatus {
  min-height: 44px;
  font-size: 13px;
}

.currentStreak a,
.streakLocked a {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
}
```

Keep the current one-column metric collapse.

- [ ] **Step 3: Polish the customer dashboard rail in the shared mobile sheet**

```css
@media (max-width: 760px) {
  .user-dashboard-nav {
    margin-inline: calc(var(--mobile-page-gutter) * -1);
    padding-inline: var(--mobile-page-gutter);
    scroll-padding-inline: var(--mobile-page-gutter);
  }

  .user-dashboard-nav a {
    min-height: 48px;
    font-size: 14px;
    border-radius: 10px;
  }
}
```

Do not target `.admin-dashboard-nav`.

- [ ] **Step 4: Test and commit**

```bash
node scripts/test-mobile-user-ui.mjs
npm run lint
git add src/app/dashboard/dashboard-overview.module.css src/app/mobile-user-polish.css scripts/test-mobile-user-ui.mjs
git commit -m "style: polish mobile customer dashboard"
```

---

### Task 5: Polish History, Vocabulary Decks, Flashcards, and Practice Analytics

**Files:**
- Modify: `src/app/dashboard/history/history.css`
- Modify: `src/app/dashboard/vocabulary-decks/vocabulary-decks-polish.css`
- Modify: `src/app/dashboard/flashcards/flashcards-mastery.css`
- Modify: `src/app/dashboard/practice-analytics/practice-analytics.module.css`
- Test: `scripts/test-mobile-user-ui.mjs`

**Interfaces:**
- Consumes: existing filters, cards, deck forms, flashcard rating controls, analytics chart containers.
- Produces: touch-friendly learning/history workflows without behavior changes.

- [ ] **Step 1: Add feature regression checks**

```js
const historyCss = read("src/app/dashboard/history/history.css");
const vocabCss = read("src/app/dashboard/vocabulary-decks/vocabulary-decks-polish.css");
const flashCss = read("src/app/dashboard/flashcards/flashcards-mastery.css");
const analyticsCss = read("src/app/dashboard/practice-analytics/practice-analytics.module.css");

for (const [name, source] of [
  ["history", historyCss],
  ["vocabulary", vocabCss],
  ["flashcards", flashCss],
  ["analytics", analyticsCss],
]) {
  if (!source.includes("min-height: 48px")) {
    throw new Error(`${name} needs 48px mobile interaction targets`);
  }
}
```

Run and confirm FAIL for the files that still use 36-42px controls.

- [ ] **Step 2: History phone controls and readable cards**

Inside `@media (max-width: 620px)`:

```css
.history-search-input,
.history-filter-button,
.history-toolbar .danger-button,
.history-card-actions button,
.history-card-actions a,
.history-pagination button {
  min-height: 48px;
  font-size: 15px;
}

.history-card {
  padding: 16px;
}

.history-source,
.history-result,
.history-thesaurus-input,
.history-role-play-title {
  font-size: 16px;
  line-height: 1.55;
}

.history-pagination {
  display: grid;
  grid-template-columns: 1fr 1fr;
}
```

- [ ] **Step 3: Vocabulary form and action targets**

Inside `@media (max-width: 760px)`:

```css
.vocabulary-deck-edit-form input,
.vocabulary-deck-edit-form textarea,
.vocabulary-deck-edit-form .primary-button,
.vocabulary-deck-phrase-heading-actions > *,
.vocabulary-deck-phrase-heading-actions .primary-button,
.vocabulary-deck-phrase-heading-actions .vocabulary-deck-secondary-button,
.vocabulary-deck-phrase-heading-actions .vocabulary-deck-text-link {
  min-height: 48px;
}

.vocabulary-deck-edit-form input,
.vocabulary-deck-edit-form textarea {
  font-size: 16px;
}
```

- [ ] **Step 4: Flashcard touch and readability**

Inside `@media (max-width: 620px)`:

```css
.flashcard-rating-button {
  min-height: 72px;
  padding: 12px 14px;
}

.flashcard-rating-button strong {
  font-size: 16px;
}

.flashcard-rating-button span,
.flashcard-review-heading p,
.flashcard-review-status,
.flashcard-review-feedback {
  font-size: 14px;
  line-height: 1.5;
}

.flashcard-review-saved .primary-button {
  min-height: 48px;
}
```

Keep the existing single-column rating grid at `max-width: 620px`.

- [ ] **Step 5: Practice Analytics controls and card readability**

Inside `@media (max-width: 720px)` and `480px`:

```css
.periodButton,
.retryButton {
  min-height: 44px;
  font-size: 14px;
}

.toolbar,
.card,
.metricCard,
.stateCard {
  padding: 16px;
}

.metricLabel,
.metricHint,
.cardHeader p,
.periodMeta span,
.ratingNote,
.stateCard p {
  font-size: 14px;
  line-height: 1.5;
}
```

Preserve `.activityViewport { overflow-x: auto; }` and the chart minimum width because the chart is intentionally two-dimensional.

- [ ] **Step 6: Run test/lint and commit**

```bash
node scripts/test-mobile-user-ui.mjs
npm run lint
git add src/app/dashboard/history/history.css src/app/dashboard/vocabulary-decks/vocabulary-decks-polish.css src/app/dashboard/flashcards/flashcards-mastery.css src/app/dashboard/practice-analytics/practice-analytics.module.css scripts/test-mobile-user-ui.mjs
git commit -m "style: optimize mobile learning workflows"
```

---

### Task 6: Polish Settings, Billing, Pricing, Auth, Thesaurus, Word Breakdown, Role-Play, footer, and modals

**Files:**
- Modify: `src/app/dashboard/settings/settings.module.css`
- Modify: `src/app/mobile-user-polish.css`
- Modify if required after selector inspection: `src/app/thesaurus/thesaurus-upgrades.css`
- Modify if required after selector inspection: `src/app/role-play/feedback/voice-feedback.module.css`
- Test: `scripts/test-mobile-user-ui.mjs`

**Interfaces:**
- Consumes: existing user forms/cards/actions/routes.
- Produces: consistent mobile controls across remaining customer surfaces.

- [ ] **Step 1: Extend settings form controls**

In `settings.module.css`, add a mobile block:

```css
@media (max-width: 760px) {
  .settingsSelect {
    min-height: 48px;
    font-size: 16px;
    border-radius: 9px;
  }
}
```

- [ ] **Step 2: Add remaining shared customer mobile rules**

In `mobile-user-polish.css`, target existing customer classes only. Required behavior:

```css
@media (max-width: 760px) {
  .pricing-grid,
  .settings-grid {
    grid-template-columns: 1fr;
  }

  .auth-card {
    padding: 22px 16px;
  }

  .auth-form input,
  .auth-form select,
  .auth-form textarea,
  .auth-form button {
    min-height: 48px;
    font-size: 16px;
  }

  .footer-links {
    gap: 8px 12px;
  }

  .footer-links a {
    min-height: 44px;
  }

  .upgrade-modal-close {
    width: 48px;
    height: 48px;
  }
}
```

For Billing, Thesaurus, Word Breakdown, Role-Play and voice feedback, inspect current class names before editing and add only phone-scoped rules that:

- stack desktop action rows instead of shrinking them;
- make direct action controls 44-48px;
- set form control text to 16px;
- let Armenian/English content wrap;
- make CTA buttons full width where that improves one-handed use;
- preserve every existing button, route, voice action, plan check, and data handler.

Do not introduce new behavior or new mobile-only functional controls.

- [ ] **Step 3: Guard remaining UX invariants in the static test**

Add checks for settings and shared modal/auth selectors:

```js
const settingsCss = read("src/app/dashboard/settings/settings.module.css");
if (!settingsCss.includes("font-size: 16px")) {
  throw new Error("Settings select must be 16px on mobile");
}
for (const required of [".upgrade-modal-close", ".footer-links", ".auth-form"]) {
  if (!mobile.includes(required)) {
    throw new Error(`Mobile shared UI missing ${required}`);
  }
}
```

- [ ] **Step 4: Run tests and commit**

```bash
node scripts/test-mobile-user-ui.mjs
npm run lint
git add src/app/dashboard/settings/settings.module.css src/app/mobile-user-polish.css src/app/thesaurus/thesaurus-upgrades.css src/app/role-play/feedback/voice-feedback.module.css scripts/test-mobile-user-ui.mjs
git commit -m "style: finish customer mobile form and utility polish"
```

If either optional feature CSS file does not need a change after inspection, omit it from `git add`; do not create churn just to touch the file.

---

### Task 7: Full verification, preview review, and PR

**Files:**
- Review all changed files.
- No production backend files should be changed.

**Interfaces:**
- Consumes: completed mobile UI branch.
- Produces: green CI + Netlify preview ready for mobile acceptance testing.

- [ ] **Step 1: Run the complete project checks**

```bash
npm run lint
npm test
npm run verify
npm run build
```

Expected: all PASS.

- [ ] **Step 2: Verify the diff is mobile/customer-only**

```bash
git diff main...HEAD -- src/app src/components scripts package.json
```

Confirm:

- no Supabase function/migration changes;
- no WordPress changes;
- no auth/billing/translation logic changes;
- new shared CSS rules are inside mobile media queries;
- admin-specific selectors are absent from `mobile-user-polish.css`;
- feature CSS changes are in phone media blocks only unless an existing mobile block needed a direct correction.

- [ ] **Step 3: Test the viewport matrix on the Netlify preview**

Review customer routes at:

```text
320x568
360x800
390x844
393x852
412x915
430x932
844x390 landscape
```

Smoke-check:

```text
Home translator + streaming
Language selectors + swap
Copy/listen/voice
Direct Tun login
Pricing CTA
Dashboard rail
Dashboard overview/daily practice/streak
Saved Phrases
Vocabulary Decks
Flashcards
Practice Analytics
History
Thesaurus
Word Breakdown
Role-Play + voice feedback
Billing
Settings
Theme toggle
Logout
Upgrade modal
```

Expected: no unintended horizontal page scrolling at 320px and no missing/overlapping customer actions.

- [ ] **Step 4: Run a desktop regression spot-check**

At 1366x768 and 1440x900, compare key customer screens to `main`:

```text
Home
Pricing
Dashboard
Flashcards
Role-Play
Settings
```

Expected: no intentional desktop/laptop layout difference.

- [ ] **Step 5: Open PR**

Use title:

```text
Polish customer mobile UI across the SaaS
```

PR body must state:

```text
- Customer mobile UI only
- Desktop/laptop intentionally unchanged
- Admin intentionally unchanged
- No feature, billing, SSO, translation, streaming, voice, or backend behavior changes
- 44-48px touch targets, 16px forms, mobile typography/spacing/reflow improvements
- Tested at 320-430px widths plus landscape
```

- [ ] **Step 6: Merge only after CI + preview validation**

Do not merge on code inspection alone. Require green Quality checks, successful Netlify preview, and the mobile smoke matrix above.
