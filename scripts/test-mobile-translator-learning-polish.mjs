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

const home = read("src/components/HomeTranslatorExperience.tsx");
const homeCss = [
  read("src/components/HomeTranslatorExperience.module.css"),
  read("src/components/HomeTranslatorFinalPolish.module.css"),
].join("\n");
const premium = read("src/components/PremiumFeatureNavButton.tsx");

requireTerm("Examples", home, 'label: "Parev (Hello)"');
requireTerm("Examples", home, 'label: "Yes (Ayo)"');

requireTerm("Thesaurus card", home, 'showDescription');
requireTerm("Word Breakdown card", home, 'description="Explore word-by-word meaning, structure and grammar."');
requireTerm("Premium feature button", premium, 'showDescription?: boolean');
requireTerm("Premium feature button", premium, 'premium-feature-description');

requireTerm("Mobile output layout", homeCss, '@media (max-width: 600px)');
requireTerm("Mobile output layout", homeCss, ':global(.output-panel .panel-body)');
requireTerm("Mobile output layout", homeCss, 'min-height: 0;');
requireTerm("Mobile output layout", homeCss, ':global(.output-panel .translation-output)');
requireTerm("Mobile output layout", homeCss, 'min-height: 112px;');
requireTerm("Mobile output controls", homeCss, ':global(.output-panel .panel-actions)');
requireTerm("Mobile output controls", homeCss, 'gap: 4px;');

console.log("Mobile translator and learning-card polish checks passed.");
