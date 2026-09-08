import fs from "node:fs";
import path from "node:path";

import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODULES_DIR = path.resolve(__dirname, "../src/modules");
const LANGS = ["en", "cn", "de", "fr", "ru", "tw", "uk"];

// Deep helper to merge { lang: { key: value } } into { key: { lang: value } }
function mergeObjects(target, source, lang) {
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      target[key] = target[key] || {};
      mergeObjects(target[key], value, lang);
    } else {
      target[key] = target[key] || {};
      target[key][lang] = value;
    }
  }
}

for (const moduleName of fs.readdirSync(MODULES_DIR)) {
  const i18nDir = path.join(MODULES_DIR, moduleName, "i18n");
  if (!fs.existsSync(i18nDir) || !fs.statSync(i18nDir).isDirectory()) continue;

  const merged = {};

  // Process English first to guarantee baseline keys exist
  const sortedLangs = ["en", ...LANGS.filter((l) => l !== "en")];

  for (const lang of sortedLangs) {
    const filePath = path.join(i18nDir, `${lang}.json`);
    if (fs.existsSync(filePath)) {
      try {
        const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        mergeObjects(merged, content, lang);
      } catch (err) {
        console.error(`Error parsing ${filePath}:`, err.message);
      }
    }
  }

  // Write modules/<name>/i18n.json
  const targetFile = path.join(MODULES_DIR, moduleName, "i18n.json");
  fs.writeFileSync(targetFile, JSON.stringify(merged, null, 2) + "\n", "utf-8");
  console.log(`Created ${path.relative(process.cwd(), targetFile)}`);

  // Remove the old i18n/ folder and its contents
  fs.rmSync(i18nDir, { recursive: true, force: true });
}

console.log("Migration complete!");
