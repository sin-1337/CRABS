// @ts-nocheck
// rollup.config.mjs
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import progress from "rollup-plugin-progress";
import { string } from "rollup-plugin-string";
import postcss from "rollup-plugin-postcss";
import replace from "@rollup/plugin-replace";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const packageJson = require("./package.json");

const BUILD_VERSION = "3.0.0.105";
const BUILD_BRANCH = "Alpha";

// Dynamic target resolution for test mode
const targetBranch = process.env.OUT_DIR ? "Test" : BUILD_BRANCH;
const targetOutputFile = process.env.OUT_DIR
  ? `${process.env.OUT_DIR}/bundle.js`
  : `../Live/CRABS/${BUILD_BRANCH}/bundle.js`;

// Helper plugin to resolve bare "*.html", "*.css", and "*.json" imports
const resolveModuleAssets = () => ({
  name: "resolve-module-assets",
  resolveId(source, importer) {
    const isAsset =
      source.endsWith(".html") ||
      source.endsWith(".css") ||
      source.endsWith(".json");
    if (isAsset && !source.startsWith(".") && !source.startsWith("/")) {
      if (importer) {
        const importerDir = path.dirname(importer);

        const localTemplate = path.join(importerDir, "templates", source);
        if (fs.existsSync(localTemplate)) return localTemplate;

        const localFile = path.join(importerDir, source);
        if (fs.existsSync(localFile)) return localFile;
      }

      const modulesDir = path.resolve(__dirname, "src/modules");
      if (fs.existsSync(modulesDir)) {
        const modules = fs.readdirSync(modulesDir);
        for (const mod of modules) {
          const modPath = path.join(modulesDir, mod);
          if (!fs.statSync(modPath).isDirectory()) continue;

          const templateCandidate = path.join(modPath, "templates", source);
          if (fs.existsSync(templateCandidate)) return templateCandidate;

          const rootCandidate = path.join(modPath, source);
          if (fs.existsSync(rootCandidate)) return rootCandidate;
        }
      }
    }
    return null;
  },
});

export default {
  input: "src/main.ts",
  output: {
    name: "CRABS",
    file: targetOutputFile,
    format: "iife",
    sourcemap: true,
    banner: `// Crazy Roster Add-on By Sin (v${BUILD_VERSION} ${targetBranch})
if (typeof window.ImportBondageCollege !== "function") {
  alert("Club not detected! Please only use this while you have Club open!");
  throw "Dependency not met";
}
if (window.CRABS_Loaded !== undefined) {
  alert("CRABS is already detected in current window. To reload, please refresh the window.");
  throw "Already loaded";
}
window.CRABS_Loaded = false;
`,
    plugins: [
      terser({
        mangle: false,
      }),
    ],
  },
  treeshake: false,
  plugins: [
    replace({
      preventAssignment: true,
      values: {
        __NAME__: JSON.stringify("Crazy Roster Add-on By Sin"),
        __NICKNAME__: JSON.stringify("CRABS"),
        __VERSION__: JSON.stringify(BUILD_VERSION),
        __BRANCH__: JSON.stringify(targetBranch),
      },
    }),
    progress({ clearLine: true }),
    resolveModuleAssets(),
    resolve({
      browser: true,
      modulePaths: [
        path.resolve(__dirname, "src"),
        path.resolve(__dirname, "src/modules"),
      ],
    }),
    json(),
    postcss({
      inject: true,
      minimize: true,
      sourceMap: false,
    }),
    string({
      include: ["**/*.html"],
    }),
    typescript({
      tsconfig: "./tsconfig.json",
      inlineSources: true,
      outDir: process.env.OUT_DIR || `../Live/CRABS/${BUILD_BRANCH}`,
    }),
    commonjs(),
  ],
};
