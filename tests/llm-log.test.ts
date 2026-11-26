// Тест журналу AI-функції: рядок llm.call має потрібні поля і НІКОЛИ не містить тексту користувача, промпту,
// відповіді моделі, e-mail, заголовків чи cookie — навіть якщо їх передали в зайвих полях або підсунули в дозволені.
// WS11, B («є тест, який це перевіряє»). Взято з набору ops-kit WS11 (tests/llm-log.test.ts), дані — нашого помічника.
// Запуск: npx vitest run tests/llm-log.test.ts
// Назви тестів без AC ID: це технічна перевірка, а не критерій приймання (інакше ac:coverage покаже ORPHAN).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logLlmCall, type LlmCall } from "@/lib/ai/llm-log";
import { formatEvent, pickAllowed } from "@/lib/log";

// Вигаданий «текст користувача» з персональними даними. Жодна його частина не має опинитися в журналі.
const USER_TEXT = "Hi, I am Client Ten, born on May 14, 1990, anxiety after a car crash, write to client10@example.test";
const SECRET_MARKERS = ["Client Ten", "1990", "anxiety", "client10", "@example.test", "Bearer", "sb-access-token"];

const base: LlmCall = {
  requestId: "3f0c2a9e-1b7d-4c55-9a3e-2f6d8e1c0b4a",
  route: "/clients/new",
  model: "claude-sonnet-5-5",
  fallbackUsed: false,
  state: "ok",
  latencyMs: 1830.4,
  inputTokens: 612,
  outputTokens: 144,
  costUsd: 0,
  promptVersion: "intake-v2",
};

function expectNoUserText(line: string) {
  for (const marker of SECRET_MARKERS) expect(line).not.toContain(marker);
}

describe("llm.call", () => {
  let info: ReturnType<typeof vi.spyOn>;
  let error: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    info = vi.spyOn(console, "info").mockImplementation(() => {});
    error = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("пише один рядок JSON з усіма полями виклику", () => {
    const line = logLlmCall(base);
    expect(info).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith(line);
    expect(line).not.toContain("\n");
    const parsed = JSON.parse(line);
    expect(parsed).toMatchObject({
      event: "llm.call",
      requestId: base.requestId,
      route: "/clients/new",
      model: "claude-sonnet-5-5",
      fallbackUsed: false,
      state: "ok",
      latencyMs: 1830,
      inputTokens: 612,
      outputTokens: 144,
      costUsd: 0,
      promptVersion: "intake-v2",
    });
    expect(new Date(parsed.ts).toISOString()).toBe(parsed.ts);
  });

  it("стан unavailable пише рівнем error з кодом причини", () => {
    const line = logLlmCall({ ...base, state: "unavailable", errorKind: "rate_limited", inputTokens: undefined, outputTokens: undefined });
    expect(error).toHaveBeenCalledWith(line);
    expect(info).not.toHaveBeenCalled();
    const parsed = JSON.parse(line);
    expect(parsed.state).toBe("unavailable");
    expect(parsed.errorKind).toBe("rate_limited");
    expect(parsed).not.toHaveProperty("inputTokens");
  });

  it("зайві поля з текстом користувача, промптом, відповіддю, заголовками й cookie не потрапляють у журнал", () => {
    // Не літерал, а змінна: TypeScript не забороняє зайві поля — саме так вони й просочуються в реальному коді.
    const sneaky = {
      ...base,
      text: USER_TEXT,
      prompt: `Instructions…\n<document>\n${USER_TEXT}\n</document>`,
      response: { summary: USER_TEXT },
      messages: [{ role: "user", content: USER_TEXT }],
      email: "client10@example.test",
      headers: { authorization: "Bearer test-token", cookie: "sb-access-token=test" },
      error: new Error(USER_TEXT),
    };
    const line = logLlmCall(sneaky);
    expectNoUserText(line);
    expect(Object.keys(JSON.parse(line)).sort()).toEqual(
      [
        "costUsd",
        "event",
        "fallbackUsed",
        "inputTokens",
        "latencyMs",
        "model",
        "outputTokens",
        "promptVersion",
        "requestId",
        "route",
        "state",
        "ts",
      ].sort(),
    );
  });

  it("текст користувача, підсунутий у дозволені поля, відкидається за форматом", () => {
    const line = logLlmCall({
      ...base,
      requestId: USER_TEXT,
      route: `/clients/new?note=${encodeURIComponent(USER_TEXT)}`,
      model: USER_TEXT,
      promptVersion: USER_TEXT,
      state: "unavailable",
      // Повідомлення про помилку може містити текст користувача — у журнал іде лише КОД причини.
      errorKind: `provider_error: ${USER_TEXT}`,
    });
    expectNoUserText(line);
    const parsed = JSON.parse(line);
    for (const key of ["requestId", "route", "model", "promptVersion", "errorKind"]) {
      expect(parsed).not.toHaveProperty(key);
    }
  });

  it("невідомий стан і некоректні числа не пишуться", () => {
    const line = logLlmCall({
      ...base,
      state: "done" as LlmCall["state"],
      latencyMs: Number.NaN,
      inputTokens: -5,
      costUsd: Number.POSITIVE_INFINITY,
    });
    const parsed = JSON.parse(line);
    expect(parsed).not.toHaveProperty("state");
    expect(parsed).not.toHaveProperty("latencyMs");
    expect(parsed).not.toHaveProperty("inputTokens");
    expect(parsed).not.toHaveProperty("costUsd");
  });

  it("довгий ідентифікатор обрізається до 120 символів", () => {
    const parsed = JSON.parse(logLlmCall({ ...base, model: `claude-${"m".repeat(300)}` }));
    expect(parsed.model).toHaveLength(120);
  });
});

describe("log.ts", () => {
  it("pickAllowed лишає лише поля зі схеми", () => {
    expect(pickAllowed({ a: "x1", b: USER_TEXT, c: true }, { a: "token", c: "boolean" })).toEqual({ a: "x1", c: true });
  });

  it("formatEvent відмовляється від назви події з довільним текстом", () => {
    expect(() => formatEvent(USER_TEXT, {}, {})).toThrow("log: invalid event name");
  });
});
