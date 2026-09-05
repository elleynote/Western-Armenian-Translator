import fs from "node:fs";

const migrationPath = "supabase/migrations/20260906000100_hello_translation_memory.sql";

if (!fs.existsSync(migrationPath)) {
  throw new Error("Hello translation-memory migration is missing");
}

const migration = fs.readFileSync(migrationPath, "utf8");

for (const required of [
  "'en', 'hyw', 'Hello', 'Բարեւ'",
  "'en', 'hye', 'Hello', 'Բարև ձեզ'",
  "approved = true",
  "commercial_use_allowed = true",
]) {
  if (!migration.includes(required)) {
    throw new Error(`Hello translation-memory migration missing ${required}`);
  }
}

console.log("Hello translation-memory checks passed.");
