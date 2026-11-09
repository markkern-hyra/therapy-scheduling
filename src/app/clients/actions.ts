"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { runAction } from "@/lib/actions";
import { requireRole } from "@/lib/auth/require-role";
import { isStaff } from "@/lib/auth/roles";
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

// Позначка статусу перевірки страхування (AC-INS-02, 03). getClaims() і роль із profiles (requireRole) — до запису; не
// admin і не scheduler — назад на картку без запису (AC-INS-05: форму терапевту не показано, а прямий POST дії нічого не
// змінює). Запис — функцією бази від імені користувача, тож RLS відмовляє й на виклик в обхід дії (design.md, рішення 2).
export async function setInsuranceStatus(form: FormData) {
  const { supabase, role } = await requireRole();
  const clientId = String(form.get("client_id") ?? "");
  const back = `/clients/${encodeURIComponent(clientId)}`;
  if (!isStaff(role)) redirect(back);
  await runAction(
    supabase.rpc("set_insurance_status", { p_client_id: clientId, p_status: String(form.get("status") ?? "") }),
    back,
    "INSURANCE_SAVED",
  );
}
