import fs from "node:fs";

function read(path) {
  if (!fs.existsSync(path)) return "";
  return fs.readFileSync(path, "utf8");
}

function requireTerm(name, source, term) {
  if (!source.includes(term)) {
    throw new Error(`${name} missing ${term}`);
  }
}

const layout = read("src/app/layout.tsx");
const mobile = read("src/app/mobile-user-polish.css");
const nav = read("src/components/DashboardNav.tsx");
const shell = read("src/components/DashboardShell.tsx");
const home = read("src/components/HomeTranslatorExperience.module.css");
const overview = read("src/app/dashboard/dashboard-overview.module.css");
const historyCss = read("src/app/dashboard/history/history.css");
const vocabCss = read("src/app/dashboard/vocabulary-decks/vocabulary-decks-polish.css");
const flashCss = read("src/app/dashboard/flashcards/flashcards-mastery.css");
const analyticsCss = read("src/app/dashboard/practice-analytics/practice-analytics.module.css");
const settingsCss = read("src/app/dashboard/settings/settings.module.css");
const thesaurusCss = read("src/app/thesaurus/thesaurus-upgrades.css");
const voiceFeedbackCss = read("src/app/role-play/feedback/voice-feedback.module.css");

requireTerm("Root layout", layout, 'import "./mobile-user-polish.css";');
requireTerm("Mobile stylesheet", mobile, "@media (max-width: 760px)");
requireTerm("Mobile stylesheet", mobile, "--mobile-page-gutter: 16px");
requireTerm("Mobile stylesheet", mobile, "--mobile-control-height: 48px");
requireTerm("Mobile stylesheet", mobile, "min-height: 48px");
requireTerm("Mobile stylesheet", mobile, "font-size: 16px");
requireTerm("Mobile stylesheet", mobile, ".mobile-nav-toggle");
requireTerm("Mobile stylesheet", mobile, ".user-dashboard-nav");
requireTerm("Mobile stylesheet", mobile, ".pricing-card");
requireTerm("Mobile stylesheet", mobile, ".auth-card");
requireTerm("Mobile stylesheet", mobile, ".upgrade-modal");
requireTerm("Mobile stylesheet", mobile, "env(safe-area-inset-bottom)");
requireTerm("User dashboard nav", nav, "user-dashboard-nav");
requireTerm("User dashboard shell", shell, "user-dashboard-heading");
requireTerm("User dashboard shell", shell, "user-dashboard-content");

for (const [name, source, terms] of [
  ["Home translator mobile CSS", home, ["@media (max-width: 600px)", "min-height: 48px", "font-size: 16px"]],
  ["Dashboard overview mobile CSS", overview, ["@media (max-width: 700px)", "min-height: 44px", "font-size: 15px"]],
  ["History mobile CSS", historyCss, ["@media (max-width: 620px)", "min-height: 48px", "font-size: 15px"]],
  ["Vocabulary mobile CSS", vocabCss, ["@media (max-width: 760px)", "min-height: 48px", "font-size: 16px"]],
  ["Flashcard mobile CSS", flashCss, ["@media (max-width: 620px)", "min-height: 48px", "font-size: 14px"]],
  ["Analytics mobile CSS", analyticsCss, ["@media (max-width: 720px)", "min-height: 44px", "font-size: 14px"]],
  ["Settings mobile CSS", settingsCss, ["@media (max-width: 760px)", "min-height: 48px", "font-size: 16px"]],
  ["Thesaurus mobile CSS", thesaurusCss, ["@media (max-width: 680px)", "min-height: 44px", "font-size: 14px"]],
  ["Voice feedback mobile CSS", voiceFeedbackCss, ["@media (max-width: 760px)", "min-height: 48px", "font-size: 15px"]],
]) {
  for (const term of terms) requireTerm(name, source, term);
}

for (const required of [
  ".word-breakdown-page",
  ".word-breakdown-input",
  ".word-breakdown-submit",
  ".button-row",
  ".footer-links",
  ".upgrade-modal-close",
]) {
  requireTerm("Mobile stylesheet", mobile, required);
}

if (/\.admin[-_a-zA-Z0-9]*/.test(mobile)) {
  throw new Error("Customer mobile stylesheet must not target admin UI");
}

console.log("Customer mobile UI isolation checks passed.");
