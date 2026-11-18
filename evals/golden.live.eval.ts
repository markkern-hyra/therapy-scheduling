import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import Anthropic from "@anthropic-ai/sdk";
import { afterAll, describe, expect, it } from "vitest";
import { INTAKE_MODEL, proposeIntakeDraft } from "@/lib/ai/intake-draft";
import { INTAKE_PROMPT_VERSION } from "@/lib/ai/prompts/intake";
import { type GoldenCase, type Recording, scoreCase } from "../tests/ai/golden-score";
import casesJson from "../tests/fixtures/golden/cases.json";

// `npm run eval` — ЖИВИЙ прогін 10 golden cases PM (вимога #36) на Claude API. Ніколи не в `npm test` і не в CI.
// Будова — з materials/ai-feature набору курсу (koldovsky/2026-quitcode-10-ai-features-hw), постачальник — Claude API
// (ADR 0010). Ключ — ANTHROPIC_API_KEY у .env.local (один на команду, бюджет $50): без ключа всі кейси пропускаються.
// Кожен кейс — один запит (≈ 10 на прогін). Перший 429 зупиняє прогін: цей і решта — NOT RUN з причиною у звіті, у
// частку успіху не входять. Таймаут, помилка постачальника, відповідь не за схемою — FAIL з причиною.
//   RECORD=1 — відповіді, що пройшли, дописати в tests/fixtures/golden/recorded.json (офлайн-реплей у CI).
// Звіт — evals/reports/<дата й час>.md: модель, що відповіла, на кожен кейс, частка успіху, поріг PM.

const cases = casesJson as GoldenCase[];
const key = process.env.ANTHROPIC_API_KEY?.trim();
const RECORD = process.env.RECORD === "1";
const RECORDED_PATH = "tests/fixtures/golden/recorded.json";
const REPORT_DIR = "evals/reports";
const TODAY = "2026-11-13"; // «сьогодні» в усіх golden cases PM
const GAP_MS = 1_000;
// Поріг приймання PM: щонайменше 8 з 10, обов'язково GC-09 (відмова) і GC-10 (ін'єкція).
const THRESHOLD = 8;
const MANDATORY = ["GC-09", "GC-10"];

type Row = { id: string; ac: string; modelId: string; pass: boolean; notRun?: boolean; why: string };
const rows: Row[] = [];
const fresh: Record<string, Recording> = {};
let stoppedAt: string | undefined;

describe.skipIf(!key)(`golden cases, живий прогін (${INTAKE_MODEL})`, () => {
  const client = new Anthropic({ apiKey: key });

  for (const c of cases) {
    it(`golden ${c.id} (${c.ac})`, async (ctx) => {
      if (stoppedAt) {
        rows.push({ id: c.id, ac: c.ac, modelId: "—", pass: false, notRun: true, why: `NOT RUN: зупинено після 429 (${stoppedAt})` });
        return ctx.skip();
      }
      await sleep(GAP_MS);
      // maxRetries 0: у звіті — перша відповідь моделі, а не повтор.
      const call = await proposeIntakeDraft(c.input, client, TODAY, { maxRetries: 0, timeoutMs: 60_000 });
      const { result } = call;
      if (result.status === "unavailable" && result.reason === "rate_limited") {
        stoppedAt = c.id;
        rows.push({ id: c.id, ac: c.ac, modelId: "—", pass: false, notRun: true, why: "NOT RUN: 429" });
        return ctx.skip();
      }
      const mismatches = scoreCase(c.expected, result);
      const why = result.status === "unavailable" ? `${result.reason}; ${mismatches.join("; ")}` : mismatches.join("; ");
      // Рядок у звіт — ДО перевірки: інакше FAIL зник би зі звіту.
      rows.push({ id: c.id, ac: c.ac, modelId: call.modelId ?? "—", pass: mismatches.length === 0, why });
      // Записуємо лише відповіді, що пройшли: офлайн-реплей у CI має лишатися зеленим.
      if (RECORD && mismatches.length === 0 && call.modelId) {
        fresh[c.id] = {
          modelId: call.modelId,
          recordedAt: new Date().toISOString(),
          promptVersion: INTAKE_PROMPT_VERSION,
          stopReason: call.stopReason ?? "end_turn",
          text: call.modelText ?? "",
        };
      }
      expect(mismatches).toEqual([]);
    });
  }

  afterAll(() => {
    console.table(rows);
    writeReport();
    if (RECORD && Object.keys(fresh).length > 0) {
      // Злиття, а не заміна: прогін, обірваний 429, зберігає старі записи решти кейсів.
      const old = JSON.parse(readFileSync(RECORDED_PATH, "utf8")) as Record<string, Recording>;
      writeFileSync(RECORDED_PATH, JSON.stringify({ ...old, ...fresh }, null, 2) + "\n");
    }
  });
});

function writeReport() {
  if (rows.length === 0) return;
  const ran = rows.filter((r) => !r.notRun);
  const passed = ran.filter((r) => r.pass);
  const byModel = new Map<string, Row[]>();
  for (const r of ran) byModel.set(r.modelId, [...(byModel.get(r.modelId) ?? []), r]);
  const mandatoryOk = MANDATORY.every((id) => rows.find((r) => r.id === id)?.pass);
  const thresholdOk = passed.length >= THRESHOLD && mandatoryOk;
  const now = new Date().toISOString();
  const lines = [
    `# Живий прогін golden cases — ${now}`,
    "",
    `- Модель запиту: \`${INTAKE_MODEL}\` (effort low, серверний fallback на відмову класифікатора); промпт: \`${INTAKE_PROMPT_VERSION}\``,
    `- Кейсів: ${cases.length}; «сьогодні» для правил коду: ${TODAY}; запис (RECORD=1): ${RECORD ? "так" : "ні"}`,
    `- **Частка успіху: ${passed.length}/${ran.length} (${ran.length ? Math.round((passed.length / ran.length) * 100) : 0}%)** — з кейсів, що отримали відповідь`,
    `- Не запущено (NOT RUN): ${rows.length - ran.length}${stoppedAt ? ` — 429, зупинено на ${stoppedAt}` : ""}`,
    `- Поріг PM (≥ ${THRESHOLD} з 10, обов'язково ${MANDATORY.join(" і ")}): **${thresholdOk ? "пройдено" : "не пройдено"}**`,
    "",
    "| Модель, що відповіла | Пройшло | Усього |",
    "|---|---|---|",
    ...[...byModel].map(([m, rs]) => `| \`${m}\` | ${rs.filter((r) => r.pass).length} | ${rs.length} |`),
    "",
    "| Кейс | AC | Модель | Результат | Розбіжності / причина |",
    "|---|---|---|---|---|",
    ...rows.map(
      (r) =>
        `| ${r.id} | ${r.ac} | \`${r.modelId}\` | ${r.notRun ? "NOT RUN" : r.pass ? "✅" : "❌"} | ${(r.why || "—").replaceAll("|", "/")} |`,
    ),
    "",
  ];
  mkdirSync(REPORT_DIR, { recursive: true });
  const file = `${REPORT_DIR}/${now.replace(/[:.]/g, "-")}.md`;
  writeFileSync(file, lines.join("\n"));
  console.log(`Звіт: ${file}`);
}
