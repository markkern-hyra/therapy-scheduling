import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { MESSAGES } from "@/lib/scheduling/messages";
import { isCalendarDate } from "@/lib/scheduling/time";
import { MAX_INTAKE_LENGTH } from "./intake-form";
import { IntakeModelSchema } from "./intake-schema";
import { logLlmCall } from "./llm-log";
import { INTAKE_INSTRUCTIONS, INTAKE_PROMPT_VERSION, wrapIntakeText } from "./prompts/intake";

// Модель помічника (рішення людини: дешевша за Opus, надійніша за Haiku на відмові й ін'єкції; ADR 0010).
export const INTAKE_MODEL = "claude-sonnet-5-5";

// JSON-схема відповіді з тієї самої zod-схеми, якою код потім перевіряє відповідь (helper SDK готує її для API).
const OUTPUT_FORMAT = { type: "json_schema", schema: zodOutputFormat(IntakeModelSchema).schema } as const;

// Поля форми нової картки (імена — як у ClientCardForm і cardValues); порожній рядок — поля в чернетці немає.
export type IntakeValues = Record<
  "kind" | "full_name" | "birth_date" | "language" | "email" | "guardian_name" | "guardian_email",
  string
>;

// Чому помічник недоступний — для тестів і звіту eval; людина бачить один текст AC-INTAKE-08.
export type FailureReason = "no_key" | "quota" | "rate_limited" | "timeout" | "provider_error" | "invalid_output";

// Стани курсу: ok — «Draft ready…», needs_info — «Draft is incomplete…», refused — «This text can't be used…»,
// unavailable — «The assistant is unavailable…» (AC-INTAKE-01, 04, 06, 08).
export type IntakeResult =
  | { status: "ok" | "needs_info"; values: IntakeValues; missing: string[] }
  | { status: "refused" }
  | { status: "unavailable"; reason: FailureReason };

const clean = (value: string | null) => value?.trim() ?? "";
// Email — малими літерами без пробілів; без «@» — поле порожнє (Припущення PM, GC-03, GC-06).
const cleanEmail = (value: string | null) => {
  const email = clean(value).toLowerCase();
  return email.includes("@") ? email : "";
};
// Менше 18 на сьогодні: вісімнадцятий день народження ще не настав (рядкове порівняння РРРР-ММ-ДД; GC-03, GC-05).
const isMinor = (birthDate: string, today: string) =>
  `${String(Number(birthDate.slice(0, 4)) + 18).padStart(4, "0")}${birthDate.slice(4)}` > today;
// Для порівняння з текстом: без різниці в регістрі, пробілах і апострофі (’ чи ').
const squash = (value: string) => value.normalize("NFC").toLowerCase().replaceAll("’", "'").replace(/\s+/g, " ");
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Значення є в тексті цілими словами чи адресою: «Ann Lee» — не частина «Joann Lee», «ann@…» — не частина «joann@…».
const inText = (value: string, text: string) =>
  value !== "" &&
  new RegExp(`(?<![\\p{L}\\p{N}._%+-])${escapeRegExp(squash(value))}(?![\\p{L}\\p{N}_%+-]|\\.[\\p{L}\\p{N}])`, "u").test(text);
// Дата народження з тексту: є і рік, і день місяця («May 14, 1990», «the 1st of November, 2008», «2016-09-03»).
const dateInText = (date: string, text: string) => {
  const [year, , day] = date.split("-");
  return new RegExp(`(?<!\\d)${year}(?!\\d)`).test(text) && new RegExp(`(?<!\\d)0?${Number(day)}(?!\\d)`).test(text);
};
// Мова сеансів — лише English чи Spanish і лише названа в тексті (Припущення PM); інша — поле порожнє.
const LANGUAGE_WORDS: Record<string, RegExp> = {
  English: /\b(?:english|ingl[eé]s)\b/,
  Spanish: /\b(?:spanish|espa[nñ]ol|castellano)\b/,
};

type Facts = z.infer<typeof IntakeModelSchema>;

