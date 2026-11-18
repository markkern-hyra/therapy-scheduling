import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// `npm run eval` — живий прогін golden cases на Claude API (взято з materials/ai-feature набору курсу). Ніколи не частина
// `npm test` / CI: основний vitest.config.mts бере лише *.test.ts(x), а цей — лише evals/**/*.eval.ts.
export default defineConfig(({ mode }) => ({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["evals/**/*.eval.ts"],
    env: loadEnv(mode, process.cwd(), ""), // .env.local → process.env лише для цього прогону
    fileParallelism: false, // по одному запиту: ключ і бюджет спільні на команду
    testTimeout: 120_000,
    hookTimeout: 30_000,
    expect: { requireAssertions: true },
  },
}));
