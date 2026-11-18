import { z } from "zod";

// Що модель повідомляє про текст звернення — лише факти з тексту, невідоме = null (не .optional(): строга JSON-схема
// вимагає всі властивості в required). Правила PM (тип клієнта, дата в майбутньому, email, «Missing») застосовує код —
// draftFromModelText у intake-draft.ts; значення полів пояснює промпт (prompts/intake.ts).
export const IntakeModelSchema = z.object({
  status: z.enum(["draft", "refused"]),
  client_name: z.string().nullable(),
  birth_date: z.string().nullable(),
  // Рядок, а не enum: helper SDK 1.4 переносить enum лише в description, тож схема мови не обмежує. Правило PM
  // («English» або «Spanish», інша мова — поле порожнє) перевіряє код (draftFromModelText).
  session_language: z.string().nullable(),
  client_email: z.string().nullable(),
  written_by_parent: z.boolean(),
  guardian_name: z.string().nullable(),
  guardian_email: z.string().nullable(),
});
