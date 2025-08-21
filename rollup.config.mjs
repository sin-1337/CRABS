// rollup.config.js
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

export default {
  input: "src/main.ts",
  output: {
    name: "CRABS",
    file: "../Live/CRABS/Alpha/bundle.js",
    format: "iife",
    sourcemap: true,
    banner: `// Crazy Roster Add-on By Sin
if (typeof window.ImportBondageCollege !== "function") {
  alert("Club not detected! Please only use this while you have Club open!");
  throw "Dependency not met";
}
if (window.CRABS_Loaded !== undefined) {
  alert("CRABS is already detected in current window. To reload, please refresh the window.");
  throw "Already loaded";
}
window.CRABS_Loaded = false;
console.debug("CRABS: Parse start...");
`,
    intro: async () => {
      // const git = simpleGit();
      // console.log(await git.status());
      let CRABS_VERSION = packageJson.version;
      // await git.tags((err, tags) => {
      //   if (!!tags.latest) {
      //     console.log('\nUsing tag version: %s\n', tags.latest);
      //     CRABS_VERSION = tags.latest;
      //   } else {
      //     console.log('\nUnable to determine latest tag: %s\n', tags.latest);
      //   }
      // });
      CRABS_VERSION =
        CRABS_VERSION.length > 0 && CRABS_VERSION[0] == "v"
          ? CRABS_VERSION
          : "v" + CRABS_VERSION;
      return `const CRABS_VERSION="${CRABS_VERSION}";`;
    },
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
		NAME: JSON.stringify("Crazy Roster Add-on By Sin"),
		NICKNAME: JSON.stringify("CRABS"),
  		VERSION: JSON.stringify("1.3.2.6 Alpha"),
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
