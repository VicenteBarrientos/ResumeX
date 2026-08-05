import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "lib/**/*.test.ts",
      "lib/**/__tests__/**/*.test.ts",
      "app/**/*.test.ts",
      "components/**/*.test.ts",
    ],
  },
  resolve: {
    alias: {
      "@": root,
    },
  },
});
