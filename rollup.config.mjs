// rollup.config.js
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import typescript from '@rollup/plugin-typescript';
import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import progress from 'rollup-plugin-progress';
import packageJson from "./package.json" assert { type: "json" };
import simpleGit from "simple-git";

export default {
  input: 'src/main.ts',
  output: {
    name: "CRABS",
    file: '../Testing/bundle.js',
    format: 'iife',
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
      CRABS_VERSION = (CRABS_VERSION.length > 0 && CRABS_VERSION[0] == 'v') ? CRABS_VERSION : "v" + CRABS_VERSION;
      return `const CRABS_VERSION="${CRABS_VERSION}";`;
    },
    plugins: [terser({
      mangle: false
    })]
  },
  treeshake: false,
  plugins: [
    progress({ clearLine: true }),
		resolve({ browser: true }),
    typescript({ tsconfig: "./tsconfig.json", inlineSources: true }),
    commonjs()
  ]
};
