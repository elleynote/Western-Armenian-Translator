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

requireTerm("Root layout", layout, 'import "./mobile-user-polish.css";');
requireTerm("Mobile stylesheet", mobile, "@media (max-width: 760px)");
requireTerm("Mobile stylesheet", mobile, "min-height: 48px");
requireTerm("Mobile stylesheet", mobile, "font-size: 16px");
requireTerm("User dashboard nav", nav, "user-dashboard-nav");

if (/\.admin[-_a-zA-Z0-9]*/.test(mobile)) {
  throw new Error("Customer mobile stylesheet must not target admin UI");
}

console.log("Customer mobile UI isolation checks passed.");
