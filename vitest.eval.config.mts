import { existsSync } from "node:fs";
import { defineConfig } from "vitest/config";

// `npm run eval` — живий прогін golden cases на Claude API (взято з materials/ai-feature набору курсу). Ніколи не частина
// `npm test` / CI: основний vitest.config.mts бере лише *.test.ts(x), а цей — лише evals/**/*.eval.ts.
// .env.local → process.env лише для цього прогону (ANTHROPIC_API_KEY), як у playwright.config.ts; значень не друкуємо.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["evals/**/*.eval.ts"],
    fileParallelism: false, // по одному запиту: ключ і бюджет спільні на команду
    testTimeout: 120_000,
    hookTimeout: 30_000,
    expect: { requireAssertions: true },
  },
});
