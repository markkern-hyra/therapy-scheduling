import { describe, expect, it } from "vitest";
import { proposeIntakeDraft } from "@/lib/ai/intake-draft";
import { INTAKE_PROMPT_VERSION } from "@/lib/ai/prompts/intake";
import { claudeMessage, fakeClaude } from "./ai/fake-claude";
import { type GoldenCase, type Recording, scoreCase } from "./ai/golden-score";
import casesJson from "./fixtures/golden/cases.json";
import recordedJson from "./fixtures/golden/recorded.json";

// Офлайн-реплей 10 golden cases PM (вимога #36): без мережі й без ключа, тож працює в CI (`npm test`, job `app`).
// Справжня відповідь моделі з живого прогону (`RECORD=1 npm run eval`) проходить увесь шлях застосунку — запит із межею
// <intake_text>, схема, правила коду, повідомлення — і звіряється з очікуваним PM. Перевіряє КОД навколо моделі, а не
// якість моделі: її міряє `npm run eval` (evals/golden.live.eval.ts). Будова — з materials/ai-feature набору курсу.
const cases = casesJson as GoldenCase[];
const recorded = recordedJson as Record<string, Recording>;
// «Сьогодні» в усіх golden cases PM.
const TODAY = "2026-11-13";

async function expectReplay(c: GoldenCase) {
  const rec = recorded[c.id];
  expect(rec, `немає запису для ${c.id} у recorded.json`).toBeDefined();
  const model = fakeClaude(async () => claudeMessage(rec.text, rec.stopReason));
  const { result } = await proposeIntakeDraft(c.input, model.client, TODAY);
  // Недовірений вхід дійшов до моделі між межами як дані.
  expect(JSON.stringify(model.sent[0].body.messages)).toContain(`<intake_text>\\n${JSON.stringify(c.input).slice(1, -1)}`);
  expect(scoreCase(c.expected, result)).toEqual([]);
}

const forAc = (ac: string) => cases.filter((c) => c.ac === ac);

describe("golden cases PM, офлайн-реплей записів моделі", () => {
  it.each(forAc("AC-INTAKE-01"))("AC-INTAKE-01: golden $id", (c) => expectReplay(c));
  it.each(forAc("AC-INTAKE-02"))("AC-INTAKE-02: golden $id", (c) => expectReplay(c));
  it.each(forAc("AC-INTAKE-04"))("AC-INTAKE-04: golden $id", (c) => expectReplay(c));
  it.each(forAc("AC-INTAKE-05"))("AC-INTAKE-05: golden $id", (c) => expectReplay(c));
  it.each(forAc("AC-INTAKE-06"))("AC-INTAKE-06: golden $id", (c) => expectReplay(c));
  it.each(forAc("AC-INTAKE-07"))("AC-INTAKE-07: golden $id", (c) => expectReplay(c));

  it("кожен з 10 кейсів PM потрапив в одну з груп за AC", () => {
    const grouped = ["01", "02", "04", "05", "06", "07"].flatMap((n) => forAc(`AC-INTAKE-${n}`));
    expect(grouped).toHaveLength(10);
  });

  it("кожен golden case має справжній запис моделі поточної версії промпту", () => {
    expect(cases.map((c) => c.id).filter((id) => !recorded[id])).toEqual([]);
    // Змінили INTAKE_PROMPT_VERSION — перезапишіть записи живим прогоном: `RECORD=1 npm run eval`.
    const stale = Object.entries(recorded).filter(([, r]) => r.promptVersion !== INTAKE_PROMPT_VERSION);
    expect(stale.map(([id]) => id)).toEqual([]);
    // Запис — відповідь моделі Claude з датою, а не заглушка, написана руками.
    expect(Object.values(recorded).every((r) => /^claude-/.test(r.modelId) && !Number.isNaN(Date.parse(r.recordedAt)))).toBe(
      true,
    );
  });
});
