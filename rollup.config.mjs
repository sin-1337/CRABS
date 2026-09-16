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

const BUILD_VERSION = "3.0.0.122";
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
// vi rollup.config.mjs
    banner: `// Crazy Roster Add-on By Sin (v${BUILD_VERSION} ${targetBranch})
(function() {
  function showCrabsModal(title, text) {
    const existing = document.getElementById("crabs-boot-alert");
    if (existing) existing.remove();

    const backdrop = document.createElement("div");
    backdrop.id = "crabs-boot-alert";
    Object.assign(backdrop.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100vw",
      height: "100vh",
      background: "rgba(0, 0, 0, 0.7)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: "2147483647",
      fontFamily: "sans-serif"
    });

    const box = document.createElement("div");
    Object.assign(box.style, {
      background: "#1c1c24",
      color: "#e0e0e0",
      border: "2px solid #ff4444",
      borderRadius: "8px",
      padding: "20px 24px",
      maxWidth: "420px",
      width: "90%",
      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
      textAlign: "center"
    });

    box.innerHTML = \`
      <div style="font-size: 1.25rem; font-weight: bold; color: #ff5555; margin-bottom: 12px;">\${title}</div>
      <div style="font-size: 0.95rem; line-height: 1.5; margin-bottom: 18px; color: #cccccc;">\${text}</div>
      <button id="crabs-alert-ok" style="
        background: #ff4444;
        color: #fff;
        border: none;
        border-radius: 4px;
        padding: 8px 20px;
        font-weight: bold;
        cursor: pointer;
      ">OK</button>
    \`;

    backdrop.appendChild(box);
    document.body.appendChild(backdrop);

    document.getElementById("crabs-alert-ok").onclick = function() {
      backdrop.remove();
    };
  }

  if (typeof window.ImportBondageCollege !== "function") {
    showCrabsModal("CRABS Error", "Club not detected! Please only load CRABS while Bondage Club is open.");
    throw new Error("[CRABS] Dependency not met: ImportBondageCollege not found");
  }

  if (window.CRABS_Loaded !== undefined) {
    showCrabsModal("CRABS Already Loaded", "Check for multiple instances of CRABS in tamper/violentmonkey, check FUSAM or other mod loaders.");
    throw new Error("[CRABS] Already loaded");
  }

  window.CRABS_Loaded = false;
})();
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
