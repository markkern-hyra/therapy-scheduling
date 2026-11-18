import { intakeMessage, type IntakeResult, type IntakeValues } from "@/lib/ai/intake-draft";

// Golden case PM (tests/fixtures/golden/cases.json): вхід дослівно, очікуване — точні значення полів з таблиці PM його ж
// назвами полів, повідомлення дослівно; absent — чого у формі бути не має (GC-04: дані вчительки).
export type GoldenCase = {
  id: string;
  ac: string;
  input: string;
  expected: { draft: boolean; fields?: Record<string, string>; message: string; absent?: string[] };
};

// Запис справжньої відповіді моделі для офлайн-реплею (`RECORD=1 npm run eval`).
export type Recording = { modelId: string; recordedAt: string; promptVersion: string; stopReason: string; text: string };

// Назва поля у таблиці PM → поле форми.
const FIELDS: Record<string, keyof IntakeValues> = {
  "Client type": "kind",
  Name: "full_name",
  "Date of birth": "birth_date",
  "Session language": "language",
  Email: "email",
  "Guardian name": "guardian_name",
  "Guardian email": "guardian_email",
};
const KIND_LABEL: Record<string, string> = { adult: "Adult", child: "Child" };

// Розбіжності результату з очікуваним PM; порожній список — кейс пройшов. Той самий оцінювач у реплеї й у живому eval.
export function scoreCase(expected: GoldenCase["expected"], result: IntakeResult): string[] {
  const mismatches: string[] = [];
  const message = intakeMessage(result);
  if (message !== expected.message) mismatches.push(`повідомлення: «${message}», очікувано «${expected.message}»`);
  const draft = result.status === "ok" || result.status === "needs_info";
  if (draft !== expected.draft) mismatches.push(`чернетка: ${draft ? "є" : "немає"}, очікувано ${expected.draft ? "є" : "немає"}`);
  if (!draft) return mismatches;
  const values = result.values;
  for (const [label, want] of Object.entries(expected.fields ?? {})) {
    const got = label === "Client type" ? (KIND_LABEL[values.kind] ?? values.kind) : values[FIELDS[label]];
    if (got !== want) mismatches.push(`${label}: «${got}», очікувано «${want}»`);
  }
  // Поля іншого типу клієнта порожні (Припущення PM: для дорослого — email клієнта, для дитини — email опікуна).
  const otherType = values.kind === "child" ? ["email"] : ["guardian_name", "guardian_email"];
  for (const field of otherType as (keyof IntakeValues)[]) {
    if (values[field]) mismatches.push(`${field}: «${values[field]}» у картці типу ${KIND_LABEL[values.kind]}, очікувано порожнє`);
  }
  for (const text of expected.absent ?? []) {
    const field = Object.entries(values).find(([, value]) => value.toLowerCase().includes(text.toLowerCase()));
    if (field) mismatches.push(`у полі ${field[0]} — «${text}», якого там бути не має`);
  }
  return mismatches;
}
