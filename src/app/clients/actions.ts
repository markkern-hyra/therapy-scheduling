"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { type CardErrors, canCreateCards, cardFromForm, cardValues, validateCard } from "@/lib/scheduling/clients";
import { errorCode, type MessageCode } from "@/lib/scheduling/messages";
import { practiceToday } from "@/lib/scheduling/time";

export type CardFormState = { error: MessageCode | null; errors: CardErrors; values: Record<string, string> };

// Створення картки — привілейована дія: getClaims() і роль із profiles (requireRole) — до запису; не admin і не
// scheduler — CARD_FORBIDDEN без запису (AC-CARD-06). Запис — клієнтом користувача, тож RLS і check бази відмовляють і
// на прямий запит в обхід дії. Помилка повертає введене, щоб воно лишилось у формі (AC-CARD-03, 12, 13).
export async function createClientCard(_previous: CardFormState, form: FormData): Promise<CardFormState> {
  const { supabase, role } = await requireRole();
  const values = cardValues(form);
  if (!canCreateCards(role)) return { error: "CARD_FORBIDDEN", errors: {}, values };

  const errors = validateCard(values, practiceToday(new Date()));
  if (Object.keys(errors).length > 0) return { error: null, errors, values };

  const { data, error } = await supabase.from("clients").insert(cardFromForm(form)).select("id").single();
  if (error) return { error: errorCode(error), errors: {}, values };

  revalidatePath("/clients");
  redirect(`/clients/${data.id}`);
}
