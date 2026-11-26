// Журнал AI-функції: один рядок JSON `llm.call` на кожен виклик моделі — модель, затримка, токени, стан, fallback,
// версія промпту, id запиту. БЕЗ тексту звернення, промпту й відповіді моделі: таких полів у схемі просто немає,
// а дозволені поля мають вузький формат (див. src/lib/log.ts). Пише proposeIntakeDraft (src/lib/ai/intake-draft.ts).
// WS11, B. Взято з набору ops-kit WS11 (src/lib/ai/llm-log.ts); isFallback прибрано — у Claude API запасну модель
// видно з поля model відповіді (серверний fallback), без суфіксів ":free". Тест: tests/llm-log.test.ts.
//
// Приклад рядка в Runtime Logs Vercel:
// {"event":"llm.call","ts":"2026-11-26T10:15:00.000Z","requestId":"3f0c…","route":"/clients/new",
//  "model":"claude-sonnet-5-5","fallbackUsed":false,"state":"ok","latencyMs":1830,"inputTokens":612,
//  "outputTokens":144,"promptVersion":"intake-v2"}
import { logEvent, type LogSchema } from "@/lib/log";

/** ok / needs_info / refused — відповідь моделі за схемою; unavailable — відповіді немає (ліміт, таймаут, збій). */
export const LLM_STATES = ["ok", "needs_info", "refused", "unavailable"] as const;
export type LlmState = (typeof LLM_STATES)[number];

export type LlmCall = {
  /** id запиту, щоб зв'язати рядок з іншими подіями цього запиту (напр. crypto.randomUUID()). */
  requestId: string;
  /** маршрут-шаблон, не адреса з параметрами: "/clients/new". */
  route: string;
  /** id моделі, яка відповіла (або перша в ланцюжку, якщо відповіді немає). */
  model: string;
  /** відповіла не перша модель ланцюжка. */
  fallbackUsed: boolean;
  state: LlmState;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  /** вартість у USD, якщо постачальник її повернув (Claude API її не повертає — поле не пишемо). */
  costUsd?: number;
  /** версія промпту: INTAKE_PROMPT_VERSION, напр. "intake-v2". */
  promptVersion: string;
  /** КОД причини (FailureReason: rate_limited, timeout, invalid_output, provider_error), ніколи не текст помилки. */
  errorKind?: string;
};

/** Схема llm.call: єдиний список полів, які взагалі можуть потрапити в журнал. */
export const LLM_CALL_SCHEMA = {
  requestId: "token",
  route: "path",
  model: "token",
  fallbackUsed: "boolean",
  state: LLM_STATES,
  latencyMs: "int",
  inputTokens: "int",
  outputTokens: "int",
  costUsd: "number",
  promptVersion: "token",
  errorKind: "token",
} as const satisfies LogSchema;

/** Пише рядок llm.call: unavailable — рівнем error (видно у фільтрі level:error), решта — info. Повертає рядок. */
export function logLlmCall(call: LlmCall): string {
  return logEvent("llm.call", call, LLM_CALL_SCHEMA, call.state === "unavailable" ? "error" : "info");
}
