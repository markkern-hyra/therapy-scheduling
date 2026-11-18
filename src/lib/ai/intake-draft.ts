import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { MESSAGES } from "@/lib/scheduling/messages";
import { isCalendarDate } from "@/lib/scheduling/time";
import { MAX_INTAKE_LENGTH } from "./intake-form";
import { IntakeModelSchema } from "./intake-schema";
import { INTAKE_INSTRUCTIONS, wrapIntakeText } from "./prompts/intake";

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
  `${Number(birthDate.slice(0, 4)) + 18}${birthDate.slice(4)}` > today;

// Відповідь моделі (сирий текст JSON) → чернетка форми. Чиста функція: той самий код у застосунку, офлайн-реплеї й
// живому eval. Відповідь не за схемою — збій (AC-INTAKE-08), а не «майже чернетка».
export function draftFromModelText(modelText: string, today: string): IntakeResult {
  let json: unknown;
  try {
    json = JSON.parse(modelText);
  } catch {
    return { status: "unavailable", reason: "invalid_output" };
  }
  const parsed = IntakeModelSchema.safeParse(json);
  if (!parsed.success) return { status: "unavailable", reason: "invalid_output" };
  const facts = parsed.data;
  if (facts.status === "refused") return { status: "refused" };

  // Лише справжня дата, не пізніша за сьогодні (AC-INTAKE-05) — правило коду, а не промпту.
  const birth = clean(facts.birth_date);
  const birthDate = isCalendarDate(birth) && birth <= today ? birth : "";
  // Child — пише батько чи мати про свою дитину або клієнту менше 18 (Припущення PM: «або … або»).
  const child = facts.written_by_parent || (birthDate !== "" && isMinor(birthDate, today));
  const values: IntakeValues = {
    kind: child ? "child" : "adult",
    full_name: clean(facts.client_name),
    birth_date: birthDate,
    language: facts.session_language ?? "",
    // Дорослий — власний email; дитина — email опікуна: email клієнта не стає email опікуна (GC-05).
    email: child ? "" : cleanEmail(facts.client_email),
    guardian_name: child ? clean(facts.guardian_name) : "",
    guardian_email: child ? cleanEmail(facts.guardian_email) : "",
  };
  // Обов'язкові поля в порядку форми (Припущення PM). Client type порожнім не буває: правило вище завжди його задає.
  const contact: [string, keyof IntakeValues][] = child
    ? [
        ["Guardian name", "guardian_name"],
        ["Guardian email", "guardian_email"],
      ]
    : [["Email", "email"]];
  const required: [string, keyof IntakeValues][] = [
    ["Name", "full_name"],
    ["Date of birth", "birth_date"],
    ["Session language", "language"],
    ...contact,
  ];
  const missing = required.filter(([, field]) => !values[field]).map(([label]) => label);
  return { status: missing.length > 0 ? "needs_info" : "ok", values, missing };
}

// Текст звернення з форми: порожній чи довший за 2000 символів — null, і моделі його не надсилаємо (AC-INTAKE-06).
export function intakeText(raw: unknown): string | null {
  const text = typeof raw === "string" ? raw.trim() : "";
  return text && text.length <= MAX_INTAKE_LENGTH ? text : null;
}

export type IntakeCall = { result: IntakeResult; modelId?: string; modelText?: string; stopReason?: string };

// Один виклик моделі. Клієнт — параметром (застосунок бере його з anthropic.ts, тести — з підміненим fetch, eval — зі
// своїм ключем), тож тут немає ні process.env, ні server-only. modelId і modelText — для звіту eval і запису реплею.
export async function proposeIntakeDraft(
  text: string,
  client: Anthropic | null,
  today: string,
  { timeoutMs = 25_000, maxRetries = 1 } = {},
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
      // Повтори — лише SDK (429, 5xx, мережа), не більше одного: ключ і бюджет спільні на команду.
      { timeout: timeoutMs, maxRetries },
    );
    // Відмовив увесь ланцюжок моделей — текст не годиться для чернетки (AC-INTAKE-06).
    const call = { modelId: message.model, stopReason: message.stop_reason ?? undefined };
    if (message.stop_reason === "refusal") return { result: { status: "refused" }, ...call };
    const modelText = message.content.find((block) => block.type === "text")?.text ?? "";
    return { result: draftFromModelText(modelText, today), modelText, ...call };
  } catch (error) {
    return { result: { status: "unavailable", reason: failureReason(error) } };
  }
}

function failureReason(error: unknown): FailureReason {
  if (error instanceof Anthropic.RateLimitError) return "rate_limited";
  if (error instanceof Anthropic.APIConnectionTimeoutError) return "timeout";
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
