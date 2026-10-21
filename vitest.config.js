import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.js"],
          environment: "node",
          setupFiles: ["tests/unit/setup.js"],
        },
      },
      {
        test: {
          name: "build",
          include: ["tests/build/**/*.test.js"],
          environment: "node",
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/js/**/*.js", "config/**/*.js", "scripts/**/*.js", "worker/**/*.js", "eleventy.config.js"],
      reporter: ["text", "html"],
      thresholds: { lines: 90, branches: 85, functions: 90, statements: 90 },
    },
  },
});
