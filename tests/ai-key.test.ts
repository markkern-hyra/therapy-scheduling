import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// «Перевірка ключа» (взято з koldovsky/2026-quitcode-10-ai-features-hw, materials/ai-feature/tests/ai-key.test.ts,
// адаптовано під Claude API): ключ моделі живе лише на сервері. Статична перевірка файлів — без мережі й без значення
// ключа (його тест не читає).
const root = process.cwd();
const KEY_READER = "src/lib/ai/anthropic.ts"; // єдиний файл у src/, якому дозволено читати ANTHROPIC_API_KEY

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "node_modules" ? [] : walk(p);
    return /\.(ts|tsx|js|jsx|mjs)$/.test(e.name) ? [p] : [];
  });
}

const srcFiles = walk(path.join(root, "src")).map((abs) => ({
  rel: path.relative(root, abs).replaceAll("\\", "/"),
  text: readFileSync(abs, "utf8"),
}));

describe("перевірка ключа: ANTHROPIC_API_KEY лише на сервері", () => {
  it("імпорт обгортки з ключем поза серверним кодом падає (server-only)", async () => {
    // Тому proposeIntakeDraft отримує клієнт параметром, а не імпортує src/lib/ai/anthropic.ts.
    await expect(import("@/lib/ai/anthropic")).rejects.toThrow(/Server Component/);
  });

  it("жодного NEXT_PUBLIC_ для ключа моделі — ні в src/, ні в .env.example", () => {
    const envExample = existsSync(path.join(root, ".env.example")) ? readFileSync(path.join(root, ".env.example"), "utf8") : "";
    const offenders = [...srcFiles, { rel: ".env.example", text: envExample }]
      .filter((f) => /NEXT_PUBLIC_[A-Z0-9_]*(ANTHROPIC|CLAUDE|LLM|AI_|MODEL|API_KEY)/.test(f.text))
      .map((f) => f.rel);
    expect(offenders).toEqual([]);
  });

  it(`ключ читає лише ${KEY_READER}, і цей файл починається з import "server-only"`, () => {
    const readers = srcFiles.filter((f) => /ANTHROPIC_API_KEY/.test(f.text)).map((f) => f.rel);
    expect(readers).toEqual([KEY_READER]);
    const reader = srcFiles.find((f) => f.rel === KEY_READER);
    expect(reader?.text.trimStart().startsWith('import "server-only"')).toBe(true);
  });

  it("клієнт SDK створює лише той самий файл: new Anthropic() без apiKey сам читає ключ із середовища", () => {
    const creators = srcFiles.filter((f) => /new Anthropic\(/.test(f.text)).map((f) => f.rel);
    expect(creators).toEqual([KEY_READER]);
  });

  it('жоден файл із "use client" не імпортує обгортку з ключем чи SDK', () => {
    const clientFiles = srcFiles.filter((f) => /^\s*["']use client["']/.test(f.text));
    const offenders = clientFiles
      .filter((f) => /@\/lib\/ai\/anthropic["']|@anthropic-ai\/sdk/.test(f.text))
      .map((f) => f.rel);
    expect(offenders).toEqual([]);
  });
});
