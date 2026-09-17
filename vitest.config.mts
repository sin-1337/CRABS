import { defineConfig } from "vitest/config";
import path from "node:path";
import fs from "node:fs";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
    reporters: ["verbose"],
    setupFiles: ["./tests/setup.ts"],
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
  },
  resolve: {
    alias: [
      {
        find: "mockups",
        replacement: path.resolve(import.meta.dirname, "src/mockups"),
      },
      {
        find: "modules",
        replacement: path.resolve(import.meta.dirname, "src/modules/index.ts"),
      },
      {
        find: /^@\/(.*)/,
        replacement: path.resolve(import.meta.dirname, "src/$1"),
      },
    ],
  },
  define: {
    __NAME__: JSON.stringify("Crazy Roster Add-on By Sin (Test)"),
    __NICKNAME__: JSON.stringify("CRABS"),
    __VERSION__: JSON.stringify("3.0.0.TEST"),
    __BRANCH__: JSON.stringify("Test"),
  },
  plugins: [
    {
      name: "vitest-raw-asset-loader",
      transform(_code, id) {
        if (id.endsWith(".css")) {
          return { code: "export default '';" };
        }
        if (id.endsWith(".html")) {
          const content = fs.readFileSync(id, "utf-8");
          return { code: `export default ${JSON.stringify(content)};` };
        }
      },
    },
  ],
});