// Сирий текст відповіді моделі → факти за схемою; не JSON чи не за схемою — null.
function parseFacts(modelText: string): Facts | null {
  try {
    const parsed = IntakeModelSchema.safeParse(JSON.parse(modelText));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

// Факти моделі → поля форми за правилами PM. text — текст звернення (squash): значення, якого в ньому немає (вигадане
// ім'я, email, дата чи мова), — порожнє поле, і воно потрапляє в «Missing».
function draftValues(facts: Facts, today: string, text: string): IntakeValues {
  // Лише справжня дата з тексту, не пізніша за сьогодні (AC-INTAKE-05) — правило коду, а не промпту.
  const birth = clean(facts.birth_date);
  const birthDate = isCalendarDate(birth) && birth <= today && dateInText(birth, text) ? birth : "";
  const lang = facts.session_language ?? "";
  const language = Object.hasOwn(LANGUAGE_WORDS, lang) && LANGUAGE_WORDS[lang].test(text) ? lang : "";
  // Child — пише батько чи мати про свою дитину або клієнту менше 18 (Припущення PM: «або … або»).
  const child = facts.written_by_parent || (birthDate !== "" && isMinor(birthDate, today));
  const fromText = (value: string) => (inText(value, text) ? value : "");
  // Дорослий — власний email; дитина — ім'я та email опікуна: email клієнта не стає email опікуна (GC-05).
  const contact = child
    ? { email: "", guardian_name: fromText(clean(facts.guardian_name)), guardian_email: fromText(cleanEmail(facts.guardian_email)) }
    : { email: fromText(cleanEmail(facts.client_email)), guardian_name: "", guardian_email: "" };
  return { kind: child ? "child" : "adult", full_name: fromText(clean(facts.client_name)), birth_date: birthDate, language, ...contact };
}

// Обов'язкові поля в порядку форми (Припущення PM). Client type порожнім не буває: draftValues завжди його задає.
const REQUIRED: [string, keyof IntakeValues][] = [
  ["Name", "full_name"],
  ["Date of birth", "birth_date"],
  ["Session language", "language"],
];
const CONTACT: Record<string, [string, keyof IntakeValues][]> = {
  adult: [["Email", "email"]],
  child: [
    ["Guardian name", "guardian_name"],
    ["Guardian email", "guardian_email"],
  ],
};

// Відповідь моделі (сирий текст JSON) → чернетка форми. Чиста функція: той самий код у застосунку, офлайн-реплеї й
// живому eval. Відповідь не за схемою — збій (AC-INTAKE-08), а не «майже чернетка». input — текст звернення: імена,
// email, дату й мову беремо лише ті, що в ньому є (Припущення PM: «як у тексті; застосунок імен не вигадує»).
export function draftFromModelText(modelText: string, today: string, input: string): IntakeResult {
  const facts = parseFacts(modelText);
  if (!facts) return { status: "unavailable", reason: "invalid_output" };
  if (facts.status === "refused") return { status: "refused" };
  const values = draftValues(facts, today, squash(input));
  const missing = [...REQUIRED, ...CONTACT[values.kind]].filter(([, field]) => !values[field]).map(([label]) => label);
  return { status: missing.length > 0 ? "needs_info" : "ok", values, missing };
}

// Текст звернення з форми: порожній чи довший за 2000 символів — null, і моделі його не надсилаємо (AC-INTAKE-06).
export function intakeText(raw: unknown): string | null {
  // Лише рядок (файл — не текст звернення). Форма надсилає кінець рядка як CRLF, а поле браузера рахує його одним
  // символом; межу рахуємо до обрізання пробілів, як maxLength поля.
  const text = typeof raw === "string" ? raw.replace(/\r\n?/g, "\n") : "";
  return text.length <= MAX_INTAKE_LENGTH && text.trim() ? text.trim() : null;
}

export type IntakeCall = {
  result: IntakeResult;
  modelId?: string;
  modelText?: string;
  stopReason?: string;
  usage?: { input_tokens: number; output_tokens: number };
};
type CallOptions = { timeoutMs?: number; maxRetries?: number; deadlineMs?: number };

// Один виклик моделі. Клієнт — параметром (застосунок бере його з anthropic.ts, тести — з підміненим fetch, eval — зі
// своїм ключем), тож тут немає ні process.env, ні server-only. modelId і modelText — для звіту eval і запису реплею.
// log (WS11) — рядок llm.call у журнал Vercel після кожного виклику моделі; без log (golden-тести, eval) журналу немає.
export async function proposeIntakeDraft(
  text: string,
  client: Anthropic | null,
  today: string,
  { log, ...options }: CallOptions & { log?: { requestId: string; route: string } } = {},
): Promise<IntakeCall> {
  const started = performance.now();
  const call = await callModel(text, client, today, options);
  if (log && client) {
    const { result } = call;
    logLlmCall({
      ...log,
      model: call.modelId ?? INTAKE_MODEL,
      fallbackUsed: call.modelId !== undefined && call.modelId !== INTAKE_MODEL,
      state: result.status,
      latencyMs: performance.now() - started,
      // shortcut: при серверному fallback usage — лише спроба, що відповіла (відмовлена — в usage.iterations); рахувати
      // всі спроби — коли вартість fallback стане важливою.
      inputTokens: call.usage?.input_tokens,
      outputTokens: call.usage?.output_tokens,
      promptVersion: INTAKE_PROMPT_VERSION,
      errorKind: result.status === "unavailable" ? result.reason : undefined,
    });
  }
  return call;
}

async function callModel(
  text: string,
  client: Anthropic | null,
  today: string,
  { timeoutMs = 25_000, maxRetries = 1, deadlineMs = 45_000 }: CallOptions,
): Promise<IntakeCall> {
  if (!client) return { result: { status: "unavailable", reason: "no_key" } };
  try {
    const message = await client.beta.messages.create(
      {
        model: INTAKE_MODEL,
        max_tokens: 16_000,
        // Відмова класифікатора безпеки — повтор тим самим запитом на запасній моделі (серверний fallback).
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: INTAKE_INSTRUCTIONS,
        messages: [{ role: "user", content: wrapIntakeText(text) }],
        output_config: { effort: "low", format: OUTPUT_FORMAT },
      },
      // Повтори — лише SDK (429, 5xx, мережа), не більше одного: ключ і бюджет спільні на команду. Дедлайн — на весь
      // виклик разом з очікуванням Retry-After: до maxDuration сторінки, щоб людина побачила AC-INTAKE-08.
      { timeout: timeoutMs, maxRetries, signal: AbortSignal.timeout(deadlineMs) },
    );
    // Відмовив увесь ланцюжок моделей — текст не годиться для чернетки (AC-INTAKE-06).
    const call = { modelId: message.model, stopReason: message.stop_reason ?? undefined, usage: message.usage };
    if (message.stop_reason === "refusal") return { result: { status: "refused" }, ...call };
    const modelText = message.content.find((block) => block.type === "text")?.text ?? "";
    return { result: draftFromModelText(modelText, today, text), modelText, ...call };
  } catch (error) {
    return { result: { status: "unavailable", reason: failureReason(error) } };
  }
}

function failureReason(error: unknown): FailureReason {
  if (error instanceof Anthropic.RateLimitError) return "rate_limited";
  if (error instanceof Anthropic.APIConnectionTimeoutError || error instanceof Anthropic.APIUserAbortError) return "timeout";
  return "provider_error";
}

// Повідомлення над формою — дослівно з AC.
export function intakeMessage(result: IntakeResult): string {
  switch (result.status) {
    case "ok":
      return MESSAGES.INTAKE_READY;
    case "needs_info":
      return `Draft is incomplete. Missing: ${result.missing.join(", ")}. Fill them in manually.`;
    case "refused":
      return MESSAGES.INTAKE_REFUSED;
    case "unavailable":
      return MESSAGES.INTAKE_UNAVAILABLE;
  }
}
