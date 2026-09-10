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

import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const packageJson = require("./package.json");

const BUILD_VERSION = "3.0.0.95";
const BUILD_BRANCH = "Alpha";

// Dynamic target resolution for test mode
const targetBranch = process.env.OUT_DIR ? "Test" : BUILD_BRANCH;
const targetOutputFile = process.env.OUT_DIR
  ? `${process.env.OUT_DIR}/bundle.js`
  : `../Live/CRABS/${BUILD_BRANCH}/bundle.js`;

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
    resolve({
      browser: true,
      moduleDirectories: [
        path.resolve(__dirname, "src"),
        path.resolve(__dirname, "src/modules"),
        "node_modules",
      ],
    }),
    json(),
    postcss({
      inject: true, // Inline <style> tag into output JS
      minimize: true, // Minify CSS
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
