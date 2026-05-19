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

// ✅ Import createRequire for loading JSON without assert
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const packageJson = require("./package.json");

// 👇 THESE ARE THE LINES YOUR DEPLOY SCRIPT UPDATES! 👇
const BUILD_VERSION = "2.1.2.255";
const BUILD_BRANCH = "Stable";

export default {
	input: "src/main.ts",
	output: {
		name: "CRABS",
		// Dynamically outputs to the correct folder!
		file: `../Live/CRABS/${BUILD_BRANCH}/bundle.js`,
		format: 'iife',
		sourcemap: true,
		banner: `// Crazy Roster Add-on By Sin (v${BUILD_VERSION} ${BUILD_BRANCH})
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
				__BRANCH__: JSON.stringify(BUILD_BRANCH),
			}
		}),
		progress({ clearLine: true }),
		resolve({ browser: true }),
		json(),
		postcss({
			inject: true,      // ✅ Inline <style> tag into output JS
			minimize: true,    // Optional: Minify CSS
			sourceMap: false,  // Optional
		}),
		string({
			include: ["**/*.html"],
		}),
		typescript({ tsconfig: "./tsconfig.json", inlineSources: true }),
		commonjs(),
	],
};
