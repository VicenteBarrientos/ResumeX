import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

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
    exclude: ["**/node_modules/**", "**/*.live.test.ts"],
  },
  resolve: {
    alias: {
      "@": root,
      "server-only": path.resolve(root, "lib/ats/__tests__/server-only-stub.ts"),
    },
  },
});
