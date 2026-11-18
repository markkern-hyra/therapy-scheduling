"use server";

import { assistantClient } from "@/lib/ai/anthropic";
import { intakeMessage, intakeText, proposeIntakeDraft } from "@/lib/ai/intake-draft";
import type { IntakeFormState } from "@/lib/ai/intake-form";
import { instructsAssistant } from "@/lib/ai/prompts/intake";
import { requireRole } from "@/lib/auth/require-role";
import { canCreateCards } from "@/lib/scheduling/clients";
import { MESSAGES } from "@/lib/scheduling/messages";
import { practiceToday } from "@/lib/scheduling/time";

// Чернетка картки з тексту звернення (AC-INTAKE-01…09; design.md impl-client-intake-draft, рішення 1). Нічого не пише:
// повертає поля у форму, а картку створює createClientCard, коли людина збереже форму (AC-INTAKE-03). getClaims() і роль
// із profiles (requireRole) — до моделі: терапевт у обхід сторінки моделі не викликає (AC-INTAKE-09). Без чернетки
// (відмова, збій) версія й значення форми ті самі — введене лишається у формі (AC-INTAKE-06, 07, 08).
export async function requestIntakeDraft(previous: IntakeFormState, form: FormData): Promise<IntakeFormState> {
  const { supabase, role } = await requireRole();
  // Значення поля як є: файл замість тексту intakeText відхилить (лише вставлений текст — «Поза межами» PM).
  const value = form.get("intake_text");
  const raw = typeof value === "string" ? value : "";
  const unchanged = { ...previous, text: raw, tone: "error" as const };
  if (!canCreateCards(role)) return { ...unchanged, message: MESSAGES.CARD_FORBIDDEN };

  const text = intakeText(value);
  // Порожній чи задовгий текст і явні вказівки помічнику — відмова без моделі (AC-INTAKE-06, 07).
  if (!text || instructsAssistant(text)) return { ...unchanged, message: MESSAGES.INTAKE_REFUSED };

  const client = assistantClient();
  if (!client) return { ...unchanged, message: MESSAGES.INTAKE_UNAVAILABLE };
  // Ліміт дня (50 на застосунок, design.md рішення 5) — до моделі й лише з ключем; вичерпано чи база не відповіла —
  // помічник недоступний (AC-INTAKE-08). Функція бази ще раз перевіряє роль (AC-INTAKE-09).
  const { data: allowed, error } = await supabase.rpc("take_assistant_request");
  if (error || !allowed) return { ...unchanged, message: MESSAGES.INTAKE_UNAVAILABLE };

  const { result } = await proposeIntakeDraft(text, client, practiceToday(new Date()));
  if (result.status !== "ok" && result.status !== "needs_info") return { ...unchanged, message: intakeMessage(result) };
  return {
    seq: previous.seq + 1,
    text: raw,
    message: intakeMessage(result),
    tone: result.status === "ok" ? "success" : "error",
    values: result.values,
  };
}
