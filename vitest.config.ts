import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@shadow-council/domain": resolve("packages/domain/src/index.ts"),
      "@shadow-council/application": resolve("packages/application/src/index.ts"),
      "@shadow-council/protocol": resolve("packages/protocol/src/index.ts"),
    },
  },
  test: {
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts", "tests/**/*.test.ts"],
    environment: "node",
    passWithNoTests: false,
  },
});
