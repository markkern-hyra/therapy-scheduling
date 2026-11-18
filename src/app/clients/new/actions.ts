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
  const { role } = await requireRole();
  const raw = String(form.get("intake_text") ?? "");
  const unchanged = { ...previous, text: raw, tone: "error" as const };
  if (!canCreateCards(role)) return { ...unchanged, message: MESSAGES.CARD_FORBIDDEN };

  const text = intakeText(raw);
  // Порожній чи задовгий текст і явні вказівки помічнику — відмова без моделі (AC-INTAKE-06, 07).
  if (!text || instructsAssistant(text)) return { ...unchanged, message: MESSAGES.INTAKE_REFUSED };

  const { result } = await proposeIntakeDraft(text, assistantClient(), practiceToday(new Date()));
  if (result.status !== "ok" && result.status !== "needs_info") return { ...unchanged, message: intakeMessage(result) };
  return {
    seq: previous.seq + 1,
    text: raw,
    message: intakeMessage(result),
    tone: result.status === "ok" ? "success" : "error",
    values: result.values,
  };
}
